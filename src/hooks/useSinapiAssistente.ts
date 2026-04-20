import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import type { OrcamentoEtapa } from '@/contexts/OrcamentoContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SinapiConfidence = 'alto' | 'medio' | 'baixo';

export interface SinapiMatchResult {
  fonte: string;             // 'insumo' | 'composicao'
  codigo: number;
  descricao: string;
  unidade: string;
  preco: number;
  score: number;
  confidence: SinapiConfidence;
}

export interface SinapiVinculo {
  /** Unique key: composicao.id or `${composicao.id}::${insumo.id}` */
  itemKey: string;
  itemType: 'composicao' | 'insumo';
  /** DB row id for upsert */
  itemId: string;
  itemDescricao: string;
  itemUnidade: string;
  itemPrecoAtual: number | null;
  /** Best match from RPC, null = no match found */
  match: SinapiMatchResult | null;
  /** Whether the user confirmed this binding */
  confirmado: boolean;
  /** Manual override: user picked a different sinapi code */
  manualCodigo?: number;
  manualMatch?: SinapiMatchResult;
}

export interface SinapiAssistanteState {
  running: boolean;
  progress: number;          // 0–100
  progressLabel: string;
  vinculos: SinapiVinculo[];
  error: string | null;
  saving: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function matchItem(
  descricao: string,
  unidade: string,
  uf: string,
  regime: string
): Promise<SinapiMatchResult | null> {
  const { data, error } = await (supabase as any).rpc('match_sinapi_item', {
    p_descricao: descricao,
    p_unidade: unidade || '',
    p_uf: uf,
    p_regime: regime,
    p_limit: 1,
  });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    fonte: row.fonte,
    codigo: Number(row.codigo),
    descricao: row.descricao,
    unidade: row.unidade,
    preco: Number(row.preco),
    score: Number(row.score),
    confidence: row.confidence as SinapiConfidence,
  };
}

/** Process an array of items in batches of `batchSize` with a delay between batches */
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T, idx: number) => Promise<R>,
  onProgress: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, j) => processor(item, i + j))
    );
    results.push(...batchResults);
    onProgress(Math.min(i + batchSize, items.length), items.length);
    // Small delay to avoid overwhelming the DB
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, 120));
    }
  }
  return results;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSinapiAssistente() {
  const [state, setState] = useState<SinapiAssistanteState>({
    running: false,
    progress: 0,
    progressLabel: '',
    vinculos: [],
    error: null,
    saving: false,
  });

  /**
   * Run the AI assistant batch match.
   * Processes compositions (direct) and insumos (nested).
   */
  const runAssistente = useCallback(async (
    etapas: OrcamentoEtapa[],
    uf: string,
    regime: string
  ): Promise<SinapiVinculo[]> => {
    setState(s => ({ ...s, running: true, progress: 0, progressLabel: 'Preparando itens...', error: null, vinculos: [] }));

    try {
      // Collect all items to match
      type ItemToMatch = {
        itemKey: string;
        itemType: 'composicao' | 'insumo';
        itemId: string;
        descricao: string;
        unidade: string;
        precoAtual: number | null;
      };

      const itemsToMatch: ItemToMatch[] = [];
      let skippedCount = 0;

      for (const etapa of etapas) {
        for (const comp of etapa.composicoes || []) {
          if (!comp.usaInsumos || !comp.insumos?.length) {
            // Direct composition — skip if already from SINAPI or already confirmed
            const jaVinculado =
              (comp as any).fonteReferencia === 'SINAPI' ||
              (comp as any).sinapi_confirmado === true;

            if (jaVinculado) {
              skippedCount++;
              continue;
            }
            if (comp.descricao?.trim()) {
              itemsToMatch.push({
                itemKey: comp.id,
                itemType: 'composicao',
                itemId: comp.id,
                descricao: comp.descricao,
                unidade: comp.unidade || '',
                precoAtual: comp.precoUnitario,
              });
            }
          } else {
            // Composition with insumos — skip insumos whose parent is from SINAPI
            const paiEhSinapi = (comp as any).fonteReferencia === 'SINAPI';

            for (const ins of comp.insumos) {
              const jaVinculado =
                paiEhSinapi ||
                (ins as any).sinapi_confirmado === true;

              if (jaVinculado) {
                skippedCount++;
                continue;
              }
              if (ins.descricao?.trim()) {
                itemsToMatch.push({
                  itemKey: `${comp.id}::${ins.id}`,
                  itemType: 'insumo',
                  itemId: ins.id,
                  descricao: ins.descricao,
                  unidade: ins.unidade || '',
                  precoAtual: ins.precoUnitario,
                });
              }
            }
          }
        }
      }

      // Nothing to process after filtering
      if (itemsToMatch.length === 0) {
        setState(s => ({
          ...s,
          running: false,
          progress: 100,
          progressLabel: skippedCount > 0
            ? `Todos os ${skippedCount} itens já possuem vínculo SINAPI.`
            : 'Nenhum item elegível para vinculação.',
          vinculos: [],
        }));
        return [];
      }

      const skippedLabel = skippedCount > 0 ? ` (${skippedCount} já vinculados, ignorados)` : '';
      setState(s => ({ ...s, progressLabel: `Vinculando ${itemsToMatch.length} itens ao SINAPI${skippedLabel}...` }));


      const results: SinapiVinculo[] = [];

      await processBatch(
        itemsToMatch,
        3, // Process 3 at a time
        async (item) => {
          const match = await matchItem(item.descricao, item.unidade, uf, regime);
          const vinculo: SinapiVinculo = {
            itemKey: item.itemKey,
            itemType: item.itemType,
            itemId: item.itemId,
            itemDescricao: item.descricao,
            itemUnidade: item.unidade,
            itemPrecoAtual: item.precoAtual,
            match,
            // Auto-confirm high confidence matches
            confirmado: match?.confidence === 'alto',
          };
          return vinculo;
        },
        (done, total) => {
          const pct = Math.round((done / total) * 90) + 5; // 5%–95%
          setState(s => ({
            ...s,
            progress: pct,
            progressLabel: `${done}/${total} itens processados...`,
          }));
          results.push(...[]); // progress update only
        }
      ).then(res => results.push(...res));

      setState(s => ({
        ...s,
        running: false,
        progress: 100,
        progressLabel: `${results.length} itens analisados.`,
        vinculos: results,
      }));

      return results;

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado no assistente SINAPI';
      setState(s => ({ ...s, running: false, error: msg }));
      return [];
    }
  }, []);

  /**
   * Persist confirmed bindings to the database.
   * Option A: updates preco_unitario where current price is null/zero.
   */
  const saveVinculos = useCallback(async (
    vinculos: SinapiVinculo[],
    updatePrices: boolean = true
  ): Promise<{ saved: number; pricesUpdated: number }> => {
    setState(s => ({ ...s, saving: true }));

    const confirmed = vinculos.filter(v => v.confirmado && (v.match || v.manualMatch));
    let saved = 0;
    let pricesUpdated = 0;

    try {
      for (const v of confirmed) {
        const effectiveMatch = v.manualMatch ?? v.match!;
        const table = v.itemType === 'composicao' ? 'orcamento_composicoes' : 'orcamento_subitens';

        const update: Record<string, unknown> = {
          sinapi_codigo: effectiveMatch.codigo,
          sinapi_fonte: effectiveMatch.fonte,
          sinapi_confidence: effectiveMatch.confidence,
          sinapi_confirmado: true,
          // Also update fonte_referencia for composicoes (to show SINAPI badge)
          ...(v.itemType === 'composicao' ? { fonte_referencia: 'SINAPI' } : {}),
        };

        // Option A: update price if zero or null
        if (updatePrices && effectiveMatch.preco > 0 && (!v.itemPrecoAtual || v.itemPrecoAtual === 0)) {
          update.preco_unitario = effectiveMatch.preco;
          pricesUpdated++;
        }

        const { error } = await (supabase as any)
          .from(table)
          .update(update)
          .eq('id', v.itemId);

        if (!error) saved++;
      }

      setState(s => ({ ...s, saving: false }));
      return { saved, pricesUpdated };

    } catch (err) {
      setState(s => ({ ...s, saving: false, error: err instanceof Error ? err.message : 'Erro ao salvar vínculos' }));
      return { saved, pricesUpdated };
    }
  }, []);

  /** Update the confirmado status of a single vínculo */
  const toggleConfirmado = useCallback((itemKey: string, value: boolean) => {
    setState(s => ({
      ...s,
      vinculos: s.vinculos.map(v =>
        v.itemKey === itemKey ? { ...v, confirmado: value } : v
      ),
    }));
  }, []);

  /** Set a manual SINAPI override for a vínculo */
  const setManualMatch = useCallback((itemKey: string, match: SinapiMatchResult | null) => {
    setState(s => ({
      ...s,
      vinculos: s.vinculos.map(v =>
        v.itemKey === itemKey
          ? { ...v, manualMatch: match ?? undefined, confirmado: match !== null }
          : v
      ),
    }));
  }, []);

  /** Reset state */
  const reset = useCallback(() => {
    setState({
      running: false,
      progress: 0,
      progressLabel: '',
      vinculos: [],
      error: null,
      saving: false,
    });
  }, []);

  return {
    ...state,
    runAssistente,
    saveVinculos,
    toggleConfirmado,
    setManualMatch,
    reset,
  };
}
