import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import type { Obra } from '@/data/mockData';

interface MutationResult {
  success: boolean;
  error?: string;
}

interface AddObraResult extends MutationResult {
  id: string | null;
}

interface ObrasContextType {
  obras: Obra[];
  loading: boolean;
  addObra: (obra: Omit<Obra, 'id'> & { id?: string }) => Promise<AddObraResult>;
  updateObra: (id: string, data: Partial<Obra>) => Promise<MutationResult>;
  deleteObra: (id: string) => Promise<MutationResult>;
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

function getMissingColumn(error: any) {
  const message = error?.message || '';
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

async function insertWithColumnFallback(payload: Record<string, any>) {
  const nextPayload = { ...payload };

  while (Object.keys(nextPayload).length > 0) {
    const { data, error } = await supabase
      .from('obras')
      .insert(nextPayload as any)
      .select()
      .maybeSingle();

    if (!error) {
      return { data, error: null };
    }

    const missingColumn = getMissingColumn(error);
    if (!missingColumn || !(missingColumn in nextPayload)) {
      return { data: null, error };
    }

    delete nextPayload[missingColumn];
  }

  return {
    data: null,
    error: { message: 'Não foi possível cadastrar a obra com o schema atual do backend.' },
  };
}

async function updateWithColumnFallback(id: string, payload: Record<string, any>) {
  const nextPayload = { ...payload };

  while (Object.keys(nextPayload).length > 0) {
    const { error } = await supabase.from('obras').update(nextPayload as any).eq('id', id);

    if (!error) {
      return { error: null };
    }

    const missingColumn = getMissingColumn(error);
    if (!missingColumn || !(missingColumn in nextPayload)) {
      return { error };
    }

    delete nextPayload[missingColumn];
  }

  return { error: null };
}

export function ObrasProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchObras = useCallback(async () => {
    if (!user || !company) {
      setObras([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setObras(data.map(dbToObra));
    }

    setLoading(false);
  }, [user, company]);

  useEffect(() => {
    fetchObras();
  }, [fetchObras]);

  const addObra = useCallback(async (obra: Omit<Obra, 'id'> & { id?: string }): Promise<AddObraResult> => {
    if (!company) {
      return { id: null, success: false, error: 'Empresa não carregada.' };
    }

    const insertData: Record<string, any> = {
      nome: obra.nome,
      codigo: obra.codigo,
      cliente: obra.cliente || null,
      endereco: obra.endereco || null,
      status: obra.status as any,
      data_inicio: obra.dataInicio || null,
      data_previsao_termino: obra.dataPrevisaoTermino || null,
      responsavel: obra.responsavel || null,
      percentual_andamento: obra.percentualAndamento || 0,
      descricao: obra.descricao || null,
      company_id: company.id,
    };

    const { data, error } = await insertWithColumnFallback(insertData);

    if (error || !data) {
      return { id: null, success: false, error: error?.message || 'Não foi possível cadastrar a obra.' };
    }

    if (user) {
      await supabase.from('obra_memberships').insert({
        obra_id: data.id,
        user_id: user.id,
        role: 'gestor' as any,
      });
    }

    await fetchObras();
    return { id: data.id, success: true };
  }, [user, company, fetchObras]);

  const updateObra = useCallback(async (id: string, data: Partial<Obra>): Promise<MutationResult> => {
    const update: Record<string, any> = {};
    if (data.nome !== undefined) update.nome = data.nome;
    if (data.codigo !== undefined) update.codigo = data.codigo;
    if (data.cliente !== undefined) update.cliente = data.cliente || null;
    if (data.endereco !== undefined) update.endereco = data.endereco || null;
    if (data.status !== undefined) update.status = data.status;
    if (data.dataInicio !== undefined) update.data_inicio = data.dataInicio || null;
    if (data.dataPrevisaoTermino !== undefined) update.data_previsao_termino = data.dataPrevisaoTermino || null;
    if (data.responsavel !== undefined) update.responsavel = data.responsavel || null;
    if (data.percentualAndamento !== undefined) update.percentual_andamento = data.percentualAndamento;
    if (data.descricao !== undefined) update.descricao = data.descricao || null;

    const { error } = await updateWithColumnFallback(id, update);

    if (error) {
      return { success: false, error: error.message || 'Não foi possível atualizar a obra.' };
    }

    await fetchObras();
    return { success: true };
  }, [fetchObras]);

  const deleteObra = useCallback(async (id: string): Promise<MutationResult> => {
    const { error } = await supabase.from('obras').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message || 'Não foi possível excluir a obra.' };
    }

    await fetchObras();
    return { success: true };
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
      obras,
      loading,
      addObra,
      updateObra,
      deleteObra,
      getObra,
      generateCodigo,
      getResponsaveis,
      refreshObras: fetchObras,
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
