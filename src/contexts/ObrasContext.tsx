import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import type { Obra } from '@/data/mockData';

interface ObrasContextType {
  obras: Obra[];
  loading: boolean;
  addObra: (obra: Omit<Obra, 'id'> & { id?: string }) => Promise<string | null>;
  updateObra: (id: string, data: Partial<Obra>) => Promise<void>;
  deleteObra: (id: string) => Promise<void>;
  getObra: (id: string) => Obra | undefined;
  generateCodigo: () => string;
  getResponsaveis: () => string[];
  refreshObras: () => Promise<void>;
}

const ObrasContext = createContext<ObrasContextType | null>(null);

function dbToObra(row: any): Obra {
  return {
    id: row.id,
    nome: row.nome || '',
    codigo: row.codigo || '',
    cliente: row.cliente || '',
    endereco: row.endereco || '',
    status: row.status || 'planejamento',
    dataInicio: row.data_inicio || '',
    dataPrevisaoTermino: row.data_previsao_termino || '',
    responsavel: row.responsavel || '',
    percentualAndamento: row.percentual_andamento || 0,
    descricao: row.descricao || '',
  };
}

export function ObrasProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchObras = useCallback(async () => {
    if (!user) { setObras([]); setLoading(false); return; }
    const { data, error } = await supabase.from('obras').select('*');
    if (!error && data) {
      setObras(data.map(dbToObra));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchObras();
  }, [fetchObras]);

  const addObra = useCallback(async (obra: Omit<Obra, 'id'> & { id?: string }) => {
    const insertData: any = {
      nome: obra.nome,
      codigo: obra.codigo,
      cliente: obra.cliente || null,
      endereco: obra.endereco || null,
      status: obra.status as any,
      data_inicio: obra.dataInicio || null,
      data_previsao_termino: obra.dataPrevisaoTermino || null,
      responsavel: obra.responsavel || null,
      percentual_andamento: obra.percentualAndamento || 0,
      descricao: obra.descricao || '',
    };
    if (company) insertData.company_id = company.id;

    const { data, error } = await supabase.from('obras').insert(insertData).select().single();

    if (error || !data) return null;

    // Auto-add self as gestor
    if (user) {
      await supabase.from('obra_memberships').insert({
        obra_id: data.id,
        user_id: user.id,
        role: 'gestor' as any,
      });
    }

    await fetchObras();
    return data.id;
  }, [user, fetchObras]);

  const updateObra = useCallback(async (id: string, data: Partial<Obra>) => {
    const update: any = {};
    if (data.nome !== undefined) update.nome = data.nome;
    if (data.codigo !== undefined) update.codigo = data.codigo;
    if (data.cliente !== undefined) update.cliente = data.cliente;
    if (data.endereco !== undefined) update.endereco = data.endereco;
    if (data.status !== undefined) update.status = data.status;
    if (data.dataInicio !== undefined) update.data_inicio = data.dataInicio || null;
    if (data.dataPrevisaoTermino !== undefined) update.data_previsao_termino = data.dataPrevisaoTermino || null;
    if (data.responsavel !== undefined) update.responsavel = data.responsavel;
    if (data.percentualAndamento !== undefined) update.percentual_andamento = data.percentualAndamento;
    if (data.descricao !== undefined) update.descricao = data.descricao;

    await supabase.from('obras').update(update).eq('id', id);
    await fetchObras();
  }, [fetchObras]);

  const deleteObra = useCallback(async (id: string) => {
    await supabase.from('obras').delete().eq('id', id);
    await fetchObras();
  }, [fetchObras]);

  const getObra = useCallback((id: string) => {
    return obras.find(o => o.id === id);
  }, [obras]);

  const generateCodigo = useCallback(() => {
    const year = new Date().getFullYear();
    const existing = obras
      .map(o => {
        const match = o.codigo.match(/^OBR-(\d{4})-(\d{3})$/);
        if (match && parseInt(match[1]) === year) return parseInt(match[2]);
        return 0;
      })
      .filter(n => n > 0);
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `OBR-${year}-${String(next).padStart(3, '0')}`;
  }, [obras]);

  const getResponsaveis = useCallback(() => {
    const set = new Set(obras.map(o => o.responsavel).filter(Boolean));
    return Array.from(set);
  }, [obras]);

  return (
    <ObrasContext.Provider value={{
      obras, loading, addObra, updateObra, deleteObra, getObra,
      generateCodigo, getResponsaveis, refreshObras: fetchObras,
    }}>
      {children}
    </ObrasContext.Provider>
  );
}

export function useObras() {
  const ctx = useContext(ObrasContext);
  if (!ctx) throw new Error('useObras must be used within ObrasProvider');
  return ctx;
}
