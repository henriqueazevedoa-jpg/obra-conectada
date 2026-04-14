import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths,
  subMonths, isSameDay, isToday, parseISO, isBefore, startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, CalendarDays, ListChecks, Wallet, BookOpen, Calendar,
} from 'lucide-react';

/* ── Types ── */
export type CalendarEventSource = 'agenda' | 'pendencias' | 'pagamentos' | 'diario';

export interface CalendarEvent {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  source: CalendarEventSource;
  status?: string;
  isOverdue?: boolean;
  clima?: string;
}

const climaIcons: Record<string, string> = {
  sol: '☀️',
  nublado: '⛅',
  chuva: '🌧️',
  chuvoso_forte: '⛈️',
};

const sourceLabels: Record<CalendarEventSource, string> = {
  agenda: 'Agenda', pendencias: 'Pendências', pagamentos: 'Pagamentos', diario: 'Diário',
};

const sourceColors: Record<CalendarEventSource, string> = {
  agenda: 'bg-primary text-primary-foreground',
  pendencias: 'bg-warning text-warning-foreground',
  pagamentos: 'bg-accent text-accent-foreground',
  diario: 'bg-success text-success-foreground',
};

const sourceDotColors: Record<CalendarEventSource, string> = {
  agenda: 'bg-primary',
  pendencias: 'bg-warning',
  pagamentos: 'bg-violet-500',
  diario: 'bg-success',
};

const sourceIcons: Record<CalendarEventSource, React.ReactNode> = {
  agenda: <CalendarDays className="h-3 w-3" />,
  pendencias: <ListChecks className="h-3 w-3" />,
  pagamentos: <Wallet className="h-3 w-3" />,
  diario: <BookOpen className="h-3 w-3" />,
};

interface Props {
  obraId: string;
  /** Which sources to show filter toggles for */
  sources?: CalendarEventSource[];
  /** External events (e.g. from parent that already fetched them) */
  externalEvents?: CalendarEvent[];
  /** If true, fetch all sources from DB. If false, only use externalEvents */
  fetchFromDb?: boolean;
  compact?: boolean;
  /** When true, renders without Card wrapper, title, and internal filters */
  embedded?: boolean;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ObraCalendarView({
  obraId,
  sources = ['agenda', 'pendencias', 'pagamentos', 'diario'],
  externalEvents,
  fetchFromDb = true,
  compact = false,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeSources, setActiveSources] = useState<Set<CalendarEventSource>>(new Set(sources));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = startOfDay(new Date());

  const fetchEvents = useCallback(async () => {
    if (!fetchFromDb || !obraId) return;
    setLoading(true);
    const allEvents: CalendarEvent[] = [];

    const promises: Promise<void>[] = [];

    if (sources.includes('agenda')) {
      promises.push(
        supabase.from('obra_agenda').select('id, titulo, data_programada, status')
          .eq('obra_id', obraId)
          .then(({ data }: any) => {
            (data || []).forEach((item: any) => {
              const isOverdue = item.status !== 'concluido' && item.status !== 'cancelado' &&
                isBefore(parseISO(item.data_programada), today);
              allEvents.push({
                id: item.id, date: item.data_programada, title: item.titulo,
                source: 'agenda', status: item.status, isOverdue,
              });
            });
          })
      );
    }

    if (sources.includes('pendencias')) {
      promises.push(
        supabase.from('pendencias').select('id, titulo, data_limite, status')
          .eq('obra_id', obraId)
          .then(({ data }: any) => {
            (data || []).forEach((item: any) => {
              if (!item.data_limite) return;
              const isOverdue = item.status !== 'resolvida' && isBefore(parseISO(item.data_limite), today);
              allEvents.push({
                id: item.id, date: item.data_limite, title: item.titulo,
                source: 'pendencias', status: item.status, isOverdue,
              });
            });
          })
      );
    }

    if (sources.includes('pagamentos')) {
      promises.push(
        supabase.from('pagamentos').select('id, descricao, data_vencimento, status')
          .eq('obra_id', obraId)
          .then(({ data }: any) => {
            (data || []).forEach((item: any) => {
              if (!item.data_vencimento) return;
              const isOverdue = (item.status === 'atrasado') ||
                (item.status === 'previsto' && isBefore(parseISO(item.data_vencimento), today));
              allEvents.push({
                id: item.id, date: item.data_vencimento, title: item.descricao,
                source: 'pagamentos', status: item.status, isOverdue,
              });
            });
          })
      );
    }

    if (sources.includes('diario')) {
      promises.push(
        supabase.from('diario_registros').select('id, data, clima, servicos_executados, status, created_at')
          .eq('obra_id', obraId)
          .order('created_at', { ascending: true })
          .then(({ data }: any) => {
            // Keep only the first diary per day (for clima icon)
            const seenDays = new Set<string>();
            (data || []).forEach((item: any) => {
              const title = item.servicos_executados
                ? (item.servicos_executados.length > 60 ? item.servicos_executados.slice(0, 60) + '…' : item.servicos_executados)
                : 'Registro de diário';
              const isFirstOfDay = !seenDays.has(item.data);
              if (isFirstOfDay) seenDays.add(item.data);
              allEvents.push({
                id: item.id, date: item.data, title,
                source: 'diario', status: item.status,
                clima: isFirstOfDay ? item.clima : undefined,
              });
            });
          })
      );
    }

    await Promise.all(promises);
    setEvents(allEvents);
    setLoading(false);
  }, [obraId, fetchFromDb, sources]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const allEvents = useMemo(() => {
    const combined = [...events, ...(externalEvents || [])];
    return combined.filter(e => activeSources.has(e.source));
  }, [events, externalEvents, activeSources]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sunday

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    allEvents.forEach(e => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [allEvents]);

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) || []) : [];

  const toggleSource = (s: CalendarEventSource) => {
    setActiveSources(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className={cn("flex items-center gap-2", compact ? "text-sm" : "text-base")}>
            <Calendar className="h-4 w-4" /> Calendário da Obra
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Source filters */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sources.map(s => (
            <button
              key={s}
              onClick={() => toggleSource(s)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all border",
                activeSources.has(s)
                  ? "border-transparent " + sourceColors[s]
                  : "border-border text-muted-foreground bg-transparent opacity-50"
              )}
            >
              {sourceIcons[s]}
              {sourceLabels[s]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Weekday header */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for padding */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[40px] sm:min-h-[56px]" />
          ))}
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) || [];
            const isSelected = selectedDay === key;
            const isTodayDay = isToday(day);
            const hasOverdue = dayEvents.some(e => e.isOverdue);

            // Group dots by source (max 1 dot per source)
            const dotSources = [...new Set(dayEvents.map(e => e.source))];
            // Get clima from the first diario event of the day
            const dayClima = dayEvents.find(e => e.source === 'diario' && e.clima)?.clima;

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={cn(
                  "min-h-[40px] sm:min-h-[56px] p-0.5 border border-transparent rounded-md transition-colors relative flex flex-col items-center",
                  isSelected && "bg-primary/10 border-primary/30",
                  !isSelected && dayEvents.length > 0 && "hover:bg-muted/50",
                  isTodayDay && !isSelected && "bg-accent/20",
                )}
              >
                <div className="flex items-center gap-0.5">
                  <span className={cn(
                    "text-xs font-medium leading-tight",
                    isTodayDay && "text-primary font-bold",
                    hasOverdue && "text-destructive",
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayClima && climaIcons[dayClima] && (
                    <span className="text-[10px] leading-none" title={dayClima}>
                      {climaIcons[dayClima]}
                    </span>
                  )}
                </div>
                {/* Dots */}
                {dotSources.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dotSources.slice(0, 4).map(s => (
                      <div key={s} className={cn("h-1.5 w-1.5 rounded-full", sourceDotColors[s])} />
                    ))}
                  </div>
                )}
                {/* Count badge on mobile */}
                {dayEvents.length > 0 && (
                  <span className="text-[8px] text-muted-foreground mt-auto hidden sm:block">
                    {dayEvents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="mt-3 border-t pt-3 space-y-1.5 max-h-[200px] overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {format(parseISO(selectedDay), "dd 'de' MMMM", { locale: ptBR })} — {selectedEvents.length} {selectedEvents.length === 1 ? 'evento' : 'eventos'}
            </p>
            {selectedEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum evento neste dia.</p>
            )}
            {selectedEvents.map(e => (
              <div
                key={`${e.source}-${e.id}`}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md text-xs",
                  e.isOverdue ? "bg-destructive/5 border border-destructive/20" : "bg-muted/30"
                )}
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", sourceDotColors[e.source])} />
                <span className="flex-1 truncate">{e.title}</span>
                <Badge variant="outline" className="text-[9px] shrink-0 gap-0.5">
                  {sourceIcons[e.source]}
                  {sourceLabels[e.source]}
                </Badge>
                {e.isOverdue && (
                  <Badge variant="destructive" className="text-[9px]">Atrasado</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-4 text-xs text-muted-foreground">Carregando eventos...</div>
        )}
      </CardContent>
    </Card>
  );
}
