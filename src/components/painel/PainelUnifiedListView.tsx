import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarDays, ListChecks, Wallet, BookOpen } from 'lucide-react';

type EventSource = 'agenda' | 'pendencias' | 'pagamentos' | 'diario';

interface UnifiedEvent {
  id: string;
  date: string;
  title: string;
  source: EventSource;
  subtitle?: string;
  status?: string;
  isOverdue?: boolean;
  value?: number;
  clima?: string;
}

const sourceConfig: Record<EventSource, { label: string; icon: typeof CalendarDays; dot: string; bg: string; text: string }> = {
  agenda: { label: 'Agenda', icon: CalendarDays, dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary' },
  pendencias: { label: 'Pendências', icon: ListChecks, dot: 'bg-warning', bg: 'bg-warning/10', text: 'text-warning' },
  pagamentos: { label: 'Pagamentos', icon: Wallet, dot: 'bg-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-600' },
  diario: { label: 'Diário', icon: BookOpen, dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-700' },
};

const climaIcons: Record<string, string> = { sol: '☀️', nublado: '⛅', chuva: '🌧️', chuvoso_forte: '⛈️' };

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface Props {
  obraId: string;
  activeSources: Set<EventSource>;
}

export default function PainelUnifiedListView({ obraId, activeSources }: Props) {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const today = startOfDay(new Date());

  const fetchEvents = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const all: UnifiedEvent[] = [];
    const promises: Promise<void>[] = [];

    if (activeSources.has('agenda')) {
      promises.push(
        supabase.from('obra_agenda').select('id, titulo, data_programada, status, responsavel')
          .eq('obra_id', obraId).then(({ data }: any) => {
            (data || []).forEach((i: any) => {
              const isOverdue = i.status !== 'concluido' && i.status !== 'cancelado' && isBefore(parseISO(i.data_programada), today);
              all.push({ id: i.id, date: i.data_programada, title: i.titulo, source: 'agenda', status: i.status, isOverdue, subtitle: i.responsavel });
            });
          })
      );
    }
    if (activeSources.has('pendencias')) {
      promises.push(
        supabase.from('pendencias').select('id, titulo, data_limite, status, prioridade')
          .eq('obra_id', obraId).then(({ data }: any) => {
            (data || []).forEach((i: any) => {
              if (!i.data_limite) return;
              const isOverdue = i.status !== 'resolvida' && isBefore(parseISO(i.data_limite), today);
              all.push({ id: i.id, date: i.data_limite, title: i.titulo, source: 'pendencias', status: i.status, isOverdue, subtitle: i.prioridade });
            });
          })
      );
    }
    if (activeSources.has('pagamentos')) {
      promises.push(
        supabase.from('pagamentos').select('id, descricao, data_vencimento, status, valor_previsto, fornecedor')
          .eq('obra_id', obraId).then(({ data }: any) => {
            (data || []).forEach((i: any) => {
              if (!i.data_vencimento) return;
              const isOverdue = i.status === 'atrasado' || (i.status === 'previsto' && isBefore(parseISO(i.data_vencimento), today));
              all.push({ id: i.id, date: i.data_vencimento, title: i.descricao, source: 'pagamentos', status: i.status, isOverdue, value: Number(i.valor_previsto), subtitle: i.fornecedor });
            });
          })
      );
    }
    if (activeSources.has('diario')) {
      promises.push(
        supabase.from('diario_registros').select('id, data, clima, servicos_executados, usuario_nome')
          .eq('obra_id', obraId).then(({ data }: any) => {
            (data || []).forEach((i: any) => {
              const title = i.servicos_executados ? (i.servicos_executados.length > 60 ? i.servicos_executados.slice(0, 60) + '…' : i.servicos_executados) : 'Registro de diário';
              all.push({ id: i.id, date: i.data, title, source: 'diario', clima: i.clima, subtitle: i.usuario_nome });
            });
          })
      );
    }

    await Promise.all(promises);
    setEvents(all);
    setLoading(false);
  }, [obraId, activeSources]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const grouped = useMemo(() => {
    const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
    const map: Record<string, UnifiedEvent[]> = {};
    sorted.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return Object.entries(map);
  }, [events]);

  if (loading) return <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>;
  if (grouped.length === 0) return <div className="text-center py-12 text-sm text-muted-foreground">Nenhum evento encontrado.</div>;

  return (
    <div className="space-y-4">
      {grouped.map(([date, dayEvents]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
            <div className="h-px bg-border flex-1" />
            <span className="text-[10px] text-muted-foreground">{dayEvents.length} itens</span>
          </div>

          <div className="relative ml-[7px] border-l-2 border-border pl-5 space-y-1">
            {dayEvents.map(e => {
              const cfg = sourceConfig[e.source];
              const Icon = cfg.icon;
              return (
                <div key={`${e.source}-${e.id}`} className="relative group">
                  <div className={cn('absolute -left-[25px] top-2.5 w-3 h-3 rounded-full border-2 border-background', cfg.dot)} />
                  <Card className={cn(
                    'p-2.5 transition-colors hover:bg-muted/50 border-l-2',
                    e.isOverdue ? 'bg-destructive/5 border-l-destructive' : cn(cfg.bg, 'border-l-transparent'),
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <p className="text-sm font-medium truncate">{e.title}</p>
                        </div>
                        {e.subtitle && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 ml-5">{e.subtitle}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {e.clima && climaIcons[e.clima] && <span className="text-xs">{climaIcons[e.clima]}</span>}
                        {e.value != null && (
                          <span className="text-xs font-mono font-medium">{formatCurrency(e.value)}</span>
                        )}
                        <Badge variant="outline" className={cn('text-[9px] gap-0.5', cfg.text)}>
                          {cfg.label}
                        </Badge>
                        {e.isOverdue && <Badge variant="destructive" className="text-[9px]">Atrasado</Badge>}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
