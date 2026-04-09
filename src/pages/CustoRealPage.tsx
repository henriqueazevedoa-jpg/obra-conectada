import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useCustoReal } from '@/contexts/CustoRealContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/data/mockData';
import { DollarSign, Edit, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import CustoRealEditor from '@/components/custo-real/CustoRealEditor';

export default function CustoRealPage() {
  const { user } = useAuth();
  const { obras } = useObras();
  const { getOrcamento } = useOrcamento();
  const { getItensByObra } = useCustoReal();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const [editing, setEditing] = useState(false);

  const obra = obras.find(o => o.id === selectedObraId);
  const orcamento = selectedObraId ? getOrcamento(selectedObraId) : undefined;
  const custoItens = selectedObraId ? getItensByObra(selectedObraId) : [];

  const categorias = orcamento?.categorias || [];
  const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);
  const totalRealizado = custoItens.reduce((s, i) => s + i.precoTotal, 0);
  const desvio = totalRealizado - totalPrevisto;
  const desvioPercent = totalPrevisto > 0 ? ((desvio / totalPrevisto) * 100) : 0;

  const isGestor = user?.role === 'gestor';

  if (editing && obra) {
    return <CustoRealEditor obraId={obra.id} obraNome={obra.nome} onBack={() => setEditing(false)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Custo Real</h1>
          <p className="text-muted-foreground text-sm">Acompanhamento dos custos reais por etapa</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isGestor && (
            <Button onClick={() => setEditing(true)} className="gap-1">
              <Edit className="h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      {!obra && (
        <div className="text-center py-12 text-muted-foreground">Selecione uma obra para visualizar os custos reais.</div>
      )}

      {obra && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">Orçamento Previsto</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-success" />
                  <p className="text-xs text-muted-foreground font-medium">Custo Realizado</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalRealizado)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {desvio >= 0 ? <TrendingUp className="h-4 w-4 text-destructive" /> : <TrendingDown className="h-4 w-4 text-success" />}
                  <p className="text-xs text-muted-foreground font-medium">Desvio</p>
                </div>
                <p className={`text-lg font-bold ${desvio > 0 ? 'text-destructive' : desvio < 0 ? 'text-success' : 'text-foreground'}`}>
                  {desvio >= 0 ? '+' : ''}{formatCurrency(desvio)}
                </p>
                <p className="text-[10px] text-muted-foreground">{desvioPercent >= 0 ? '+' : ''}{desvioPercent.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">Itens Cadastrados</p>
                </div>
                <p className="text-lg font-bold text-foreground">{custoItens.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-category breakdown */}
          {categorias.length > 0 ? (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Custos por Etapa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-muted-foreground font-medium">Código</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Etapa</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Previsto</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Realizado</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Desvio</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Itens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorias.map(cat => {
                        const catItens = custoItens.filter(i => i.categoriaId === cat.id);
                        const catRealizado = catItens.reduce((s, i) => s + i.precoTotal, 0);
                        const catDesvio = catRealizado - cat.precoTotal;
                        return (
                          <tr key={cat.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="p-2 font-mono text-xs text-muted-foreground">{cat.codigo}</td>
                            <td className="p-2 text-foreground font-medium">{cat.nome}</td>
                            <td className="p-2 text-right text-foreground">{formatCurrency(cat.precoTotal)}</td>
                            <td className="p-2 text-right text-foreground">{catItens.length > 0 ? formatCurrency(catRealizado) : '—'}</td>
                            <td className={`p-2 text-right ${catDesvio > 0 ? 'text-destructive' : catDesvio < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                              {catItens.length > 0 ? `${catDesvio >= 0 ? '+' : ''}${formatCurrency(catDesvio)}` : '—'}
                            </td>
                            <td className="p-2 text-right text-muted-foreground">{catItens.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="p-2" colSpan={2}>Total</td>
                        <td className="p-2 text-right text-foreground">{formatCurrency(totalPrevisto)}</td>
                        <td className="p-2 text-right text-foreground">{custoItens.length > 0 ? formatCurrency(totalRealizado) : '—'}</td>
                        <td className={`p-2 text-right ${desvio > 0 ? 'text-destructive' : desvio < 0 ? 'text-success' : 'text-foreground'}`}>
                          {custoItens.length > 0 ? `${desvio >= 0 ? '+' : ''}${formatCurrency(desvio)}` : '—'}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">{custoItens.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {isGestor ? 'Cadastre um orçamento primeiro para poder registrar custos reais.' : 'Nenhum orçamento cadastrado para esta obra.'}
            </div>
          )}

          {/* Breakdown by type */}
          {custoItens.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Custos por Tipo de Insumo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const tiposMap = new Map<string, number>();
                    custoItens.forEach(i => {
                      tiposMap.set(i.tipoInsumo, (tiposMap.get(i.tipoInsumo) || 0) + i.precoTotal);
                    });
                    return Array.from(tiposMap.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([tipo, total]) => {
                        const pct = totalRealizado > 0 ? Math.round((total / totalRealizado) * 100) : 0;
                        return (
                          <div key={tipo} className="flex items-center gap-4">
                            <span className="text-sm text-foreground w-32 shrink-0 truncate">{tipo}</span>
                            <div className="flex-1">
                              <Progress value={pct} className="h-2" />
                            </div>
                            <span className="text-xs text-muted-foreground w-24 text-right hidden sm:block">{formatCurrency(total)}</span>
                            <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                          </div>
                        );
                      });
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
