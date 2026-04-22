import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { normalizeText } from '@/lib/normalizeText';
import { useCompany } from '@/contexts/CompanyContext';

export type ModoSugestao = 'ultimo' | 'menor' | 'media' | 'fornecedor';

export interface RegistroHistorico {
  id: string;
  descricao_insumo: string;
  descricao_normalizada: string;
  unidade: string | null;
  fornecedor_nome: string | null;
  preco_unitario: number;
  origem: string;
  data_referencia: string;
  obra_id: string | null;
}

export interface SugestaoPreco {
  preco: number;
  fornecedor: string | null;
  data: string;
  ocorrencias: number;
}

export interface PropsRegistroPreco {
  obra_id: string;
  nome_material: string;
  unidade?: string | null;
  fornecedor_nome?: string | null;
  preco_unitario: number;
  origem: string;
  data_referencia?: string;
}

export function usePrecoHistorico() {
  const { company } = useCompany();
  const [historico, setHistorico] = useState<Record<string, RegistroHistorico[]>>({});
  const [loading, setLoading] = useState(false);

  /** Carrega histórico para uma lista de descrições */
  const carregarHistorico = useCallback(async (descricoes: string[]) => {
    if (!company?.id || descricoes.length === 0) return;
    setLoading(true);
    try {
      const normalizadas = descricoes.map(normalizeText);
      const { data } = await (supabase as any)
        .from('preco_historico')
        .select('*')
        .eq('company_id', company.id)
        .in('descricao_normalizada', normalizadas)
        .order('data_referencia', { ascending: false });

      if (data) {
        const agrupado: Record<string, RegistroHistorico[]> = {};
        for (const row of data as RegistroHistorico[]) {
          if (!agrupado[row.descricao_normalizada]) {
            agrupado[row.descricao_normalizada] = [];
          }
          agrupado[row.descricao_normalizada].push(row);
        }
        setHistorico(agrupado);
      }
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  /** Calcula sugestão de preço conforme modo */
  const getSugestao = useCallback((
    descricao: string,
    modo: ModoSugestao,
    fornecedorFiltro?: string
  ): SugestaoPreco | null => {
    const key = normalizeText(descricao);
    const registros = historico[key];
    if (!registros || registros.length === 0) return null;

    switch (modo) {
      case 'ultimo': {
        const ultimo = registros[0]; // já ordenado por data desc
        return {
          preco: ultimo.preco_unitario,
          fornecedor: ultimo.fornecedor_nome,
          data: ultimo.data_referencia,
          ocorrencias: registros.length,
        };
      }

      case 'menor': {
        const menor = registros.reduce((m, r) =>
          r.preco_unitario < m.preco_unitario ? r : m
        );
        return {
          preco: menor.preco_unitario,
          fornecedor: menor.fornecedor_nome,
          data: menor.data_referencia,
          ocorrencias: registros.length,
        };
      }

      case 'media': {
        const avg = registros.reduce((s, r) => s + r.preco_unitario, 0) / registros.length;
        return {
          preco: Math.round(avg * 100) / 100,
          fornecedor: null,
          data: registros[0].data_referencia,
          ocorrencias: registros.length,
        };
      }

      case 'fornecedor': {
        if (!fornecedorFiltro) return null;
        const doForn = registros.filter(
          r => r.fornecedor_nome?.toLowerCase() === fornecedorFiltro.toLowerCase()
        );
        if (doForn.length === 0) return null;
        return {
          preco: doForn[0].preco_unitario,
          fornecedor: doForn[0].fornecedor_nome,
          data: doForn[0].data_referencia,
          ocorrencias: doForn.length,
        };
      }

      default:
        return null;
    }
  }, [historico]);

  /** Lista fornecedores distintos no histórico carregado */
  const getFornecedoresHistorico = useCallback((): string[] => {
    const todos = Object.values(historico).flat();
    return [...new Set(
      todos
        .map(r => r.fornecedor_nome)
        .filter((f): f is string => !!f)
    )].sort();
  }, [historico]);

  /** Função central unificada para registrar múltiplos preços de uma vez */
  const registrarPrecoEmLote = useCallback(async (registros: PropsRegistroPreco[]) => {
    if (!company?.id || registros.length === 0) return;
    try {
      const insertData = registros.map(r => ({
        company_id: company.id,
        obra_id: r.obra_id,
        descricao_insumo: r.nome_material.trim(),
        descricao_normalizada: normalizeText(r.nome_material.trim()),
        unidade: r.unidade || 'un',
        fornecedor_nome: r.fornecedor_nome?.trim() || null,
        preco_unitario: r.preco_unitario,
        origem: r.origem,
        data_referencia: r.data_referencia || new Date().toISOString().split('T')[0],
      }));
      await (supabase as any).from('preco_historico').insert(insertData);
    } catch (e) {
      console.warn('Falha silenciosa ao registrar preços no histórico:', e);
    }
  }, [company?.id]);

  return {
    historico,
    loading,
    carregarHistorico,
    getSugestao,
    getFornecedoresHistorico,
    registrarPrecoEmLote,
  };
}
