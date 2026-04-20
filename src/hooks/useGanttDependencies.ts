import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { addDays, parseISO, differenceInDays, format } from 'date-fns';

export type DepType = 'FS' | 'SS';

export interface GanttDependency {
  id: string;
  obra_id: string;
  source_cat_id: string;
  target_cat_id: string;
  tipo: DepType;
  lag_days: number;
}

export interface CascadeResult {
  catId: string;
  catName: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
}

interface CatDates {
  id: string;
  nome: string;
  startDate?: string;
  endDate?: string;
}

// ── Fetch function ────────────────────────────────────────────────────────────
async function fetchGanttDependencies(obraId: string): Promise<GanttDependency[]> {
  const { data } = await supabase
    .from('cronograma_dependencias')
    .select('*')
    .eq('obra_id', obraId);
  return (data as GanttDependency[]) || [];
}

export function useGanttDependencies(obraId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: deps = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['gantt-dependencies', obraId],
    queryFn: () => fetchGanttDependencies(obraId!),
    enabled: !!obraId,
  });

  const addDep = useCallback(async (sourceCatId: string, targetCatId: string, tipo: DepType = 'FS', lagDays = 0) => {
    if (!obraId || sourceCatId === targetCatId) return;
    if (deps.some(d => d.source_cat_id === sourceCatId && d.target_cat_id === targetCatId)) return;
    if (wouldCreateCycle(deps, sourceCatId, targetCatId)) return false;

    const { data, error } = await (supabase.from('cronograma_dependencias') as any)
      .insert({ obra_id: obraId, source_cat_id: sourceCatId, target_cat_id: targetCatId, tipo, lag_days: lagDays })
      .select()
      .single();
    if (!error && data) {
      queryClient.invalidateQueries({ queryKey: ['gantt-dependencies', obraId] });
    }
    return !error;
  }, [obraId, deps, queryClient]);

  const removeDep = useCallback(async (depId: string) => {
    await supabase.from('cronograma_dependencias').delete().eq('id', depId);
    queryClient.invalidateQueries({ queryKey: ['gantt-dependencies', obraId] });
  }, [obraId, queryClient]);

  const calculateCascade = useCallback((
    changedCatId: string,
    newStart: string,
    newEnd: string,
    allCats: CatDates[]
  ): CascadeResult[] => {
    const results: CascadeResult[] = [];
    const visited = new Set<string>();

    const successors = new Map<string, { targetId: string; tipo: DepType; lag: number }[]>();
    deps.forEach(d => {
      const arr = successors.get(d.source_cat_id) || [];
      arr.push({ targetId: d.target_cat_id, tipo: d.tipo, lag: d.lag_days });
      successors.set(d.source_cat_id, arr);
    });

    const catMap = new Map(allCats.map(c => [c.id, c]));
    const overrides = new Map<string, { start: string; end: string }>();
    overrides.set(changedCatId, { start: newStart, end: newEnd });

    const queue = [changedCatId];
    visited.add(changedCatId);

    while (queue.length > 0) {
      const srcId = queue.shift()!;
      const srcDates = overrides.get(srcId) || (() => {
        const c = catMap.get(srcId);
        return c?.startDate && c?.endDate ? { start: c.startDate, end: c.endDate } : null;
      })();
      if (!srcDates) continue;

      const succs = successors.get(srcId) || [];
      for (const { targetId, tipo, lag } of succs) {
        if (visited.has(targetId)) continue;
        visited.add(targetId);

        const target = catMap.get(targetId);
        if (!target || !target.startDate || !target.endDate) continue;

        let requiredStart: Date;
        if (tipo === 'FS') {
          requiredStart = addDays(parseISO(srcDates.end), 1 + lag);
        } else {
          requiredStart = addDays(parseISO(srcDates.start), lag);
        }

        const currentStart = parseISO(target.startDate);
        const currentEnd = parseISO(target.endDate);
        const duration = differenceInDays(currentEnd, currentStart);

        if (requiredStart > currentStart) {
          const newTargetStart = format(requiredStart, 'yyyy-MM-dd');
          const newTargetEnd = format(addDays(requiredStart, duration), 'yyyy-MM-dd');

          results.push({
            catId: targetId,
            catName: target.nome,
            oldStart: target.startDate,
            oldEnd: target.endDate,
            newStart: newTargetStart,
            newEnd: newTargetEnd,
          });

          overrides.set(targetId, { start: newTargetStart, end: newTargetEnd });
          queue.push(targetId);
        }
      }
    }

    return results;
  }, [deps]);

  return { deps, loading, addDep, removeDep, calculateCascade, refresh: refetch };
}

function wouldCreateCycle(deps: GanttDependency[], newSource: string, newTarget: string): boolean {
  const successors = new Map<string, string[]>();
  deps.forEach(d => {
    const arr = successors.get(d.source_cat_id) || [];
    arr.push(d.target_cat_id);
    successors.set(d.source_cat_id, arr);
  });

  const visited = new Set<string>();
  const queue = [newTarget];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === newSource) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    (successors.get(node) || []).forEach(s => queue.push(s));
  }
  return false;
}
