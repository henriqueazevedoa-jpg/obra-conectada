import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untyped';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type SearchItemSinapiComposicao = {
  tipo: 'sinapi_composicao';
  codigo: number;
  descricao: string;
  unidade: string;
  custo: number;
};

export type SearchItemSinapiInsumo = {
  tipo: 'sinapi_insumo';
  codigo: number;
  descricao: string;
  unidade: string;
  preco: number;
};

export type SearchItemBiblioteca = {
  tipo: 'biblioteca';
  id: string;
  descricao: string;
  unidade: string;
  preco_medio: number;
};

export type SearchItemHistorico = {
  tipo: 'historico';
  descricao: string;
  unidade: string;
  preco: number;
};

export type SearchItem =
  | SearchItemSinapiComposicao
  | SearchItemSinapiInsumo
  | SearchItemBiblioteca
  | SearchItemHistorico;

export interface SinapiSearchConfig {
  referencia_id: string | null;
  uf: string;
  regime: string;
  isSinapiSearchEnabled?: boolean;
}

// ── Utilitários ────────────────────────────────────────────────────────────────

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Extrai tokens com pelo menos 2 chars */
function tokenizar(query: string): string[] {
  return normalizar(query)
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

/** Filtra client-side por todos os tokens (além do primeiro que já foi filtrado no banco) */
function matchTokens(descricao: string, tokens: string[]): boolean {
  const norm = normalizar(descricao);
  return tokens.every(t => norm.includes(t));
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useItemSearch(
  query: string,
  sinapiConfig: SinapiSearchConfig,
  companyId: string | undefined,
  debounceMs = 300,
) {
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      // Cancela requisição anterior
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      const tokens = tokenizar(trimmed);
      const firstToken = tokens[0] ?? trimmed;
      const sinapi = sinapiConfig;
      const sinapiAtivo = !!(sinapi.isSinapiSearchEnabled !== false && sinapi.referencia_id);

      try {
        const promises: Promise<SearchItem[]>[] = [];

        // ── SINAPI Composições ──
        if (sinapiAtivo) {
          promises.push(
            (supabase as any)
              .from('sinapi_composicoes')
              .select(`
                codigo, descricao, unidade,
                sinapi_composicao_custos!inner(custo)
              `)
              .ilike('descricao', `%${firstToken}%`)
              .eq('sinapi_composicao_custos.referencia_id', sinapi.referencia_id)
              .eq('sinapi_composicao_custos.uf', sinapi.uf)
              .eq('sinapi_composicao_custos.regime', sinapi.regime)
              .limit(30)
              .then(({ data }: { data: any[] | null }) =>
                (data || [])
                  .filter(r => matchTokens(r.descricao, tokens))
                  .slice(0, 6)
                  .map(r => ({
                    tipo: 'sinapi_composicao' as const,
                    codigo: r.codigo,
                    descricao: r.descricao,
                    unidade: r.unidade,
                    custo: r.sinapi_composicao_custos?.[0]?.custo ?? 0,
                  }))
              )
          );

          // ── SINAPI Insumos ──
          promises.push(
            (supabase as any)
              .from('sinapi_insumos')
              .select(`
                codigo, descricao, unidade,
                sinapi_insumo_precos!inner(preco)
              `)
              .ilike('descricao', `%${firstToken}%`)
              .eq('sinapi_insumo_precos.referencia_id', sinapi.referencia_id)
              .eq('sinapi_insumo_precos.uf', sinapi.uf)
              .eq('sinapi_insumo_precos.regime', sinapi.regime)
              .limit(30)
              .then(({ data }: { data: any[] | null }) =>
                (data || [])
                  .filter(r => matchTokens(r.descricao, tokens))
                  .slice(0, 4)
                  .map(r => ({
                    tipo: 'sinapi_insumo' as const,
                    codigo: r.codigo,
                    descricao: r.descricao,
                    unidade: r.unidade,
                    preco: r.sinapi_insumo_precos?.[0]?.preco ?? 0,
                  }))
              )
          );
        }

        // ── Biblioteca Própria ──
        if (companyId) {
          promises.push(
            (supabase as any)
              .from('catalogo_composicoes')
              .select('id, nome, unidade, preco_medio')
              .eq('company_id', companyId)
              .ilike('nome', `%${firstToken}%`)
              .limit(30)
              .then(({ data }: { data: any[] | null }) =>
                (data || [])
                  .filter(r => matchTokens(r.nome, tokens))
                  .slice(0, 5)
                  .map(r => ({
                    tipo: 'biblioteca' as const,
                    id: r.id,
                    descricao: r.nome,
                    unidade: r.unidade ?? '',
                    preco_medio: r.preco_medio ?? 0,
                  }))
              )
          );

          // ── Histórico ──
          promises.push(
            (supabase as any)
              .from('preco_historico')
              .select('descricao_insumo, unidade, preco_unitario')
              .eq('company_id', companyId)
              .ilike('descricao_normalizada', `%${firstToken}%`)
              .order('created_at', { ascending: false })
              .limit(30)
              .then(({ data }: { data: any[] | null }) => {
                const seen = new Set<string>();
                return (data || [])
                  .filter(r => {
                    if (!matchTokens(r.descricao_insumo, tokens)) return false;
                    const key = normalizar(r.descricao_insumo);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  })
                  .slice(0, 4)
                  .map(r => ({
                    tipo: 'historico' as const,
                    descricao: r.descricao_insumo,
                    unidade: r.unidade ?? '',
                    preco: r.preco_unitario ?? 0,
                  }));
              })
          );
        }

        const all = await Promise.all(promises);
        setResults(all.flat());
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.warn('[useItemSearch]', e);
        }
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, sinapiConfig.referencia_id, sinapiConfig.uf, sinapiConfig.regime, sinapiConfig.isSinapiSearchEnabled, companyId, debounceMs]);

  return { results, loading };
}
