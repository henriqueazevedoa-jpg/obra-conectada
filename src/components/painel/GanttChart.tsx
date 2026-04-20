import { useMemo } from 'react';
import { OrcamentoEtapa } from '@/contexts/OrcamentoContext';
import { parseISO, differenceInDays, isBefore, isAfter, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GanttChartProps {
  etapas: OrcamentoEtapa[];
}

function computeStatus(cat: OrcamentoEtapa): string {
  if (cat.statusCronograma) return cat.statusCronograma;
  if ((cat.percentualCronograma ?? 0) >= 100) return 'concluida';
  if (cat.dataInicioReal) {
    if (cat.dataFimPrevista && !cat.dataFimReal && isAfter(new Date(), parseISO(cat.dataFimPrevista))) return 'atrasada';
    return 'em_andamento';
  }
  if (cat.dataFimPrevista && isAfter(new Date(), parseISO(cat.dataFimPrevista))) return 'atrasada';
  return 'nao_iniciada';
}

function computePercentual(cat: OrcamentoEtapa): number {
  if (cat.percentualCronograma != null) return cat.percentualCronograma;
  if (!cat.usaComposicoes || cat.composicoes.length === 0) return 0;
  const totalPeso = cat.composicoes.reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
  if (totalPeso === 0) {
    const done = cat.composicoes.filter(c => c.concluida).length;
    return Math.round((done / cat.composicoes.length) * 100);
  }
  const doneW = cat.composicoes.filter(c => c.concluida).reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
  return Math.round((doneW / totalPeso) * 100);
}

const statusLabels: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
};

export default function GanttChart({ etapas }: GanttChartProps) {
  const { minDate, maxDate, totalDays, months } = useMemo(() => {
    const allDates = etapas.flatMap(c =>
      [c.dataInicioPrevista, c.dataFimPrevista, c.dataInicioReal, c.dataFimReal].filter(Boolean) as string[]
    );
    if (allDates.length === 0) return { minDate: null, maxDate: null, totalDays: 0, months: [] };

    const sorted = allDates.sort();
    const min = parseISO(sorted[0]);
    const max = parseISO(sorted[sorted.length - 1]);
    const days = Math.max(differenceInDays(max, min) + 1, 1);

    const ms: { label: string; left: string }[] = [];
    const cur = new Date(min);
    cur.setDate(1);
    let safety = 0;
    while ((isBefore(cur, max) || cur.getMonth() === max.getMonth()) && safety < 36) {
      const offset = differenceInDays(cur, min);
      if (offset >= 0) {
        ms.push({ label: format(cur, 'MMM yy', { locale: ptBR }), left: `${(offset / days) * 100}%` });
      }
      cur.setMonth(cur.getMonth() + 1);
      safety++;
    }

    return { minDate: min, maxDate: max, totalDays: days, months: ms };
  }, [etapas]);

  if (!minDate || totalDays === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma data definida para exibir o Gantt.</div>;
  }

  const getBar = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const s = parseISO(start);
    const e = parseISO(end);
    const left = (differenceInDays(s, minDate) / totalDays) * 100;
    const width = Math.max(((differenceInDays(e, s) + 1) / totalDays) * 100, 1);
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-0.5">
        {/* Month headers */}
        <div className="relative h-6 border-b border-border ml-[180px] lg:ml-[220px]">
          {months.map((m, i) => (
            <span key={i} className="absolute text-[9px] text-muted-foreground top-0 whitespace-nowrap" style={{ left: m.left }}>{m.label}</span>
          ))}
        </div>

        {etapas.map(cat => {
          const prevBar = getBar(cat.dataInicioPrevista, cat.dataFimPrevista);
          const realEnd = cat.dataFimReal || (cat.dataInicioReal ? format(new Date(), 'yyyy-MM-dd') : undefined);
          const realBar = getBar(cat.dataInicioReal, realEnd);
          const status = computeStatus(cat);
          const pct = computePercentual(cat);

          const tooltipContent = (
            <div className="space-y-1 text-xs">
              <p className="font-medium">{cat.nome}</p>
              <p>Status: {statusLabels[status] || status}</p>
              <p>Progresso: {pct}%</p>
              {cat.dataInicioPrevista && <p>Previsto: {format(parseISO(cat.dataInicioPrevista), 'dd/MM/yy')} → {cat.dataFimPrevista ? format(parseISO(cat.dataFimPrevista), 'dd/MM/yy') : '—'}</p>}
              {cat.dataInicioReal && <p>Real: {format(parseISO(cat.dataInicioReal), 'dd/MM/yy')} → {cat.dataFimReal ? format(parseISO(cat.dataFimReal), 'dd/MM/yy') : 'em andamento'}</p>}
            </div>
          );

          return (
            <Tooltip key={cat.id}>
              <TooltipTrigger asChild>
                <div className="flex items-center h-10 group hover:bg-muted/30 cursor-default">
                  <div className="w-[180px] lg:w-[220px] shrink-0 pr-2 truncate text-xs font-medium text-foreground" title={cat.nome}>
                    {cat.nome}
                  </div>
                  <div className="flex-1 relative h-full">
                    {prevBar && (
                      <div className="absolute top-1 h-3 rounded-sm bg-primary/20 border border-primary/30" style={prevBar} />
                    )}
                    {realBar && (
                      <div
                        className={cn(
                          "absolute top-5 h-3 rounded-sm",
                          status === 'concluida' ? 'bg-success/60' :
                          status === 'atrasada' ? 'bg-destructive/60' :
                          status === 'nao_iniciada' ? 'bg-muted-foreground/30' :
                          'bg-primary/60'
                        )}
                        style={realBar}
                      />
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-4 ml-[180px] lg:ml-[220px] pt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary/20 border border-primary/30 inline-block" /> Previsto</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary/60 inline-block" /> Em andamento</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-success/60 inline-block" /> Concluído</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-destructive/60 inline-block" /> Atrasado</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
