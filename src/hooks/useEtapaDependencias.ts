import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';

export type EtapaDepTipo = 'FS' | 'SS' | 'FF' | 'SF';

export interface EtapaDependencia {
  id: string;
  obra_id: string;
  etapa_origem_id: string;
  etapa_destino_id: string;
  tipo: EtapaDepTipo;
  lag_dias: number;
}

// ── Fetch function ────────────────────────────────────────────────────────────
async function fetchEtapaDependencias(obraId: string): Promise<EtapaDependencia[]> {
  const { data } = await (supabase as any)
    .from('orcamento_etapa_dependencias')
    .select('*')
    .eq('obra_id', obraId)
    .order('created_at', { ascending: true });
  return (data as EtapaDependencia[]) || [];
}

/**
 * Hook para gerenciar dependências entre etapas do orçamento.
 * Usa a tabela `orcamento_etapa_dependencias`.
 */
export function useEtapaDependencias(obraId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: dependencias = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['etapa-dependencias', obraId],
    queryFn: () => fetchEtapaDependencias(obraId!),
    enabled: !!obraId,
  });

  const addDependencia = useCallback(async (
    origemId: string,
    destinoId: string,
    tipo: EtapaDepTipo = 'FS',
    lagDias = 0
  ): Promise<boolean> => {
    if (!obraId || origemId === destinoId) return false;
    if (dependencias.some(d => d.etapa_origem_id === origemId && d.etapa_destino_id === destinoId)) return false;
    if (wouldCreateCycle(dependencias, origemId, destinoId)) return false;

    const { data, error } = await (supabase as any)
      .from('orcamento_etapa_dependencias')
      .insert({ obra_id: obraId, etapa_origem_id: origemId, etapa_destino_id: destinoId, tipo, lag_dias: lagDias })
      .select()
      .single();

    if (!error && data) {
      queryClient.invalidateQueries({ queryKey: ['etapa-dependencias', obraId] });
      return true;
    }
    return false;
  }, [obraId, dependencias, queryClient]);

  const updateDependencia = useCallback(async (
    depId: string,
    changes: Partial<Pick<EtapaDependencia, 'tipo' | 'lag_dias'>>
  ): Promise<boolean> => {
    const { error } = await (supabase as any)
      .from('orcamento_etapa_dependencias')
      .update(changes)
      .eq('id', depId);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['etapa-dependencias', obraId] });
      return true;
    }
    return false;
  }, [obraId, queryClient]);

  const removeDependencia = useCallback(async (depId: string) => {
    await (supabase as any)
      .from('orcamento_etapa_dependencias')
      .delete()
      .eq('id', depId);
    queryClient.invalidateQueries({ queryKey: ['etapa-dependencias', obraId] });
  }, [obraId, queryClient]);

  const getDepsDeOrigem = useCallback((etapaId: string) =>
    dependencias.filter(d => d.etapa_origem_id === etapaId),
  [dependencias]);

  const getDepsDeDestino = useCallback((etapaId: string) =>
    dependencias.filter(d => d.etapa_destino_id === etapaId),
  [dependencias]);

  return {
    dependencias,
    loading,
    addDependencia,
    updateDependencia,
    removeDependencia,
    getDepsDeOrigem,
    getDepsDeDestino,
    refresh: refetch,
  };
}

function wouldCreateCycle(
  deps: EtapaDependencia[],
  novaOrigem: string,
  novoDestino: string
): boolean {
  const adj = new Map<string, string[]>();
  deps.forEach(d => {
    const list = adj.get(d.etapa_origem_id) || [];
    list.push(d.etapa_destino_id);
    adj.set(d.etapa_origem_id, list);
  });

  const visited = new Set<string>();
  const queue = [novoDestino];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === novaOrigem) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    (adj.get(node) || []).forEach(s => queue.push(s));
  }
  return false;
}
