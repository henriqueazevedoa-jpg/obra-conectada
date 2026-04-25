import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { parseISO, format, eachMonthOfInterval, endOfMonth, startOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FluxoMensal {
  mes: string;           // 'Jan/25', 'Fev/25'...
  mesKey: string;        // '2025-01'
  previsto: number;
  realizado: number;
  acumuladoPrevisto: number;
  acumuladoRealizado: number;
}

interface TarefaFluxo {
  data_inicio: string | null;
  data_fim: string | null;
  peso_orcamento: number;
  orcamento_categoria_id?: string | null;
}

// ── Helper: linear distribution across months ─────────────────────────────────

function distribuirMensalmente(
  tarefas: TarefaFluxo[],
  pagamentos: { data_pagamento: string; valor: number }[],
): FluxoMensal[] {
  if (tarefas.length === 0) return [];

  // Determinar range de datas
  const datasInicio = tarefas.filter(t => t.data_inicio).map(t => parseISO(t.data_inicio!));
  const datasFim = tarefas.filter(t => t.data_fim).map(t => parseISO(t.data_fim!));

  if (datasInicio.length === 0 || datasFim.length === 0) return [];

  const minDate = new Date(Math.min(...datasInicio.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...datasFim.map(d => d.getTime())));

  // Extender range para cobrir pagamentos
  const datasPagemento = pagamentos.filter(p => p.data_pagamento).map(p => parseISO(p.data_pagamento));
  const allDates = [...datasInicio, ...datasFim, ...datasPagemento];
  const globalMin = new Date(Math.min(...allDates.map(d => d.getTime())));
  const globalMax = new Date(Math.max(...allDates.map(d => d.getTime())));

  const meses = eachMonthOfInterval({ start: startOfMonth(globalMin), end: endOfMonth(globalMax) });

  // Calcular previsto total (soma dos pesos × 1 para normalizar)
  const totalPeso = tarefas.reduce((sum, t) => sum + (t.peso_orcamento || 0), 0);

  const previstoByMes: Record<string, number> = {};
  const realizadoByMes: Record<string, number> = {};

  meses.forEach(m => {
    previstoByMes[format(m, 'yyyy-MM')] = 0;
    realizadoByMes[format(m, 'yyyy-MM')] = 0;
  });

  // Distribuir previsto linearmente
  tarefas.forEach(t => {
    if (!t.data_inicio || !t.data_fim || !t.peso_orcamento) return;

    const inicio = parseISO(t.data_inicio);
    const fim = parseISO(t.data_fim);
    const diasTotal = Math.max(1, (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const valorTarefa = totalPeso > 0 ? t.peso_orcamento : (1 / tarefas.length);

    meses.forEach(mes => {
      const mesInicio = startOfMonth(mes);
      const mesFim = endOfMonth(mes);

      // Intersecção da tarefa com o mês
      const overlapStart = new Date(Math.max(inicio.getTime(), mesInicio.getTime()));
      const overlapEnd = new Date(Math.min(fim.getTime(), mesFim.getTime()));

      if (overlapStart <= overlapEnd) {
        const diasMes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
        const proporcao = diasMes / diasTotal;
        const mesKey = format(mes, 'yyyy-MM');
        previstoByMes[mesKey] = (previstoByMes[mesKey] || 0) + valorTarefa * proporcao;
      }
    });
  });

  // Agrupar realizado por mês
  pagamentos.forEach(p => {
    if (!p.data_pagamento) return;
    const mesKey = format(parseISO(p.data_pagamento), 'yyyy-MM');
    if (realizadoByMes[mesKey] !== undefined) {
      realizadoByMes[mesKey] += p.valor;
    }
  });

  // Montar resultado com acumulados
  let accPrevisto = 0;
  let accRealizado = 0;

  return meses.map(mes => {
    const mesKey = format(mes, 'yyyy-MM');
    const previsto = previstoByMes[mesKey] || 0;
    const realizado = realizadoByMes[mesKey] || 0;
    accPrevisto += previsto;
    accRealizado += realizado;

    return {
      mes: format(mes, 'MMM/yy', { locale: ptBR }),
      mesKey,
      previsto,
      realizado,
      acumuladoPrevisto: accPrevisto,
      acumuladoRealizado: accRealizado,
    };
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useFluxoCaixaProjetado(obraId: string | null) {
  const { data: tarefasData = [] } = useQuery<TarefaFluxo[]>({
    queryKey: ['fluxo_tarefas', obraId],
    enabled: !!obraId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cronograma_tarefas')
        .select('data_inicio, data_fim, peso_orcamento, orcamento_categoria_id')
        .eq('obra_id', obraId)
        .eq('tipo_tarefa', 'PADRAO');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pagamentosData = [] } = useQuery<{ data_pagamento: string; valor: number }[]>({
    queryKey: ['fluxo_pagamentos', obraId],
    enabled: !!obraId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pagamentos')
        .select('data_pagamento, valor_pago, valor_previsto')
        .eq('obra_id', obraId)
        .not('data_pagamento', 'is', null);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        data_pagamento: p.data_pagamento,
        valor: p.valor_pago ?? p.valor_previsto ?? 0,
      }));
    },
  });

  const fluxo = useMemo(
    () => distribuirMensalmente(tarefasData, pagamentosData),
    [tarefasData, pagamentosData],
  );

  const temDadosRealizados = useMemo(
    () => pagamentosData.length > 0,
    [pagamentosData],
  );

  return { fluxo, temDadosRealizados };
}
