import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import { CustoRealItem } from '@/contexts/CustoRealContext';
import { formatCurrency } from '@/data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import { parseISO, differenceInWeeks, addWeeks, format, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SCurveChartProps {
  categorias: OrcamentoCategoria[];
  custoItens: CustoRealItem[];
  obraInicio: string;
  obraFim: string;
}

type ViewMode = 'tempo' | 'custo';

export default function SCurveChart({ categorias, custoItens, obraInicio, obraFim }: SCurveChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tempo');

  const data = useMemo(() => {
    if (!obraInicio || !obraFim || categorias.length === 0) return [];

    const inicio = parseISO(obraInicio);
    const fim = parseISO(obraFim);
    const today = new Date();
    const totalWeeks = Math.max(differenceInWeeks(fim, inicio), 1);
    const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);

    const points: { semana: string; sNum: number; previsto: number; real: number | null }[] = [];

    for (let w = 0; w <= totalWeeks; w++) {
      const weekDate = addWeeks(inicio, w);
      const weekLabel = `S${w + 1}`;

      if (viewMode === 'tempo') {
        // Planned: sum weight of categories whose dataFimPrevista <= weekDate
        let plannedPct = 0;
        const totalWeight = categorias.length;
        categorias.forEach(c => {
          if (c.dataFimPrevista && !isAfter(parseISO(c.dataFimPrevista), weekDate)) {
            plannedPct += 100 / totalWeight;
          } else if (c.dataInicioPrevista && c.dataFimPrevista) {
            const catStart = parseISO(c.dataInicioPrevista);
            const catEnd = parseISO(c.dataFimPrevista);
            if (!isAfter(catStart, weekDate) && isAfter(catEnd, weekDate)) {
              const catDur = Math.max(differenceInWeeks(catEnd, catStart), 1);
              const elapsed = Math.max(differenceInWeeks(weekDate, catStart), 0);
              plannedPct += (Math.min(elapsed / catDur, 1) * 100) / totalWeight;
            }
          }
        });

        // Actual: based on real dates and percentualCronograma
        let actualPct: number | null = null;
        if (!isAfter(weekDate, today)) {
          actualPct = 0;
          categorias.forEach(c => {
            const pct = c.percentualCronograma ?? 0;
            if (c.dataFimReal && !isAfter(parseISO(c.dataFimReal), weekDate)) {
              actualPct! += 100 / totalWeight;
            } else if (c.dataInicioReal) {
              const realStart = parseISO(c.dataInicioReal);
              if (!isAfter(realStart, weekDate)) {
                // Proportional progress up to this week
                const weeksElapsed = differenceInWeeks(weekDate, realStart);
                const weeksToNow = differenceInWeeks(today, realStart);
                if (weeksToNow > 0) {
                  actualPct! += (Math.min(weeksElapsed / weeksToNow, 1) * pct) / totalWeight;
                }
              }
            }
          });
        }

        points.push({
          semana: weekLabel,
          sNum: w,
          previsto: Math.round(Math.min(plannedPct, 100) * 10) / 10,
          real: actualPct !== null ? Math.round(Math.min(actualPct, 100) * 10) / 10 : null,
        });
      } else {
        // Cost view
        let plannedCost = 0;
        categorias.forEach(c => {
          if (c.dataFimPrevista && !isAfter(parseISO(c.dataFimPrevista), weekDate)) {
            plannedCost += c.precoTotal;
          } else if (c.dataInicioPrevista && c.dataFimPrevista) {
            const catStart = parseISO(c.dataInicioPrevista);
            const catEnd = parseISO(c.dataFimPrevista);
            if (!isAfter(catStart, weekDate) && isAfter(catEnd, weekDate)) {
              const catDur = Math.max(differenceInWeeks(catEnd, catStart), 1);
              const elapsed = Math.max(differenceInWeeks(weekDate, catStart), 0);
              plannedCost += Math.min(elapsed / catDur, 1) * c.precoTotal;
            }
          }
        });

        // Actual cost: distribute custoItens proportionally across weeks
        let actualCost: number | null = null;
        if (!isAfter(weekDate, today)) {
          const totalReal = custoItens.reduce((s, i) => s + i.precoTotal, 0);
          // Simple linear distribution of actual cost over elapsed period
          const totalElapsed = differenceInWeeks(today, inicio);
          if (totalElapsed > 0 && totalReal > 0) {
            actualCost = Math.min(w / totalElapsed, 1) * totalReal;
          } else {
            actualCost = 0;
          }
        }

        points.push({
          semana: weekLabel,
          sNum: w,
          previsto: Math.round(plannedCost),
          real: actualCost !== null ? Math.round(actualCost) : null,
        });
      }
    }

    return points;
  }, [categorias, custoItens, obraInicio, obraFim, viewMode]);

  const isCost = viewMode === 'custo';

  return (
    <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Curva S
          </CardTitle>
          <div className="flex gap-1 print:hidden">
            <Button
              size="sm" variant={viewMode === 'tempo' ? 'default' : 'outline'}
              onClick={() => setViewMode('tempo')} className="h-7 text-xs gap-1"
            >
              <TrendingUp className="h-3 w-3" /> Tempo
            </Button>
            <Button
              size="sm" variant={viewMode === 'custo' ? 'default' : 'outline'}
              onClick={() => setViewMode('custo')} className="h-7 text-xs gap-1"
            >
              <DollarSign className="h-3 w-3" /> Custo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Dados insuficientes para gerar a curva S.
          </p>
        ) : (
          <div className="h-[300px] print:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis
                  dataKey="semana"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  interval={Math.max(Math.floor(data.length / 10), 0)}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  tickFormatter={v => isCost ? `${(v / 1000).toFixed(0)}k` : `${v}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    isCost ? formatCurrency(value) : `${value}%`,
                    name === 'previsto' ? 'Previsto' : 'Real'
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value: string) => value === 'previsto' ? 'Previsto' : 'Real'}
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone" dataKey="previsto" stroke="hsl(var(--primary))"
                  strokeWidth={2} dot={false} name="previsto"
                />
                <Line
                  type="monotone" dataKey="real" stroke="hsl(var(--success))"
                  strokeWidth={2} dot={false} name="real"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
