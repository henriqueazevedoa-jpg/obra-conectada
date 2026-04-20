import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';

export type TipoRecurso = 'EQUIPE' | 'EQUIPAMENTO' | 'TERCEIRO';

export interface RecursoObra {
  id: string;
  obra_id: string;
  company_id?: string;
  tipo: TipoRecurso;
  nome: string;
  capacidade_diaria: number;
  custo_hora?: number;
  cor: string;
  created_at: string;
}

export interface CronogramaAlocacao {
  id: string;
  tarefa_id: string;
  recurso_id: string;
  quantidade: number;
  horas_por_dia: number;
  recurso?: RecursoObra;
}

interface RecursosData {
  recursos: RecursoObra[];
  alocacoes: CronogramaAlocacao[];
}

// ── Fetch function ────────────────────────────────────────────────────────────
async function fetchRecursos(obraId: string): Promise<RecursosData> {
  const { data: tarefasIds } = await supabase
    .from('cronograma_tarefas')
    .select('id')
    .eq('obra_id', obraId);

  const ids = tarefasIds?.map((t: any) => t.id) || [];

  const [{ data: r }, { data: a }] = await Promise.all([
    (supabase.from('recursos_obra') as any).select('*').eq('obra_id', obraId).order('nome'),
    ids.length > 0
      ? (supabase.from('cronograma_alocacoes') as any)
          .select('*, recurso:recursos_obra(*)')
          .in('tarefa_id', ids)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    recursos: (r as RecursoObra[]) || [],
    alocacoes: (a as CronogramaAlocacao[]) || [],
  };
}

export function useRecursos(obraId: string | undefined) {
  const queryClient = useQueryClient();

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['recursos', obraId],
    queryFn: () => fetchRecursos(obraId!),
    enabled: !!obraId,
  });

  const recursos = data?.recursos ?? [];
  const alocacoes = data?.alocacoes ?? [];

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['recursos', obraId] });
  }, [queryClient, obraId]);

  const addRecurso = useCallback(async (partial: Omit<RecursoObra, 'id' | 'created_at'>) => {
    const { data: row, error } = await (supabase.from('recursos_obra') as any)
      .insert({ ...partial, obra_id: obraId }).select().single();
    if (error) { toast({ title: 'Erro ao criar recurso', variant: 'destructive' }); return; }
    invalidate();
    return row as RecursoObra;
  }, [obraId, invalidate]);

  const updateRecurso = useCallback(async (id: string, changes: Partial<RecursoObra>) => {
    const { error } = await (supabase.from('recursos_obra') as any)
      .update(changes).eq('id', id).select().single();
    if (error) { toast({ title: 'Erro ao atualizar recurso', variant: 'destructive' }); return; }
    invalidate();
  }, [invalidate]);

  const deleteRecurso = useCallback(async (id: string) => {
    await (supabase.from('recursos_obra') as any).delete().eq('id', id);
    invalidate();
  }, [invalidate]);

  const addAlocacao = useCallback(async (tarefaId: string, recursoId: string, quantidade = 1, horasPorDia = 8) => {
    if (alocacoes.some(a => a.tarefa_id === tarefaId && a.recurso_id === recursoId)) return;
    const { error } = await (supabase.from('cronograma_alocacoes') as any)
      .insert({ tarefa_id: tarefaId, recurso_id: recursoId, quantidade, horas_por_dia: horasPorDia })
      .select('*, recurso:recursos_obra(*)').single();
    if (error) { toast({ title: 'Erro ao alocar recurso', variant: 'destructive' }); return; }
    invalidate();
  }, [alocacoes, invalidate]);

  const removeAlocacao = useCallback(async (id: string) => {
    await (supabase.from('cronograma_alocacoes') as any).delete().eq('id', id);
    invalidate();
  }, [invalidate]);

  const getAlocacoesDaTarefa = useCallback((tarefaId: string) => {
    return alocacoes.filter(a => a.tarefa_id === tarefaId);
  }, [alocacoes]);

  const recursosSupelalocados = useCallback((): Set<string> => {
    const overloaded = new Set<string>();
    recursos.forEach(rec => {
      const myAlocacoes = alocacoes.filter(a => a.recurso_id === rec.id);
      const totalPorDia = myAlocacoes.reduce((s, a) => s + a.quantidade, 0);
      if (totalPorDia > rec.capacidade_diaria) overloaded.add(rec.id);
    });
    return overloaded;
  }, [recursos, alocacoes]);

  return {
    recursos, alocacoes, loading,
    addRecurso, updateRecurso, deleteRecurso,
    addAlocacao, removeAlocacao,
    getAlocacoesDaTarefa,
    recursosSupelalocados,
    refresh: refetch,
  };
}
