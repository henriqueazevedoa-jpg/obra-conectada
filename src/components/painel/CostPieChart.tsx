import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import { CustoRealItem } from '@/contexts/CustoRealContext';
import { formatCurrency } from '@/data/mockData';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { PieChartIcon } from 'lucide-react';

interface Props {
  categorias: OrcamentoCategoria[];
  custoItens: CustoRealItem[];
}

type View = 'etapa' | 'tipo' | 'insumo';

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

export default function CostPieChart({ categorias, custoItens }: Props) {
  const [view, setView] = useState<View>('etapa');

  const data = useMemo(() => {
    if (view === 'etapa') {
      return categorias
        .filter(c => c.precoTotal > 0)
        .map(c => ({ name: c.nome, value: c.precoTotal }));
    }
    if (view === 'tipo') {
      const byType: Record<string, number> = {};
      custoItens.forEach(i => {
        byType[i.categoria || 'Outros'] = (byType[i.categoria || 'Outros'] || 0) + i.valor;
      });
      // If no custo items, fallback to etapas
      if (Object.keys(byType).length === 0) {
        return categorias.filter(c => c.precoTotal > 0).map(c => ({ name: c.nome, value: c.precoTotal }));
      }
      return Object.entries(byType).map(([name, value]) => ({ name, value }));
    }
    // insumo
    const byDesc: Record<string, number> = {};
    custoItens.forEach(i => {
      byDesc[i.descricao] = (byDesc[i.descricao] || 0) + i.valor;
    });
    if (Object.keys(byDesc).length === 0) {
      return categorias.filter(c => c.precoTotal > 0).map(c => ({ name: c.nome, value: c.precoTotal }));
    }
    return Object.entries(byDesc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [categorias, custoItens, view]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" /> Distribuição de Custos
          </CardTitle>
          <div className="flex gap-1 print:hidden">
            {(['etapa', 'tipo', 'insumo'] as View[]).map(v => (
              <Button key={v} size="sm" variant={view === v ? 'default' : 'outline'}
                onClick={() => setView(v)} className="h-7 text-xs capitalize">
                {v === 'etapa' ? 'Por Etapa' : v === 'tipo' ? 'Por Tipo' : 'Por Insumo'}
              </Button>
            ))}
          </div>
        </div>
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
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    `${formatCurrency(value)} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                    ''
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
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
