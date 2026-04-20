import { useCallback } from 'react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ListaStatus = 'rascunho' | 'pronto' | 'enviada' | 'respondida' | 'parcial';

export interface CotacaoListaFornecedor {
  id: string;
  nome: string;
  email?: string | null;
}

export interface CotacaoLista {
  id: string;
  obra_id: string | null;
  company_id: string;
  nome: string;
  tipo: string;
  config: Record<string, unknown>;
  item_keys: string[];
  created_at: string;
  fornecedores: CotacaoListaFornecedor[];
  status: ListaStatus;
  is_template: boolean;
}

// ── Fetch function ────────────────────────────────────────────────────────────
async function fetchCotacaoListas(obraId: string, companyId: string): Promise<{ listas: CotacaoLista[]; modelos: CotacaoLista[] }> {
  const { data: listasData, error } = await (supabase as any)
    .from('cotacao_listas')
    .select('*')
    .eq('company_id', companyId)
    .or(`obra_id.eq.${obraId},is_template.eq.true`)
    .order('created_at', { ascending: false });

  if (error || !listasData) return { listas: [], modelos: [] };

  const listaIds: string[] = listasData.map((l: any) => l.id);
  let fornMap: Record<string, CotacaoListaFornecedor[]> = {};

  if (listaIds.length > 0) {
    const { data: vincs } = await (supabase as any)
      .from('cotacao_fornecedor_listas')
      .select('lista_id, fornecedor_id')
      .in('lista_id', listaIds);

    if (vincs && vincs.length > 0) {
      const fornIds = [...new Set((vincs as any[]).map((v: any) => v.fornecedor_id))] as string[];
      const { data: forns } = await (supabase as any)
        .from('fornecedores')
        .select('id, nome, email')
        .in('id', fornIds);

      const fornById: Record<string, CotacaoListaFornecedor> = {};
      for (const f of (forns || []) as any[]) {
        fornById[f.id] = { id: f.id, nome: f.nome, email: f.email };
      }
      for (const v of vincs as any[]) {
        if (!fornMap[v.lista_id]) fornMap[v.lista_id] = [];
        if (fornById[v.fornecedor_id]) fornMap[v.lista_id].push(fornById[v.fornecedor_id]);
      }
    }
  }

  const result: CotacaoLista[] = listasData.map((l: any) => ({
    id: l.id,
    obra_id: l.obra_id,
    company_id: l.company_id,
    nome: l.nome,
    tipo: l.tipo || 'manual',
    config: l.config || {},
    item_keys: l.item_keys || [],
    created_at: l.created_at,
    fornecedores: fornMap[l.id] || [],
    status: (l.status as ListaStatus) || 'rascunho',
    is_template: l.is_template ?? false,
  }));

  return {
    listas: result.filter(l => !l.is_template),
    modelos: result.filter(l => l.is_template),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCotacaoListas(obraId: string, companyId: string | undefined) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['cotacao-listas', obraId, companyId],
    queryFn: () => fetchCotacaoListas(obraId, companyId!),
    enabled: !!obraId && !!companyId,
  });

  const listas = data?.listas ?? [];
  const modelos = data?.modelos ?? [];

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cotacao-listas', obraId, companyId] });
  }, [queryClient, obraId, companyId]);

  // ── Create ───────────────────────────────────────────────────────────────────
  const criarLista = useCallback(async (
    nome: string,
    itemKeys: string[],
    tipo: string = 'manual'
  ): Promise<CotacaoLista | null> => {
    if (!companyId || !obraId) return null;
    setSaving(true);
    try {
      const { data: row, error } = await (supabase as any)
        .from('cotacao_listas')
        .insert({ obra_id: obraId, company_id: companyId, nome, tipo, item_keys: itemKeys, status: 'rascunho', is_template: false, config: {} })
        .select().single();
      if (!error && row) {
        invalidate();
        return { ...row, fornecedores: [], status: 'rascunho', is_template: false };
      }
      return null;
    } finally { setSaving(false); }
  }, [obraId, companyId, invalidate]);

  const criarDeModelo = useCallback(async (
    modeloId: string,
    nomeCustom?: string
  ): Promise<CotacaoLista | null> => {
    if (!companyId || !obraId) return null;
    const modelo = modelos.find(m => m.id === modeloId);
    if (!modelo) return null;
    setSaving(true);
    try {
      const { data: row, error } = await (supabase as any)
        .from('cotacao_listas')
        .insert({ obra_id: obraId, company_id: companyId, nome: nomeCustom ?? modelo.nome, tipo: modelo.tipo, item_keys: modelo.item_keys, status: 'rascunho', is_template: false, config: {} })
        .select().single();
      if (!error && row) {
        invalidate();
        return { ...row, fornecedores: [], status: 'rascunho', is_template: false };
      }
      return null;
    } finally { setSaving(false); }
  }, [companyId, obraId, modelos, invalidate]);

  const salvarComoModelo = useCallback(async (listaId: string): Promise<void> => {
    setSaving(true);
    try {
      await (supabase as any).from('cotacao_listas').update({ is_template: true, obra_id: null }).eq('id', listaId);
      invalidate();
    } finally { setSaving(false); }
  }, [invalidate]);

  // ── Update ───────────────────────────────────────────────────────────────────
  const renomearLista = useCallback(async (listaId: string, nome: string) => {
    setSaving(true);
    try {
      await (supabase as any).from('cotacao_listas').update({ nome }).eq('id', listaId);
      invalidate();
    } finally { setSaving(false); }
  }, [invalidate]);

  const atualizarItens = useCallback(async (listaId: string, itemKeys: string[]) => {
    setSaving(true);
    try {
      await (supabase as any).from('cotacao_listas').update({ item_keys: itemKeys }).eq('id', listaId);
      invalidate();
    } finally { setSaving(false); }
  }, [invalidate]);

  const atualizarStatus = useCallback(async (listaId: string, status: ListaStatus) => {
    await (supabase as any).from('cotacao_listas').update({ status }).eq('id', listaId);
    invalidate();
  }, [invalidate]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deletarLista = useCallback(async (listaId: string) => {
    await (supabase as any).from('cotacao_fornecedor_listas').delete().eq('lista_id', listaId);
    await (supabase as any).from('cotacao_listas').delete().eq('id', listaId);
    invalidate();
  }, [invalidate]);

  // ── Fornecedor linking ────────────────────────────────────────────────────────
  const vincularFornecedor = useCallback(async (listaId: string, fornecedorId: string) => {
    await (supabase as any).from('cotacao_fornecedor_listas').upsert({ lista_id: listaId, fornecedor_id: fornecedorId });
    invalidate();
  }, [invalidate]);

  const desvincularFornecedor = useCallback(async (listaId: string, fornecedorId: string) => {
    await (supabase as any).from('cotacao_fornecedor_listas').delete().eq('lista_id', listaId).eq('fornecedor_id', fornecedorId);
    invalidate();
  }, [invalidate]);

  // ── Item management ──────────────────────────────────────────────────────────
  const removerItem = useCallback(async (listaId: string, itemKey: string) => {
    const lista = listas.find(l => l.id === listaId);
    if (!lista) return;
    await atualizarItens(listaId, lista.item_keys.filter(k => k !== itemKey));
  }, [listas, atualizarItens]);

  const adicionarItens = useCallback(async (listaId: string, itemKeys: string[]) => {
    const lista = listas.find(l => l.id === listaId);
    if (!lista) return;
    await atualizarItens(listaId, [...new Set([...lista.item_keys, ...itemKeys])]);
  }, [listas, atualizarItens]);

  return {
    listas, modelos, loading, saving,
    criarLista, criarDeModelo, salvarComoModelo,
    renomearLista, atualizarItens, atualizarStatus,
    deletarLista,
    vincularFornecedor, desvincularFornecedor,
    removerItem, adicionarItens,
    reload: refetch,
  };
}
