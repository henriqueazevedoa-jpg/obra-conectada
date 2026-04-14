import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/data/mockData';

interface PagItem {
  id: string;
  descricao: string;
  valor_previsto: number;
  data_vencimento: string;
  realStatus: string;
  fornecedor: string | null;
}

interface Props {
  items: PagItem[];
}

export default function PagamentosResumoMensal({ items }: Props) {
  const data = useMemo(() => {
    const map: Record<string, { previsto: number; pago: number; atrasado: number }> = {};

    items.forEach(p => {
      if (!p.data_vencimento) return;
      const key = p.data_vencimento.slice(0, 7); // yyyy-MM
      if (!map[key]) map[key] = { previsto: 0, pago: 0, atrasado: 0 };
      const val = Number(p.valor_previsto) || 0;
      if (p.realStatus === 'pago') map[key].pago += val;
      else if (p.realStatus === 'atrasado') map[key].atrasado += val;
      else map[key].previsto += val;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({
        month: format(parseISO(month + '-01'), 'MMM yy', { locale: ptBR }),
        ...vals,
      }));
  }, [items]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado para exibir.</p>;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
          <YAxis
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'previsto' ? 'Previsto' : name === 'pago' ? 'Pago' : 'Atrasado',
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            formatter={(value: string) =>
              value === 'previsto' ? 'Previsto' : value === 'pago' ? 'Pago' : 'Atrasado'
            }
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="previsto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pago" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="atrasado" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
