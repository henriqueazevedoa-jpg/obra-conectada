import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import { CustoRealItem } from '@/contexts/CustoRealContext';
import { formatCurrency } from '@/data/mockData';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ABCTableProps {
  categorias: OrcamentoCategoria[];
  custoItens: CustoRealItem[];
}

interface ABCRow {
  nome: string;
  valor: number;
  percentual: number;
  acumulado: number;
  classe: 'A' | 'B' | 'C';
}

function classifyABC(items: { nome: string; valor: number }[]): ABCRow[] {
  const sorted = [...items].sort((a, b) => b.valor - a.valor);
  const total = sorted.reduce((s, i) => s + i.valor, 0);
  if (total === 0) return [];

  let acumulado = 0;
  return sorted.map(item => {
    acumulado += item.valor;
    const pct = (item.valor / total) * 100;
    const acumPct = (acumulado / total) * 100;
    const classe = acumPct <= 80 ? 'A' : acumPct <= 95 ? 'B' : 'C';
    return { nome: item.nome, valor: item.valor, percentual: pct, acumulado: acumPct, classe };
  });
}

function ABCRows({ rows }: { rows: ABCRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Sem dados disponíveis.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Item</TableHead>
            <TableHead className="text-xs text-right">Valor</TableHead>
            <TableHead className="text-xs text-right w-16">%</TableHead>
            <TableHead className="text-xs text-right w-20">Acum.</TableHead>
            <TableHead className="text-xs text-center w-14">Classe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm py-2">{row.nome}</TableCell>
              <TableCell className="text-sm text-right py-2 font-mono">{formatCurrency(row.valor)}</TableCell>
              <TableCell className="text-sm text-right py-2">{row.percentual.toFixed(1)}%</TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-1.5 justify-end">
                  <Progress value={row.acumulado} className="h-1.5 w-12" />
                  <span className="text-xs text-muted-foreground w-12 text-right">{row.acumulado.toFixed(1)}%</span>
                </div>
              </TableCell>
              <TableCell className="text-center py-2">
                <Badge variant="secondary" className={
                  row.classe === 'A' ? 'bg-destructive/10 text-destructive border-0 text-[10px]' :
                  row.classe === 'B' ? 'bg-warning/10 text-warning border-0 text-[10px]' :
                  'bg-muted text-muted-foreground border-0 text-[10px]'
                }>{row.classe}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ABCTable({ categorias, custoItens }: ABCTableProps) {
  const [tab, setTab] = useState('etapas');

  const etapasRows = useMemo(() => {
    return classifyABC(categorias.map(c => ({ nome: c.nome, valor: c.precoTotal })));
  }, [categorias]);

  const tipoRows = useMemo(() => {
    const byType: Record<string, number> = {};
    custoItens.forEach(i => {
      byType[i.tipoInsumo] = (byType[i.tipoInsumo] || 0) + i.precoTotal;
    });
    return classifyABC(Object.entries(byType).map(([nome, valor]) => ({ nome, valor })));
  }, [custoItens]);

  const insumosRows = useMemo(() => {
    const byDesc: Record<string, number> = {};
    custoItens.forEach(i => {
      byDesc[i.descricao] = (byDesc[i.descricao] || 0) + i.precoTotal;
    });
    return classifyABC(Object.entries(byDesc).map(([nome, valor]) => ({ nome, valor })));
  }, [custoItens]);

  return (
    <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Curva ABC
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3 print:hidden">
            <TabsTrigger value="etapas" className="text-xs">Por Etapa</TabsTrigger>
            <TabsTrigger value="tipo" className="text-xs">Por Tipo</TabsTrigger>
            <TabsTrigger value="insumos" className="text-xs">Por Insumo</TabsTrigger>
          </TabsList>
          <TabsContent value="etapas"><ABCRows rows={etapasRows} /></TabsContent>
          <TabsContent value="tipo"><ABCRows rows={tipoRows} /></TabsContent>
          <TabsContent value="insumos"><ABCRows rows={insumosRows} /></TabsContent>
        </Tabs>
        {/* Print: show etapas by default */}
        <div className="hidden print:block">
          <p className="text-xs font-medium text-muted-foreground mb-2">Curva ABC — Por Etapa</p>
          <ABCRows rows={etapasRows} />
        </div>
      </CardContent>
    </Card>
  );
}
