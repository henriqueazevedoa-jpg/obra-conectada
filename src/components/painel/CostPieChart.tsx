import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrcamentoEtapa } from '@/contexts/OrcamentoContext';
import { CustoRealItem } from '@/contexts/CustoRealContext';
import { formatCurrency } from '@/data/mockData';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { PieChartIcon } from 'lucide-react';

interface Props {
  etapas: OrcamentoEtapa[];
  custoItens: CustoRealItem[];
}

export type CostPieView = 'etapa' | 'categoria' | 'insumo';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(210, 60%, 55%)',
  'hsl(280, 50%, 55%)',
  'hsl(340, 60%, 55%)',
  'hsl(160, 50%, 45%)',
  'hsl(30, 70%, 50%)',
  'hsl(200, 55%, 50%)',
];

const VIEW_LABELS: Record<CostPieView, string> = {
  etapa: 'Por Etapa',
  categoria: 'Por Categoria',
  insumo: 'Por Insumo',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  total: number;
}

function CustomPieTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const name = entry.name;
  const value = entry.value as number;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground mb-0.5">{name}</p>
      <p className="text-muted-foreground">{formatCurrency(value)} ({pct}%)</p>
    </div>
  );
}

interface CostPieChartProps extends Props {
  view?: CostPieView;
  onViewChange?: (view: CostPieView) => void;
}

export default function CostPieChart({ etapas, custoItens, view: externalView, onViewChange }: CostPieChartProps) {
  const [internalView, setInternalView] = useState<CostPieView>('etapa');
  const view = externalView ?? internalView;
  const setView = onViewChange ?? setInternalView;

  const data = useMemo(() => {
    if (view === 'etapa') {
      return etapas
        .filter(c => c.precoTotal > 0)
        .map(c => ({ name: c.nome, value: c.precoTotal }));
    }
    if (view === 'categoria') {
      const byType: Record<string, number> = {};
      custoItens.forEach(i => {
        const cat = i.categoria || 'Outro';
        byType[cat] = (byType[cat] || 0) + i.valor;
      });
      if (Object.keys(byType).length === 0) {
        return etapas.filter(c => c.precoTotal > 0).map(c => ({ name: c.nome, value: c.precoTotal }));
      }
      return Object.entries(byType).map(([name, value]) => ({ name, value }));
    }
    // insumo
    const byDesc: Record<string, number> = {};
    custoItens.forEach(i => {
      byDesc[i.descricao] = (byDesc[i.descricao] || 0) + i.valor;
    });
    if (Object.keys(byDesc).length === 0) {
      return etapas.filter(c => c.precoTotal > 0).map(c => ({ name: c.nome, value: c.precoTotal }));
    }
    const sorted = Object.entries(byDesc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    if (sorted.length <= 9) return sorted;
    const top = sorted.slice(0, 9);
    const outrosValue = sorted.slice(9).reduce((s, d) => s + d.value, 0);
    if (outrosValue > 0) top.push({ name: 'Outros', value: outrosValue });
    return top;
  }, [etapas, custoItens, view]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" /> Distribuição de Custos
          </CardTitle>
          <div className="flex gap-1 print:hidden">
            {(['etapa', 'categoria', 'insumo'] as CostPieView[]).map(v => (
              <Button key={v} size="sm" variant={view === v ? 'default' : 'outline'}
                onClick={() => setView(v)} className="h-7 text-xs">
                {VIEW_LABELS[v]}
              </Button>
            ))}
          </div>
        </div>
        <p className="hidden print:block text-xs text-muted-foreground mt-1">Visão: {VIEW_LABELS[view]}</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir.</p>
        ) : (
          <div className="h-[300px] print:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip total={total} />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value: string) => (
                    <span className="text-foreground">{value.length > 20 ? value.slice(0, 18) + '…' : value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
