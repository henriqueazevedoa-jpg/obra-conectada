import { useState, useEffect, useCallback, useMemo } from 'react';
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

export function useGanttDependencies(obraId: string | undefined) {
  const [deps, setDeps] = useState<GanttDependency[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDeps = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const { data } = await supabase
      .from('cronograma_dependencias')
      .select('*')
      .eq('obra_id', obraId);
    setDeps((data as GanttDependency[]) || []);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { fetchDeps(); }, [fetchDeps]);

  const addDep = useCallback(async (sourceCatId: string, targetCatId: string, tipo: DepType = 'FS', lagDays = 0) => {
    if (!obraId || sourceCatId === targetCatId) return;
    // Check for duplicate
    if (deps.some(d => d.source_cat_id === sourceCatId && d.target_cat_id === targetCatId)) return;
    // Check for circular
    if (wouldCreateCycle(deps, sourceCatId, targetCatId)) return false;

    const { data, error } = await (supabase.from('cronograma_dependencias') as any)
      .insert({ obra_id: obraId, source_cat_id: sourceCatId, target_cat_id: targetCatId, tipo, lag_days: lagDays })
      .select()
      .single();
    if (!error && data) {
      setDeps(prev => [...prev, data as GanttDependency]);
    }
    return !error;
  }, [obraId, deps]);

  const removeDep = useCallback(async (depId: string) => {
    await supabase.from('cronograma_dependencias').delete().eq('id', depId);
    setDeps(prev => prev.filter(d => d.id !== depId));
  }, []);

  /**
   * Calculate cascade effects when a task's dates change.
   * Returns list of tasks that would need to move.
   */
  const calculateCascade = useCallback((
    changedCatId: string,
    newStart: string,
    newEnd: string,
    allCats: CatDates[]
  ): CascadeResult[] => {
    const results: CascadeResult[] = [];
    const visited = new Set<string>();

    // Build adjacency
    const successors = new Map<string, { targetId: string; tipo: DepType; lag: number }[]>();
    deps.forEach(d => {
      const arr = successors.get(d.source_cat_id) || [];
      arr.push({ targetId: d.target_cat_id, tipo: d.tipo, lag: d.lag_days });
      successors.set(d.source_cat_id, arr);
    });

    const catMap = new Map(allCats.map(c => [c.id, c]));
    // Override changed cat dates
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
          // SS
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

  return { deps, loading, addDep, removeDep, calculateCascade, refresh: fetchDeps };
}

function wouldCreateCycle(deps: GanttDependency[], newSource: string, newTarget: string): boolean {
  // BFS from newTarget to see if we can reach newSource
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
