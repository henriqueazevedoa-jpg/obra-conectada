/**
 * usePriceSuggestion — Hook de sugestão de preço por composição
 *
 * Sequência de busca:
 *  1. Histórico da empresa (catalogo_composicoes.preco_medio, by criteria)
 *  2. SINAPI (bag-of-words similarity)
 *
 * Retorna badge de confiança: 'historico' | 'sinapi' | 'sinapi_uncertain' | 'sem_match'
 */
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untyped';

export type PriceBadge = 'historico' | 'sinapi' | 'sinapi_uncertain' | 'sem_match';

export interface PriceSuggestion {
  preco: number;
  badge: PriceBadge;
  score: number; // 0-1
  fonte: string; // 'Histórico empresa' | 'SINAPI 7619' etc.
  historico?: Array<{ nome: string; preco: number; usos: number }>;
}

// ── Bag-of-Words similarity ───────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em',
  'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'ou', 'tipo', 'com',
  'para', 'em', 'de', 'um', 'uma',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function bowSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of Array.from(tokensA)) {
    if (tokensB.has(t)) intersection++;
  }

  // Jaccard index weighted towards the query
  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function usePriceSuggestion(companyId: string | undefined) {
  // Cache para não refazer buscas repetidas
  const cache = useRef<Map<string, PriceSuggestion>>(new Map());

  const suggest = useCallback(async (
    descricao: string,
    criterio: string = 'ultimo'
  ): Promise<PriceSuggestion | null> => {
    if (!companyId || !descricao.trim()) return null;

    const cacheKey = `${descricao.toLowerCase()}::${criterio}`;
    if (cache.current.has(cacheKey)) {
      return cache.current.get(cacheKey)!;
    }

    // ── 1. Histórico da empresa ───────────────────────────────────────────
    try {
      const { data: catalogoItems } = await (supabase as any)
        .from('catalogo_composicoes')
        .select('nome, preco_medio, usos')
        .eq('company_id', companyId)
        .not('preco_medio', 'is', null)
        .order('usos', { ascending: false })
        .limit(50) as { data: Array<{ nome: string; preco_medio: number; usos: number }> | null };

      if (catalogoItems && catalogoItems.length > 0) {
        // Encontrar melhor match por bag-of-words
        let bestScore = 0;
        let bestItems: typeof catalogoItems = [];

        for (const item of catalogoItems) {
          const score = bowSimilarity(descricao, item.nome);
          if (score > bestScore) {
            bestScore = score;
            bestItems = [item];
          } else if (score === bestScore && score > 0) {
            bestItems.push(item);
          }
        }

        if (bestScore >= 0.5 && bestItems.length > 0) {
          // Aplicar critério de seleção
          let preco: number;
          const precos = bestItems.map(i => i.preco_medio);

          switch (criterio) {
            case 'menor':
              preco = Math.min(...precos);
              break;
            case 'media_simples':
              preco = precos.reduce((s, p) => s + p, 0) / precos.length;
              break;
            case 'media_ponderada':
              const totalUsos = bestItems.reduce((s, i) => s + (i.usos || 1), 0);
              preco = bestItems.reduce((s, i) => s + i.preco_medio * (i.usos || 1), 0) / totalUsos;
              break;
            default: // 'ultimo' — maior usos (já ordenado)
              preco = bestItems[0].preco_medio;
          }

          const result: PriceSuggestion = {
            preco,
            badge: 'historico',
            score: bestScore,
            fonte: 'Histórico empresa',
            historico: bestItems.slice(0, 5).map(i => ({
              nome: i.nome,
              preco: i.preco_medio,
              usos: i.usos || 0,
            })),
          };
          cache.current.set(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn('[usePriceSuggestion] histórico error:', e);
    }

    // ── 2. SINAPI (bag-of-words) ──────────────────────────────────────────
    try {
      // Pegar top palavras-chave (sem stop words)
      const tokens = Array.from(tokenize(descricao)).slice(0, 5);
      if (tokens.length === 0) return null;

      // Busca usando ILIKE com as principais palavras
      const searchTerm = `%${tokens[0]}%`;
      const { data: sinapiItems } = await (supabase as any)
        .from('sinapi_composicoes')
        .select('codigo, descricao')
        .ilike('descricao', searchTerm)
        .limit(30) as { data: Array<{ codigo: number; descricao: string }> | null };

      if (!sinapiItems || sinapiItems.length === 0) {
        const noMatch: PriceSuggestion = {
          preco: 0,
          badge: 'sem_match',
          score: 0,
          fonte: 'Sem match',
        };
        cache.current.set(cacheKey, noMatch);
        return noMatch;
      }

      // Ranquear por bag-of-words
      let bestScore = 0;
      let bestItem: (typeof sinapiItems)[0] | null = null;

      for (const item of sinapiItems) {
        const score = bowSimilarity(descricao, item.descricao);
        if (score > bestScore) {
          bestScore = score;
          bestItem = item;
        }
      }

      if (!bestItem || bestScore < 0.3) {
        const noMatch: PriceSuggestion = {
          preco: 0,
          badge: 'sem_match',
          score: bestScore,
          fonte: 'Sem match',
        };
        cache.current.set(cacheKey, noMatch);
        return noMatch;
      }

      // Buscar preço na tabela de custos
      const { data: custo } = await (supabase as any)
        .from('sinapi_composicao_custos')
        .select('custo_total')
        .eq('composicao_id', bestItem.codigo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { custo_total: number } | null };

      const preco = custo?.custo_total ?? 0;
      const badge: PriceBadge = bestScore >= 0.6 ? 'sinapi' : 'sinapi_uncertain';

      const result: PriceSuggestion = {
        preco,
        badge,
        score: bestScore,
        fonte: `SINAPI ${bestItem.codigo}`,
      };
      cache.current.set(cacheKey, result);
      return result;

    } catch (e) {
      console.warn('[usePriceSuggestion] sinapi error:', e);
      return null;
    }
  }, [companyId]);

  const suggestEtapa = useCallback(async (
    composicoes: Array<{ id: string; descricao: string; precoUnitario: number | null }>,
    criterio: string = 'ultimo'
  ): Promise<Map<string, PriceSuggestion>> => {
    const results = new Map<string, PriceSuggestion>();
    const semPreco = composicoes.filter(c => !c.precoUnitario);

    await Promise.all(
      semPreco.map(async (c) => {
        const s = await suggest(c.descricao, criterio);
        if (s) results.set(c.id, s);
      })
    );

    return results;
  }, [suggest]);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return { suggest, suggestEtapa, clearCache };
}
