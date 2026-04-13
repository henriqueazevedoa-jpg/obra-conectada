import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/data/mockData';
import { CalendarDays, BarChart3, List, Calendar } from 'lucide-react';
import PagamentosCalendarView from './PagamentosCalendarView';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pagamento {
  id: string;
  descricao: string;
  valor_previsto: number;
  data_vencimento: string;
  status: string;
  fornecedor: string | null;
}

interface Props {
  obraId: string;
}

const statusColors: Record<string, string> = {
  pago: 'bg-success/10 text-success border-0',
  previsto: 'bg-primary/10 text-primary border-0',
  atrasado: 'bg-destructive/10 text-destructive border-0',
};

const statusLabels: Record<string, string> = {
  pago: 'Pago',
  previsto: 'Previsto',
  atrasado: 'Atrasado',
};

type StatusFilter = 'todos' | 'pago' | 'atrasado' | 'previsto';

export default function CronogramaPagamentos({ obraId }: Props) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [viewMode, setViewMode] = useState<'list' | 'gantt' | 'calendar'>('list');

  useEffect(() => {
    if (!obraId) return;
    supabase
      .from('pagamentos')
      .select('id, descricao, valor_previsto, data_vencimento, status, fornecedor')
      .eq('obra_id', obraId)
      .order('data_vencimento', { ascending: true })
      .then(({ data }: any) => {
        if (data) setPagamentos(data as Pagamento[]);
      });
  }, [obraId]);

  const today = new Date().toISOString().slice(0, 10);
  const items = useMemo(() => {
    return pagamentos.map(p => {
      const realStatus =
        p.status === 'pago' ? 'pago' :
        (p.data_vencimento && p.data_vencimento < today) ? 'atrasado' : 'previsto';
      return { ...p, realStatus };
    });
  }, [pagamentos, today]);

  const filtered = useMemo(() => {
    if (statusFilter === 'todos') return items;
    return items.filter(p => p.realStatus === statusFilter);
  }, [items, statusFilter]);

  // Group by month
  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach(p => {
      const key = p.data_vencimento ? format(parseISO(p.data_vencimento), 'yyyy-MM') : 'sem-data';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const totalPrevisto = items.reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);
  const totalPago = items.filter(p => p.realStatus === 'pago').reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);
  const totalAtrasado = items.filter(p => p.realStatus === 'atrasado').reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);

  // Gantt data
  const ganttData = useMemo(() => {
    if (filtered.length === 0) return null;
    const dates = filtered.filter(p => p.data_vencimento).map(p => parseISO(p.data_vencimento));
    if (dates.length === 0) return null;
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const totalDays = Math.max(differenceInDays(maxDate, minDate), 1);
    return { minDate, maxDate, totalDays };
  }, [filtered]);

  if (items.length === 0) return null;

  const filterButtons: { label: string; value: StatusFilter }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Previsto', value: 'previsto' },
    { label: 'Pago', value: 'pago' },
    { label: 'Atrasado', value: 'atrasado' },
  ];

  return (
    <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid" data-print-section="cronogramaPagamentos">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Cronograma de Pagamentos
          </CardTitle>
          <div className="flex items-center gap-2 print:hidden">
            {/* Status filters */}
            <div className="flex gap-1">
              {filterButtons.map(fb => (
                <Button
                  key={fb.value}
                  variant={statusFilter === fb.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter(fb.value)}
                >
                  {fb.label}
                </Button>
              ))}
            </div>
            {/* View toggle */}
            <div className="flex gap-0.5 border border-border rounded-md p-0.5">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setViewMode('list')}
                title="Lista"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'gantt' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setViewMode('gantt')}
                title="Gantt"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setViewMode('calendar')}
                title="Calendário"
              >
                <Calendar className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted">
            <p className="text-sm font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
            <p className="text-[10px] text-muted-foreground">Total Previsto</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-success/10">
            <p className="text-sm font-bold text-success">{formatCurrency(totalPago)}</p>
            <p className="text-[10px] text-muted-foreground">Total Pago</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-destructive/10">
            <p className="text-sm font-bold text-destructive">{formatCurrency(totalAtrasado)}</p>
            <p className="text-[10px] text-muted-foreground">Atrasado</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento com o filtro selecionado.</p>
        ) : viewMode === 'list' ? (
          /* Timeline by month */
          <div className="space-y-4 max-h-[400px] overflow-y-auto print:max-h-none print:overflow-visible">
            {grouped.map(([month, pags]) => {
              const monthLabel = month === 'sem-data' ? 'Sem data'
                : format(parseISO(month + '-01'), "MMMM 'de' yyyy", { locale: ptBR });
              const monthTotal = pags.reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);

              return (
                <div key={month}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{monthLabel}</p>
                    <span className="text-xs text-muted-foreground font-mono">{formatCurrency(monthTotal)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {pags.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors print:p-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground truncate">{p.descricao}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {p.data_vencimento && <span>{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</span>}
                            {p.fornecedor && <span>· {p.fornecedor}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-mono font-medium text-foreground">{formatCurrency(Number(p.valor_previsto))}</span>
                          <Badge variant="secondary" className={`${statusColors[p.realStatus] || 'bg-muted text-muted-foreground border-0'} text-[10px]`}>
                            {statusLabels[p.realStatus] || p.realStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'calendar' ? (
          <PagamentosCalendarView items={filtered} />
        ) : (
          /* Gantt view */
          ganttData && (
            <div className="space-y-1 max-h-[400px] overflow-y-auto print:max-h-none print:overflow-visible">
              {/* Month headers */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-[140px] shrink-0" />
                <div className="flex-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{format(ganttData.minDate, 'dd/MM', { locale: ptBR })}</span>
                  <span>{format(ganttData.maxDate, 'dd/MM', { locale: ptBR })}</span>
                </div>
              </div>
              {filtered.filter(p => p.data_vencimento).map(p => {
                const date = parseISO(p.data_vencimento);
                const offset = (differenceInDays(date, ganttData.minDate) / ganttData.totalDays) * 100;
                const color = p.realStatus === 'pago' ? 'bg-success' : p.realStatus === 'atrasado' ? 'bg-destructive' : 'bg-primary';
                return (
                  <div key={p.id} className="flex items-center gap-2 group">
                    <div className="w-[140px] shrink-0 truncate text-xs text-foreground" title={p.descricao}>
                      {p.descricao}
                    </div>
                    <div className="flex-1 relative h-6 bg-muted/50 rounded">
                      <div
                        className={`absolute top-1 h-4 w-4 rounded-full ${color} ring-2 ring-background shadow-sm`}
                        style={{ left: `calc(${Math.min(Math.max(offset, 0), 100)}% - 8px)` }}
                        title={`${format(date, 'dd/MM/yyyy')} — ${formatCurrency(Number(p.valor_previsto))} — ${statusLabels[p.realStatus]}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-[70px] text-right shrink-0">
                      {formatCurrency(Number(p.valor_previsto))}
                    </span>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex gap-3 mt-3 pt-2 border-t border-border">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Previsto</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-success" /> Pago</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-destructive" /> Atrasado</div>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
