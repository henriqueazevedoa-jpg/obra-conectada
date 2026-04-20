import { useMemo, useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/data/mockData';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PagamentoItem {
  id: string;
  descricao: string;
  valor_previsto: number;
  data_vencimento: string;
  status: string;
  fornecedor: string | null;
  realStatus: string;
  grupo_parcelas_id?: string | null;
}

const statusColors: Record<string, string> = {
  pago: 'bg-success',
  previsto: 'bg-primary',
  atrasado: 'bg-destructive',
  proximo: 'bg-amber-500',
};

const statusLabels: Record<string, string> = {
  pago: 'Pago',
  previsto: 'Previsto',
  atrasado: 'Atrasado',
  proximo: 'Próx. 7 dias',
};

function getRealStatus(status: string, dataVencimento: string): string {
  if (status === 'pago' || status === 'atrasado' || status === 'cancelado') return status;
  try {
    const hoje = new Date();
    const d = new Date(dataVencimento);
    const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 7) return 'proximo';
  } catch { /* ignore */ }
  return status;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Props {
  items: PagamentoItem[];
  onItemClick?: (id: string) => void;
}

export default function PagamentosCalendarView({ items, onItemClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const withDates = items.filter(p => p.data_vencimento);
    if (withDates.length > 0) {
      return startOfMonth(parseISO(withDates[0].data_vencimento));
    }
    return startOfMonth(new Date());
  });

  const byDate = useMemo(() => {
    const map: Record<string, PagamentoItem[]> = {};
    items.forEach(p => {
      if (!p.data_vencimento) return;
      const key = p.data_vencimento.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [items]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startPadding = getDay(days[0]); // 0=Sun

  const monthTotal = useMemo(() => {
    return items
      .filter(p => p.data_vencimento && isSameMonth(parseISO(p.data_vencimento), currentMonth))
      .reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);
  }, [items, currentMonth]);

  // Sprint 1: meses com vencidos para destaque no cabeçalho
  const hasOverdueInMonth = useMemo(() => {
    return items.some(p =>
      p.data_vencimento &&
      isSameMonth(parseISO(p.data_vencimento), currentMonth) &&
      (p.realStatus === 'atrasado' || p.status === 'atrasado')
    );
  }, [items, currentMonth]);

  const today = new Date();

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className={cn(
              'text-sm font-semibold capitalize',
              hasOverdueInMonth ? 'text-destructive' : 'text-foreground'
            )}>
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              {hasOverdueInMonth && <span className="ml-1.5 text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">Vencidos</span>}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">{formatCurrency(monthTotal)}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Empty cells for padding */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="bg-card min-h-[60px] p-1" />
          ))}

          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayItems = byDate[key] || [];
            const isToday = isSameDay(day, today);
            const dayTotal = dayItems.reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);

            return (
              <div
                key={key}
                className={`bg-card min-h-[60px] p-1 relative ${isToday ? 'ring-1 ring-primary ring-inset' : ''}`}
              >
                <span className={`text-[10px] font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </span>

                {dayItems.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {dayItems.slice(0, 2).map(p => {
                      const s = getRealStatus(p.realStatus || p.status, p.data_vencimento);
                      return (
                        <Tooltip key={p.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(`flex items-center gap-0.5 rounded px-0.5 py-px ${statusColors[s]}/10`,
                                onItemClick && 'cursor-pointer hover:opacity-80'
                              )}
                              onClick={() => onItemClick?.(p.id)}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColors[s]}`} />
                              <span className="text-[8px] text-foreground truncate leading-tight">{p.descricao}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-[200px]">
                            <p className="font-medium">{p.descricao}</p>
                            <p>{formatCurrency(Number(p.valor_previsto))} · {statusLabels[s] || s}</p>
                            {p.fornecedor && <p className="text-muted-foreground">{p.fornecedor}</p>}
                            {onItemClick && <p className="text-primary">Clique para editar</p>}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {dayItems.length > 2 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[8px] text-muted-foreground cursor-default">+{dayItems.length - 2} mais</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[220px] space-y-1">
                          {dayItems.slice(2).map(p => (
                            <div key={p.id}>
                              <p className="font-medium">{p.descricao}</p>
                              <p>{formatCurrency(Number(p.valor_previsto))} · {statusLabels[p.realStatus]}</p>
                            </div>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}

                {dayTotal > 0 && (
                  <p className="text-[7px] font-mono text-muted-foreground absolute bottom-0.5 right-1">
                    {formatCurrency(dayTotal)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 pt-1 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Previsto</div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-success" /> Pago</div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Próx. 7 dias</div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-destructive" /> Atrasado</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
