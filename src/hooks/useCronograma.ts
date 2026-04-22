import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { addDays, differenceInDays, format, parseISO, isBefore, startOfDay } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { enviarNotificacaoDedup } from '@/lib/notificationDedup';

export type TipoTarefa = 'PADRAO' | 'MARCO' | 'RESUMO';
export type StatusTarefa = 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada';
export type TipoDep = 'FS' | 'SS' | 'FF' | 'SF';

export interface CronogramaTarefa {
  id: string;
  obra_id: string;
  nome: string;
  etapa?: string;
  tipo_tarefa: TipoTarefa;
  data_inicio: string | null;
  data_fim: string | null;
  duracao_dias: number;
  percentual_concluido: number;
  status: StatusTarefa;
  responsavel_id?: string | null;
  ordem: number;
  baseline_inicio: string | null;
  baseline_fim: string | null;
  baseline_locked: boolean;
  parent_tarefa_id?: string | null;
  nivel: number;
  cor?: string | null;
  is_critico: boolean;
  orcamento_categoria_id?: string | null;
  orcamento_composicao_id?: string | null;
  nota?: string | null;
  peso_orcamento: number;
  pode_editar_datas: boolean;
  dias_impedidos: number;
  quantidade_prevista: number | null;
  quantidade_executada: number;
  unidade: string | null;
  amdahl_p: number | null;
  amdahl_f: number | null;
  duracao_sugerida_dias: number | null;
  amdahl_grupo_id?: string | null;
  amdahl_equipe?: number | null;
  amdahl_confianca?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CronogramaImpedimento {
  id: string;
  obra_id: string;
  tarefa_id: string;
  tipo: 'climatico' | 'projeto' | 'material' | 'mao_de_obra' | 'financeiro' | 'outros';
  descricao: string;
  data_inicio: string;
  data_fim?: string | null;
  resolvido: boolean;
  impacto_financeiro: number;
  created_at: string;
}

export interface CronogramaDependencia {
  id: string;
  obra_id: string;
  tarefa_origem_id: string;
  tarefa_destino_id: string;
  tipo: TipoDep;
  lag_dias: number;
}

interface CronogramaData {
  tarefas: CronogramaTarefa[];
  dependencias: CronogramaDependencia[];
  impedimentos: CronogramaImpedimento[];
}

// ── Fetch function ────────────────────────────────────────────────────────────
async function fetchCronograma(obraId: string): Promise<CronogramaData> {
  const [{ data: t }, { data: d }, { data: imp }] = await Promise.all([
    supabase
      .from('cronograma_tarefas')
      .select('*')
      .eq('obra_id', obraId)
      .order('nivel').order('ordem'),
    supabase
      .from('cronograma_dependencias')
      .select('*')
      .eq('obra_id', obraId),
    supabase
      .from('cronograma_impedimentos')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false }),
  ]);
  return {
    tarefas: (t as CronogramaTarefa[]) || [],
    dependencias: (d as CronogramaDependencia[]) || [],
    impedimentos: (imp as CronogramaImpedimento[]) || [],
  };
}

export function useCronograma(obraId: string | undefined) {
  const queryClient = useQueryClient();
  const { company } = useCompany();

  const { data, isLoading: loading, isFetching: saving, refetch } = useQuery({
    queryKey: ['cronograma', obraId],
    queryFn: () => fetchCronograma(obraId!),
    enabled: !!obraId,
  });

  const tarefas = data?.tarefas ?? [];
  const dependencias = data?.dependencias ?? [];
  const impedimentos = data?.impedimentos ?? [];

  // Verificação de notificações automáticas
  useEffect(() => {
    if (!company?.id || !obraId || tarefas.length === 0) return;
    const hoje = startOfDay(new Date());

    const atrasadas = tarefas.filter(t => 
      t.data_fim && t.percentual_concluido < 100 && isBefore(parseISO(t.data_fim), hoje) && t.status !== 'concluida'
    );

    atrasadas.forEach(t => {
      enviarNotificacaoDedup({
        company_id: company.id,
        obra_id: obraId,
        tipo: 'etapa_atrasada',
        titulo: 'Etapa Atrasada',
        mensagem: `A etapa "${t.nome}" deveria ter sido concluída dia ${format(parseISO(t.data_fim!), 'dd/MM')} e está com ${t.percentual_concluido}% de progresso.`,
        prioridade: 'importante',
        acao_url: `/cronograma`,
        acao_label: 'Ver Cronograma',
        metadataKey: 'tarefa_id',
        metadataValue: t.id,
      }, 7); // Janela longa (não notifica a mesma etapa todo dia, apenas uma vez por semana)
    });
  }, [tarefas, company?.id, obraId]);

  // Helper — revalidate after mutations
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cronograma', obraId] });
  }, [queryClient, obraId]);

  // ─── CREATE ─────────────────────────────────────────────────────────────────
  const addTarefa = useCallback(async (partial: Partial<CronogramaTarefa>) => {
    if (!obraId) return;
    const maxOrdem = tarefas.filter(t => t.nivel === (partial.nivel ?? 1) && t.parent_tarefa_id === (partial.parent_tarefa_id ?? null)).length;
    const payload = {
      obra_id: obraId,
      nome: partial.nome || 'Nova Tarefa',
      tipo_tarefa: partial.tipo_tarefa ?? 'PADRAO',
      data_inicio: partial.data_inicio ?? null,
      data_fim: partial.data_fim ?? null,
      duracao_dias: partial.duracao_dias ?? 7,
      percentual_concluido: 0,
      status: 'nao_iniciada',
      ordem: maxOrdem + 1,
      nivel: partial.nivel ?? 1,
      parent_tarefa_id: partial.parent_tarefa_id ?? null,
      baseline_locked: false,
      is_critico: false,
      peso_orcamento: 0,
      pode_editar_datas: true,
      orcamento_categoria_id: partial.orcamento_categoria_id ?? null,
      orcamento_composicao_id: partial.orcamento_composicao_id ?? null,
    };
    const { data: row, error } = await (supabase.from('cronograma_tarefas') as any)
      .insert(payload).select().single();
    if (error) { toast({ title: 'Erro ao criar tarefa', description: error.message, variant: 'destructive' }); return; }
    invalidate();
    return row as CronogramaTarefa;
  }, [obraId, tarefas, invalidate]);

  // ─── UPDATE ─────────────────────────────────────────────────────────────────
  const updateTarefa = useCallback(async (id: string, changes: Partial<CronogramaTarefa>) => {
    const { data: row, error } = await (supabase.from('cronograma_tarefas') as any)
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) { toast({ title: 'Erro ao atualizar tarefa', description: error.message, variant: 'destructive' }); return; }
    invalidate();
    return row as CronogramaTarefa;
  }, [invalidate]);

  // ─── DELETE ─────────────────────────────────────────────────────────────────
  const deleteTarefa = useCallback(async (id: string) => {
    await supabase.from('cronograma_tarefas').delete().eq('id', id);
    invalidate();
  }, [invalidate]);

  // ─── BASELINE ───────────────────────────────────────────────────────────────
  const saveBaseline = useCallback(async () => {
    if (!obraId) return;
    const updates = tarefas.map(t => ({
      id: t.id,
      baseline_inicio: t.data_inicio,
      baseline_fim: t.data_fim,
      baseline_locked: true,
    }));
    for (const u of updates) {
      await (supabase.from('cronograma_tarefas') as any).update({
        baseline_inicio: u.baseline_inicio,
        baseline_fim: u.baseline_fim,
        baseline_locked: u.baseline_locked,
      }).eq('id', u.id);
    }
    invalidate();
    toast({ title: '✅ Baseline salvo', description: 'As datas planejadas foram congeladas como referência.' });
  }, [obraId, tarefas, invalidate]);

  const unlockBaseline = useCallback(async (id?: string) => {
    if (!obraId) return;
    if (id) {
      await (supabase.from('cronograma_tarefas') as any).update({ baseline_locked: false }).eq('id', id);
    } else {
      await (supabase.from('cronograma_tarefas') as any).update({ baseline_locked: false }).eq('obra_id', obraId);
      toast({ title: 'Baseline desbloqueado', description: 'Você pode editar as datas planejadas livremente.' });
    }
    invalidate();
  }, [obraId, invalidate]);

  // ─── DEPENDENCIES ───────────────────────────────────────────────────────────
  const addDependencia = useCallback(async (origemId: string, destinoId: string, tipo: TipoDep = 'FS', lagDias = 0) => {
    if (!obraId || origemId === destinoId) return;
    if (dependencias.some(d => d.tarefa_origem_id === origemId && d.tarefa_destino_id === destinoId)) return;
    const { data: row, error } = await (supabase.from('cronograma_dependencias') as any)
      .insert({ obra_id: obraId, tarefa_origem_id: origemId, tarefa_destino_id: destinoId, tipo, lag_dias: lagDias })
      .select().single();
    if (!error && row) invalidate();
  }, [obraId, dependencias, invalidate]);

  const removeDependencia = useCallback(async (id: string) => {
    await supabase.from('cronograma_dependencias').delete().eq('id', id);
    invalidate();
  }, [invalidate]);

  // ─── CASCADE DATE CALCULATION ────────────────────────────────────────────────
  const applyDateCascade = useCallback(async (changedId: string, newStart: string, newEnd: string) => {
    const successors = new Map<string, { destino: string; tipo: TipoDep; lag: number }[]>();
    dependencias.forEach(d => {
      const arr = successors.get(d.tarefa_origem_id) || [];
      arr.push({ destino: d.tarefa_destino_id, tipo: d.tipo, lag: d.lag_dias });
      successors.set(d.tarefa_origem_id, arr);
    });

    const overrides = new Map<string, { start: string; end: string }>();
    overrides.set(changedId, { start: newStart, end: newEnd });
    const queue = [changedId];
    const visited = new Set([changedId]);

    while (queue.length > 0) {
      const srcId = queue.shift()!;
      const srcDates = overrides.get(srcId);
      if (!srcDates) continue;
      for (const { destino, tipo, lag } of (successors.get(srcId) || [])) {
        if (visited.has(destino)) continue;
        visited.add(destino);
        const target = tarefas.find(t => t.id === destino);
        if (!target || !target.data_inicio || !target.data_fim) continue;
        const dur = differenceInDays(parseISO(target.data_fim), parseISO(target.data_inicio));
        let requiredStart: Date;
        if (tipo === 'FS') requiredStart = addDays(parseISO(srcDates.end), 1 + lag);
        else if (tipo === 'SS') requiredStart = addDays(parseISO(srcDates.start), lag);
        else requiredStart = parseISO(target.data_inicio);

        if (requiredStart > parseISO(target.data_inicio)) {
          const ns = format(requiredStart, 'yyyy-MM-dd');
          const ne = format(addDays(requiredStart, dur), 'yyyy-MM-dd');
          overrides.set(destino, { start: ns, end: ne });
          queue.push(destino);
        }
      }
    }

    const updates: { id: string; data_inicio: string; data_fim: string }[] = [];
    overrides.forEach((dates, id) => {
      updates.push({ id, data_inicio: dates.start, data_fim: dates.end });
    });
    for (const u of updates) {
      await (supabase.from('cronograma_tarefas') as any)
        .update({ data_inicio: u.data_inicio, data_fim: u.data_fim, updated_at: new Date().toISOString() })
        .eq('id', u.id);
    }
    invalidate();
  }, [dependencias, tarefas, invalidate]);

  // ─── ADD PERCENTUAL ─────────────────────────────────────────────────────────
  const addPercentual = useCallback(async (tarefaId: string, delta: number): Promise<number> => {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return 0;
    const novoPercent = Math.min(100, Math.max(0, (tarefa.percentual_concluido || 0) + delta));
    const novoStatus: StatusTarefa =
      novoPercent >= 100 ? 'concluida' :
      novoPercent > 0    ? 'em_andamento' :
                           'nao_iniciada';
    await updateTarefa(tarefaId, { percentual_concluido: novoPercent, status: novoStatus });
    return novoPercent;
  }, [tarefas, updateTarefa]);

  // ─── SUMMARY STATS ──────────────────────────────────────────────────────────
  const hoje = new Date();
  const tasksConcluidas = tarefas.filter(t => t.percentual_concluido === 100).length;
  const tasksAtrasadas = tarefas.filter(t => {
    if (t.percentual_concluido === 100) return false;
    if (!t.data_fim) return false;
    return parseISO(t.data_fim) < hoje;
  }).length;
  const progressoGeral = tarefas.length > 0
    ? Math.round(tarefas.reduce((s, t) => s + (t.percentual_concluido || 0), 0) / tarefas.length)
    : 0;
  const hasBaseline = tarefas.some(t => !!t.baseline_inicio);
  const baselineLocked = tarefas.every(t => t.baseline_locked);

  // ─── IMPEDIMENTOS ──────────────────────────────────────────────────────────
  const addImpedimento = useCallback(async (payload: Omit<CronogramaImpedimento, 'id' | 'created_at'>) => {
    const { data: row, error } = await supabase
      .from('cronograma_impedimentos')
      .insert(payload)
      .select()
      .single();
    if (error) { toast({ title: 'Erro ao registrar impedimento', description: error.message, variant: 'destructive' }); return; }
    invalidate();
    return row as CronogramaImpedimento;
  }, [invalidate]);

  const updateImpedimento = useCallback(async (id: string, changes: Partial<CronogramaImpedimento>) => {
    const { data: row, error } = await supabase
      .from('cronograma_impedimentos')
      .update(changes)
      .eq('id', id)
      .select()
      .single();
    if (error) { toast({ title: 'Erro ao atualizar impedimento', description: error.message, variant: 'destructive' }); return; }
    invalidate();
    return row as CronogramaImpedimento;
  }, [invalidate]);

  const deleteImpedimento = useCallback(async (id: string) => {
    await supabase.from('cronograma_impedimentos').delete().eq('id', id);
    invalidate();
  }, [invalidate]);

  return {
    tarefas, dependencias, impedimentos, loading,
    saving: false, // mantido na API por compatibilidade
    addTarefa, updateTarefa, deleteTarefa,
    addDependencia, removeDependencia,
    addImpedimento, updateImpedimento, deleteImpedimento,
    applyDateCascade,
    saveBaseline, unlockBaseline,
    addPercentual,
    refresh: refetch,
    stats: { tasksConcluidas, tasksAtrasadas, progressoGeral, hasBaseline, baselineLocked },
  };
}
