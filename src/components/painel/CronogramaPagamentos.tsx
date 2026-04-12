import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/data/mockData';
import { CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

export default function CronogramaPagamentos({ obraId }: Props) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  useEffect(() => {
    if (!obraId) return;
    supabase
      .from('pagamentos')
      .select('id, descricao, valor_previsto, data_vencimento, status, fornecedor_nome')
      .eq('obra_id', obraId)
      .order('data_vencimento', { ascending: true })
      .then(({ data }: any) => {
        if (data) setPagamentos(data as Pagamento[]);
      });
  }, [obraId]);

  // Mark overdue
  const today = new Date().toISOString().slice(0, 10);
  const items = useMemo(() => {
    return pagamentos.map(p => {
      const realStatus =
        p.status === 'pago' ? 'pago' :
        (p.data_vencimento && p.data_vencimento < today) ? 'atrasado' : 'previsto';
      return { ...p, realStatus };
    });
  }, [pagamentos, today]);

  // Group by month
  const grouped = useMemo(() => {
    const map: Record<string, typeof items> = {};
    items.forEach(p => {
      const key = p.data_vencimento ? format(parseISO(p.data_vencimento), 'yyyy-MM') : 'sem-data';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const totalPrevisto = items.reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);
  const totalPago = items.filter(p => p.realStatus === 'pago').reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);
  const totalAtrasado = items.filter(p => p.realStatus === 'atrasado').reduce((s, p) => s + (Number(p.valor_previsto) || 0), 0);

  if (items.length === 0) return null;

  return (
    <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid" data-print-section="cronogramaPagamentos">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Cronograma de Pagamentos
        </CardTitle>
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

        {/* Timeline by month */}
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
                          {p.fornecedor_nome && <span>· {p.fornecedor_nome}</span>}
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
      </CardContent>
    </Card>
  );
}
