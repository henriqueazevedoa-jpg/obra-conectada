import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface CustoRealItem {
  id: string;
  obraId: string;
  categoriaId: string;
  tipoInsumo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  fornecedor: string;
  precoUnitario: number;
  precoTotal: number;
  movimentacaoId?: string;
  notaFiscalUrl?: string;
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
    categoriaId: row.categoria_id,
    tipoInsumo: row.tipo_insumo || 'Material',
    descricao: row.descricao || '',
    unidade: row.unidade || '',
    quantidade: Number(row.quantidade) || 0,
    fornecedor: row.fornecedor || '',
    precoUnitario: Number(row.preco_unitario) || 0,
    precoTotal: Number(row.preco_total) || 0,
    movimentacaoId: row.movimentacao_id || undefined,
    notaFiscalUrl: row.nota_fiscal_url || undefined,
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
  const getItensByCategoria = useCallback((categoriaId: string) => itens.filter(i => i.categoriaId === categoriaId), [itens]);

  const saveItem = useCallback(async (item: CustoRealItem) => {
    await supabase.from('custo_real_itens').upsert({
      id: item.id,
      obra_id: item.obraId,
      categoria_id: item.categoriaId,
      tipo_insumo: item.tipoInsumo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      fornecedor: item.fornecedor,
      preco_unitario: item.precoUnitario,
      preco_total: item.precoTotal,
      movimentacao_id: item.movimentacaoId || null,
      nota_fiscal_url: item.notaFiscalUrl || null,
    });
    await fetchAll();
  }, [fetchAll]);

  const saveItems = useCallback(async (items: CustoRealItem[]) => {
    if (items.length === 0) return;
    await supabase.from('custo_real_itens').upsert(
      items.map(item => ({
        id: item.id,
        obra_id: item.obraId,
        categoria_id: item.categoriaId,
        tipo_insumo: item.tipoInsumo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        fornecedor: item.fornecedor,
        preco_unitario: item.precoUnitario,
        preco_total: item.precoTotal,
        movimentacao_id: item.movimentacaoId || null,
        nota_fiscal_url: item.notaFiscalUrl || null,
      }))
    );
    await fetchAll();
  }, [fetchAll]);

  const deleteItem = useCallback(async (id: string) => {
    await supabase.from('custo_real_itens').delete().eq('id', id);
    await fetchAll();
  }, [fetchAll]);

  const deleteItemsByCategoria = useCallback(async (categoriaId: string, keepIds: string[]) => {
    const existing = itens.filter(i => i.categoriaId === categoriaId);
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
