import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import { enviarNotificacaoDedup } from '@/lib/notificationDedup';
import type { Material, MovimentacaoEstoque } from '@/data/mockData';

interface EstoqueContextType {
  materiais: Material[];
  movimentacoes: MovimentacaoEstoque[];
  loading: boolean;
  getMateriaisByObra: (obraId: string) => Material[];
  getMovimentacoesByObra: (obraId: string) => MovimentacaoEstoque[];
  registrarMovimentacao: (mov: Omit<MovimentacaoEstoque, 'id'> & { id?: string }) => Promise<void>;
  addMaterial: (material: Omit<Material, 'id'> & { id?: string }) => Promise<void>;
  updateMaterial: (id: string, data: Partial<Material>) => Promise<void>;
  refreshEstoque: () => Promise<void>;
}

const EstoqueContext = createContext<EstoqueContextType | null>(null);

function dbToMaterial(row: any): Material {
  return {
    id: row.id,
    obraId: row.obra_id,
    nome: row.nome,
    categoria: row.categoria || '',
    unidade: row.unidade || 'un',
    estoqueAtual: Number(row.estoque_atual) || 0,
    estoqueMinimo: Number(row.estoque_minimo) || 0,
    localizacao: row.localizacao || '',
    observacoes: row.observacoes || '',
  };
}

function dbToMovimentacao(row: any): MovimentacaoEstoque {
  return {
    id: row.id,
    obraId: row.obra_id,
    materialId: row.material_id,
    materialNome: row.material_nome || '',
    tipo: row.tipo,
    data: row.data,
    quantidade: Number(row.quantidade) || 0,
    origemDestino: row.origem_destino || '',
    responsavel: row.responsavel || '',
    observacoes: row.observacoes || '',
  };
}

export function EstoqueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  const fetchEstoque = useCallback(async () => {
    if (!userId) { setMateriais([]); setMovimentacoes([]); setLoading(false); return; }

    const [matRes, movRes] = await Promise.all([
      supabase.from('materiais').select('*'),
      supabase.from('movimentacoes').select('*').order('created_at', { ascending: false }),
    ]);

    if (matRes.data) setMateriais(matRes.data.map(dbToMaterial));
    if (movRes.data) setMovimentacoes(movRes.data.map(dbToMovimentacao));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchEstoque();
  }, [fetchEstoque]);

  const getMateriaisByObra = useCallback((obraId: string) => {
    return materiais.filter(m => m.obraId === obraId);
  }, [materiais]);

  const getMovimentacoesByObra = useCallback((obraId: string) => {
    return movimentacoes.filter(m => m.obraId === obraId);
  }, [movimentacoes]);

  const registrarMovimentacao = useCallback(async (mov: Omit<MovimentacaoEstoque, 'id'> & { id?: string }) => {
    await (supabase.from('movimentacoes') as any).insert({
      obra_id: mov.obraId,
      material_id: mov.materialId,
      material_nome: mov.materialNome,
      tipo: mov.tipo as any,
      data: mov.data,
      quantidade: mov.quantidade,
      origem_destino: mov.origemDestino || null,
      responsavel: mov.responsavel || null,
      observacoes: mov.observacoes || null,
    });

    const materialDb = materiais.find(m => m.id === mov.materialId);
    if (materialDb && company?.id) {
      let novoEstoque = materialDb.estoqueAtual;
      if (mov.tipo === 'entrada' || mov.tipo === 'devolucao') novoEstoque += mov.quantidade;
      else if (mov.tipo === 'saida' || mov.tipo === 'perda') novoEstoque -= mov.quantidade;

      if (novoEstoque <= materialDb.estoqueMinimo && (mov.tipo === 'saida' || mov.tipo === 'perda')) {
        enviarNotificacaoDedup({
          company_id: company.id,
          obra_id: mov.obraId,
          tipo: 'estoque_critico',
          titulo: 'Estoque Crítico Alcançado',
          mensagem: `O material ${materialDb.nome} agora está em nível crítico (${novoEstoque} ${materialDb.unidade}).`,
          prioridade: 'importante',
          acao_url: `/execucao?tab=estoque`,
          acao_label: 'Ver Estoque',
          metadataKey: 'material_id',
          metadataValue: materialDb.id,
        }, 3); // dedup de 3 dias
      }
    }

    // Refetch to get updated estoque_atual from trigger
    await fetchEstoque();
  }, [fetchEstoque, materiais, company?.id]);

  const addMaterial = useCallback(async (material: Omit<Material, 'id'> & { id?: string }) => {
    await (supabase.from('materiais') as any).insert({
      obra_id: material.obraId,
      nome: material.nome,
      categoria: material.categoria || null,
      unidade: material.unidade,
      estoque_atual: material.estoqueAtual || 0,
      estoque_minimo: material.estoqueMinimo || 0,
      localizacao: material.localizacao || null,
      observacoes: material.observacoes || null,
    });
    await fetchEstoque();
  }, [fetchEstoque]);

  const updateMaterial = useCallback(async (id: string, data: Partial<Material>) => {
    const update: any = {};
    if (data.nome !== undefined) update.nome = data.nome;
    if (data.categoria !== undefined) update.categoria = data.categoria;
    if (data.unidade !== undefined) update.unidade = data.unidade;
    if (data.estoqueAtual !== undefined) update.estoque_atual = data.estoqueAtual;
    if (data.estoqueMinimo !== undefined) update.estoque_minimo = data.estoqueMinimo;
    if (data.localizacao !== undefined) update.localizacao = data.localizacao;
    if (data.observacoes !== undefined) update.observacoes = data.observacoes;

    await supabase.from('materiais').update(update).eq('id', id);
    await fetchEstoque();
  }, [fetchEstoque]);

  return (
    <EstoqueContext.Provider value={{
      materiais, movimentacoes, loading,
      getMateriaisByObra, getMovimentacoesByObra,
      registrarMovimentacao, addMaterial, updateMaterial,
      refreshEstoque: fetchEstoque,
    }}>
      {children}
    </EstoqueContext.Provider>
  );
}

export function useEstoque() {
  const ctx = useContext(EstoqueContext);
  if (!ctx) throw new Error('useEstoque must be used within EstoqueProvider');
  return ctx;
}
