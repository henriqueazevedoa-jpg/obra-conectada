import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { format, parseISO, eachWeekOfInterval, addDays, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CronogramaTarefa } from '@/hooks/useCronograma';
import { cn } from '@/lib/utils';

interface CurvaSProps {
  tarefas: CronogramaTarefa[];
}

function formatCurrencyShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(Math.round(v));
}

export default function CurvaS({ tarefas }: CurvaSProps) {
  const data = useMemo(() => {
    const tasksWithDates = tarefas.filter(
      t => t.data_inicio && t.data_fim && (t.peso_orcamento > 0 || t.percentual_concluido > 0)
    );

    if (tasksWithDates.length === 0) return [];

    const starts = tasksWithDates.map(t => parseISO(t.data_inicio!));
    const ends = tasksWithDates.map(t => parseISO(t.data_fim!));
    const projectStart = starts.reduce((a, b) => isBefore(a, b) ? a : b);
    const projectEnd = ends.reduce((a, b) => isAfter(a, b) ? a : b);

    const totalPeso = tasksWithDates.reduce((s, t) => s + (t.peso_orcamento || 1), 0);

    const weeks = eachWeekOfInterval({ start: projectStart, end: addDays(projectEnd, 7) }, { weekStartsOn: 1 });

    let plannedAcc = 0;
    let realAcc = 0;

    // Build baseline curve (from baseline dates if available, else planned dates)
    return weeks.map((weekStart, idx) => {
      const weekEnd = addDays(weekStart, 6);
      const label = format(weekStart, "dd/MM", { locale: ptBR });

      // Planned: tasks that SHOULD be done by weekEnd according to plan
      let plannedWeight = 0;
      let realWeight = 0;

      for (const t of tasksWithDates) {
        const tStart = parseISO(t.data_inicio!);
        const tEnd = parseISO(t.data_fim!);
        const peso = t.peso_orcamento || 1;

        // Planned progress at this week
        if (!isAfter(tStart, weekEnd)) {
          const totalDays = Math.max(1, (tEnd.getTime() - tStart.getTime()) / 86400000);
          const elapsedDays = Math.min(totalDays, Math.max(0, (weekEnd.getTime() - tStart.getTime()) / 86400000));
          plannedWeight += (elapsedDays / totalDays) * peso;
        }

        // Real progress (% concluído × peso) - Simulação histórica para a curva
        if (t.percentual_concluido > 0 && !isAfter(tStart, weekEnd)) {
          // Dias decorridos desde o início até a semana atual
          const elapsedToWeek = Math.max(0, (weekEnd.getTime() - tStart.getTime()) / 86400000);
          
          // Dias decorridos desde o início até HOJE (ou data de fim se terminou antes)
          const todayDate = new Date();
          const referenceEnd = isBefore(todayDate, tEnd) ? todayDate : tEnd;
          const elapsedToToday = Math.max(1, (referenceEnd.getTime() - tStart.getTime()) / 86400000);
          
          // Progresso histórico estimado (linear)
          const estimatedRealPct = Math.min(
            t.percentual_concluido / 100, // não pode passar do atual
            (elapsedToWeek / elapsedToToday) * (t.percentual_concluido / 100)
          );
          
          realWeight += estimatedRealPct * peso;
        }
      }

      plannedAcc = Math.min(100, (plannedWeight / totalPeso) * 100);

      // Real only up to today
      const today = new Date();
      const showReal = !isAfter(weekStart, today);
      if (showReal) {
        realAcc = Math.min(100, (realWeight / totalPeso) * 100);
      }

      return {
        semana: label,
        planejado: parseFloat(plannedAcc.toFixed(1)),
        real: showReal ? parseFloat(realAcc.toFixed(1)) : null,
        weekStart,
      };
    });
  }, [tarefas]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
        <p className="text-xs">Adicione tarefas com datas e pesos de orçamento para visualizar a Curva S.</p>
      </div>
    );
  }

  // Detect divergence (real vs planejado gap)
  const today = new Date();
  const currentWeek = data.findLast(d => !isAfter(d.weekStart, today));
  const gap = currentWeek ? (currentWeek.real ?? 0) - currentWeek.planejado : 0;
  const statusGap = gap >= 0 ? 'adiantado' : gap > -10 ? 'leve atraso' : 'atraso crítico';
  const gapColor = gap >= 0 ? 'text-emerald-600' : gap > -10 ? 'text-amber-600' : 'text-red-600';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
        <p className="font-semibold text-foreground">Semana de {label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name === 'planejado' ? 'Planejado' : 'Realizado'}:</span>
            <span className="font-medium">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <div className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", 
          gap >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : gap > -10 ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-red-50 border-red-200 text-red-700"
        )}>
          {gap >= 0 ? '↑' : '↓'} {Math.abs(gap).toFixed(1)}% — {statusGap}
        </div>
        {currentWeek && (
          <span className="text-[10px] text-muted-foreground">
            Realizado: <strong>{(currentWeek.real ?? 0).toFixed(1)}%</strong> · Planejado: <strong>{currentWeek.planejado.toFixed(1)}%</strong>
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPlanejado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="semana"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={Math.ceil(data.length / 6)}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              ticks={[0, 25, 50, 75, 100]}
            />
            <RechartTooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="planejado"
              name="planejado"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#gradPlanejado)"
              strokeDasharray="5 3"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="real"
              name="real"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#gradReal)"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-dashed border-primary" />
          <span className="text-[11px] text-muted-foreground">Planejado (Baseline)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-emerald-500" />
          <span className="text-[11px] text-muted-foreground">Realizado</span>
        </div>
      </div>
    </div>
  );
}
