import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';

// ── Tipo compartilhado ─────────────────────────────────────────────────────────

export type InsumoRascunho = {
  /** Presente apenas para insumos da Biblioteca */
  id?: string;
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  tipo_item: string | null;
  codigo?: string | null;
  aceito: boolean;
  origem: 'sinapi' | 'biblioteca';
};

// ── Parâmetros de configuração SINAPI ─────────────────────────────────────────

export interface SinapiInsumoConfig {
  referencia_id: string;
  uf: string;
  regime: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useComposicaoInsumos() {
  const [insumos, setInsumos] = useState<InsumoRascunho[] | 'loading' | null>(null);

  /** Carrega insumos de uma composição da Biblioteca via tabela relacional */
  const loadBiblioteca = useCallback(
    async (composicao_id: string, company_id: string) => {
      setInsumos('loading');
      try {
        const { data, error } = await (supabase as any)
          .from('catalogo_composicao_insumos')
          .select('id, descricao, unidade, quantidade, preco_unitario, tipo_item, codigo, ordem')
          .eq('composicao_id', composicao_id)
          .eq('company_id', company_id)
          .order('ordem', { ascending: true });

        if (error) throw error;

        const lista: InsumoRascunho[] = (data || []).map((r: any) => ({
          id: r.id,
          descricao: r.descricao,
          unidade: r.unidade ?? null,
          quantidade: r.quantidade ?? null,
          preco_unitario: r.preco_unitario ?? null,
          tipo_item: r.tipo_item ?? null,
          codigo: r.codigo ?? null,
          aceito: true,
          origem: 'biblioteca',
        }));

        setInsumos(lista);
      } catch (e) {
        console.warn('[useComposicaoInsumos] biblioteca:', e);
        setInsumos([]);
      }
    },
    []
  );

  /** Carrega insumos de uma composição SINAPI com preços filtrados por referência */
  const loadSinapi = useCallback(
    async (composicao_codigo: number, config: SinapiInsumoConfig) => {
      setInsumos('loading');
      try {
        // Busca itens da composição
        const { data: itens, error } = await (supabase as any)
          .from('sinapi_composicao_itens')
          .select('descricao_item, unidade, coeficiente, tipo_item, codigo_item, ordem')
          .eq('composicao_codigo', composicao_codigo)
          .eq('referencia_id', config.referencia_id)
          .order('ordem', { ascending: true });

        if (error) throw error;
        if (!itens || itens.length === 0) {
          setInsumos([]);
          return;
        }

        // Busca preços dos insumos em paralelo
        const codigosInsumos: number[] = [...new Set(itens.map((i: any) => i.codigo_item).filter(Boolean))];
        let precoMap: Record<number, number> = {};

        if (codigosInsumos.length > 0) {
          const { data: precos } = await (supabase as any)
            .from('sinapi_insumo_precos')
            .select('insumo_codigo, preco')
            .in('insumo_codigo', codigosInsumos)
            .eq('referencia_id', config.referencia_id)
            .eq('uf', config.uf)
            .eq('regime', config.regime);

          precoMap = Object.fromEntries(
            (precos || []).map((p: any) => [p.insumo_codigo, p.preco])
          );
        }

        const lista: InsumoRascunho[] = (itens || []).map((r: any) => ({
          descricao: r.descricao_item,
          unidade: r.unidade ?? null,
          quantidade: r.coeficiente ?? null,
          preco_unitario: precoMap[r.codigo_item] ?? null,
          tipo_item: r.tipo_item ?? null,
          codigo: r.codigo_item ? String(r.codigo_item) : null,
          aceito: true,
          origem: 'sinapi',
        }));

        setInsumos(lista);
      } catch (e) {
        console.warn('[useComposicaoInsumos] sinapi:', e);
        setInsumos([]);
      }
    },
    []
  );

  const toggleAceito = useCallback((index: number) => {
    setInsumos(prev => {
      if (!prev || prev === 'loading') return prev;
      const next = [...prev];
      next[index] = { ...next[index], aceito: !next[index].aceito };
      return next;
    });
  }, []);

  const aceitarTodos = useCallback(() => {
    setInsumos(prev => {
      if (!prev || prev === 'loading') return prev;
      return prev.map(i => ({ ...i, aceito: true }));
    });
  }, []);

  const rejeitarTodos = useCallback(() => {
    setInsumos(null);
  }, []);

  const limpar = useCallback(() => setInsumos(null), []);

  return {
    insumos,
    loadBiblioteca,
    loadSinapi,
    toggleAceito,
    aceitarTodos,
    rejeitarTodos,
    limpar,
  };
}
