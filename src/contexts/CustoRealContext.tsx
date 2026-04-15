import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from './AuthContext';

/** Tipos padronizados de custo (mesmos valores usados em pagamentos) */
export const CATEGORIAS_CUSTO = [
  { value: 'Mão de Obra', label: 'Mão de Obra' },
  { value: 'Material',   label: 'Material'     },
  { value: 'Serviço',    label: 'Serviço'      },
  { value: 'Aluguel',    label: 'Aluguel'      },
  { value: 'Outro',      label: 'Outro'        },
] as const;

export type CategoriaCusto = typeof CATEGORIAS_CUSTO[number]['value'];

export interface CustoRealItem {
  id: string;
  obraId: string;
  companyId: string;
  /** Tipo padronizado: Mão de Obra | Material | Serviço | Aluguel | Outro */
  categoria: string;
  /** Nome da etapa do orçamento à qual o custo está vinculado */
  etapaNome: string;
  descricao: string;
  fornecedor: string;
  valor: number;
  data: string;
  observacoes: string;
}

interface CustoRealContextType {
  itens: CustoRealItem[];
  loading: boolean;
  getItensByObra: (obraId: string) => CustoRealItem[];
  getItensByCategoria: (categoriaId: string) => CustoRealItem[];
  saveItem: (item: CustoRealItem) => Promise<void>;
  saveItems: (items: CustoRealItem[]) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  deleteItemsByCategoria: (categoriaId: string, keepIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const CustoRealContext = createContext<CustoRealContextType | null>(null);

function dbToItem(row: any): CustoRealItem {
  return {
    id: row.id,
    obraId: row.obra_id,
    companyId: row.company_id,
    categoria: row.categoria || '',
    etapaNome: row.etapa_nome || '',
    descricao: row.descricao || '',
    fornecedor: row.fornecedor || '',
    valor: Number(row.valor) || 0,
    data: row.data || '',
    observacoes: row.observacoes || '',
  };
}

export function CustoRealProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [itens, setItens] = useState<CustoRealItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setItens([]); setLoading(false); return; }
    const { data } = await supabase.from('custo_real_itens').select('*');
    if (data) setItens(data.map(dbToItem));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getItensByObra = useCallback((obraId: string) => itens.filter(i => i.obraId === obraId), [itens]);
  const getItensByCategoria = useCallback((categoria: string) => itens.filter(i => i.categoria === categoria), [itens]);

  const saveItem = useCallback(async (item: CustoRealItem) => {
    await (supabase.from('custo_real_itens') as any).upsert({
      id: item.id,
      obra_id: item.obraId,
      company_id: item.companyId,
      categoria: item.categoria,
      etapa_nome: item.etapaNome || null,
      descricao: item.descricao,
      fornecedor: item.fornecedor || null,
      valor: item.valor,
      data: item.data || null,
      observacoes: item.observacoes || null,
    });
    await fetchAll();
  }, [fetchAll]);

  const saveItems = useCallback(async (items: CustoRealItem[]) => {
    if (items.length === 0) return;
    await (supabase.from('custo_real_itens') as any).upsert(
      items.map((item: CustoRealItem) => ({
        id: item.id,
        obra_id: item.obraId,
        company_id: item.companyId,
        categoria: item.categoria,
        etapa_nome: item.etapaNome || null,
        descricao: item.descricao,
        fornecedor: item.fornecedor || null,
        valor: item.valor,
        data: item.data || null,
        observacoes: item.observacoes || null,
      }))
    );
    await fetchAll();
  }, [fetchAll]);

  const deleteItem = useCallback(async (id: string) => {
    await supabase.from('custo_real_itens').delete().eq('id', id);
    await fetchAll();
  }, [fetchAll]);

  const deleteItemsByCategoria = useCallback(async (categoria: string, keepIds: string[]) => {
    const existing = itens.filter(i => i.categoria === categoria);
    const toDelete = existing.filter(i => !keepIds.includes(i.id)).map(i => i.id);
    if (toDelete.length > 0) {
      await supabase.from('custo_real_itens').delete().in('id', toDelete);
    }
  }, [itens]);

  return (
    <CustoRealContext.Provider value={{ itens, loading, getItensByObra, getItensByCategoria, saveItem, saveItems, deleteItem, deleteItemsByCategoria, refresh: fetchAll }}>
      {children}
    </CustoRealContext.Provider>
  );
}

export function useCustoReal() {
  const ctx = useContext(CustoRealContext);
  if (!ctx) throw new Error('useCustoReal must be used within CustoRealProvider');
  return ctx;
}
