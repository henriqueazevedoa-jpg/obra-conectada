import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCurrency, formatDate, statusObraLabels } from '@/data/mockData';
import { useObras } from '@/contexts/ObrasContext';
import { useOrcamento, OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import { ArrowLeft, MapPin, Calendar, User, FileText, ClipboardList, List, BarChart3 } from 'lucide-react';
import { parseISO, differenceInDays, format, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusEtapaLabelsLocal: Record<string, string> = {
  nao_iniciada: 'Não Iniciada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
};

function computeGanttRange(categorias: OrcamentoCategoria[]) {
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  for (const cat of categorias) {
    const dates = [cat.dataInicioPrevista, cat.dataFimPrevista, cat.dataInicioReal, cat.dataFimReal].filter(Boolean) as string[];
    for (const d of dates) {
      const parsed = parseISO(d);
      if (!minDate || isBefore(parsed, minDate)) minDate = parsed;
      if (!maxDate || isBefore(maxDate, parsed)) maxDate = parsed;
    }
    for (const comp of cat.composicoes) {
      const cDates = [comp.dataInicioPrevista, comp.dataFimPrevista, comp.dataInicioReal, comp.dataFimReal].filter(Boolean) as string[];
      for (const d of cDates) {
        const parsed = parseISO(d);
        if (!minDate || isBefore(parsed, minDate)) minDate = parsed;
        if (!maxDate || isBefore(maxDate, parsed)) maxDate = parsed;
      }
    }
  }
  if (!minDate || !maxDate) return null;
  // Add padding
  minDate = addDays(minDate, -7);
  maxDate = addDays(maxDate, 14);
  const totalDays = differenceInDays(maxDate, minDate);
  return { minDate, maxDate, totalDays: Math.max(totalDays, 30) };
}

function generateMonthMarkers(minDate: Date, totalDays: number) {
  const markers: { label: string; left: number }[] = [];
  for (let d = 0; d <= totalDays; d++) {
    const current = addDays(minDate, d);
    if (current.getDate() === 1) {
      markers.push({
        label: format(current, 'MMM/yy', { locale: ptBR }),
        left: (d / totalDays) * 100,
      });
    }
  }
  return markers;
}

function GanttBar({ start, end, minDate, totalDays, color, label }: {
  start: string; end: string; minDate: Date; totalDays: number; color: string; label?: string;
}) {
  const s = differenceInDays(parseISO(start), minDate);
  const e = differenceInDays(parseISO(end), minDate);
  const left = Math.max(0, (s / totalDays) * 100);
  const width = Math.max(0.5, ((e - s) / totalDays) * 100);
  return (
    <div
      className={cn('absolute h-3 rounded-sm', color)}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={label}
    />
  );
}

function MiniGantt({ categorias }: { categorias: OrcamentoCategoria[] }) {
  const range = computeGanttRange(categorias);
  if (!range) return <p className="text-sm text-muted-foreground text-center py-4">Sem datas definidas para exibir o Gantt.</p>;

  const { minDate, totalDays } = range;
  const months = generateMonthMarkers(minDate, totalDays);
  const pxPerDay = 12;
  const chartWidth = totalDays * pxPerDay;

  const statusColor = (cat: OrcamentoCategoria) => {
    if (cat.statusCronograma === 'concluida') return 'bg-success';
    if (cat.statusCronograma === 'atrasada') return 'bg-destructive';
    if (cat.statusCronograma === 'em_andamento') return 'bg-primary';
    return 'bg-muted-foreground/40';
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-border rounded-lg">
        <div className="flex" style={{ minWidth: chartWidth + 200 }}>
          {/* Labels column */}
          <div className="w-[200px] flex-shrink-0 border-r border-border bg-muted/30">
            <div className="h-8 border-b border-border px-2 flex items-center">
              <span className="text-xs font-medium text-muted-foreground">Etapa</span>
            </div>
            {categorias.map(cat => (
              <div key={cat.id} className="h-12 border-b border-border px-2 flex items-center">
                <span className="text-xs text-foreground truncate">{cat.nome}</span>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative" style={{ width: chartWidth }}>
            {/* Month headers */}
            <div className="h-8 border-b border-border relative">
              {months.map((m, i) => (
                <div key={i} className="absolute top-0 h-full flex items-center" style={{ left: `${m.left}%` }}>
                  <div className="border-l border-border h-full" />
                  <span className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {categorias.map(cat => (
              <div key={cat.id} className="h-12 border-b border-border relative">
                {/* Grid lines */}
                {months.map((m, i) => (
                  <div key={i} className="absolute top-0 h-full border-l border-border/30" style={{ left: `${m.left}%` }} />
                ))}

                {/* Previsto bar */}
                {cat.dataInicioPrevista && cat.dataFimPrevista && (
                  <div className="absolute top-1 left-0 right-0 h-4">
                    <GanttBar
                      start={cat.dataInicioPrevista}
                      end={cat.dataFimPrevista}
                      minDate={minDate}
                      totalDays={totalDays}
                      color="bg-primary/30"
                      label={`Previsto: ${formatDate(cat.dataInicioPrevista)} → ${formatDate(cat.dataFimPrevista)}`}
                    />
                  </div>
                )}

                {/* Real bar */}
                {cat.dataInicioReal && (
                  <div className="absolute top-6 left-0 right-0 h-4">
                    <GanttBar
                      start={cat.dataInicioReal}
                      end={cat.dataFimReal || new Date().toISOString().slice(0, 10)}
                      minDate={minDate}
                      totalDays={totalDays}
                      color={statusColor(cat)}
                      label={`Real: ${formatDate(cat.dataInicioReal)} → ${cat.dataFimReal ? formatDate(cat.dataFimReal) : 'em andamento'}`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary/30" /> Previsto</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary" /> Em Andamento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success" /> Concluída</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive" /> Atrasada</span>
      </div>
    </div>
  );
}

export default function ObraDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getObra } = useObras();
  const { getOrcamento } = useOrcamento();
  const obra = id ? getObra(id) : undefined;
  const [cronogramaView, setCronogramaView] = useState<'lista' | 'gantt'>('lista');

  if (!obra) return <div className="p-8 text-center text-muted-foreground">Obra não encontrada</div>;

  const orcamento = getOrcamento(obra.id);
  const categorias = orcamento?.categorias ?? [];

  const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);
  const etapasComDatas = categorias.filter(c => c.dataInicioPrevista || c.dataInicioReal);
  const progressoGeral = categorias.length > 0
    ? Math.round(categorias.reduce((s, c) => s + (c.percentualCronograma ?? 0), 0) / categorias.length)
    : obra.percentualAndamento;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/obras" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar para obras
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{obra.codigo}</p>
          <h1 className="text-2xl font-bold text-foreground">{obra.nome}</h1>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Badge variant="secondary" className="bg-success/10 text-success border-0">
            {statusObraLabels[obra.status]}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => navigate(`/orcamento?obra=${obra.id}`)}>
            <FileText className="h-4 w-4 mr-1" /> Orçamento
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/cronograma?obra=${obra.id}`)}>
            <ClipboardList className="h-4 w-4 mr-1" /> Cronograma
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {obra.endereco}</div>
        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatDate(obra.dataInicio)} → {formatDate(obra.dataPrevisaoTermino)}</div>
        <div className="flex items-center gap-2"><User className="h-4 w-4" /> {obra.responsavel}</div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso Geral</span>
            <span className="font-bold text-foreground">{progressoGeral}%</span>
          </div>
          <Progress value={progressoGeral} className="h-3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div><p className="text-xs text-muted-foreground">Previsto</p><p className="font-semibold text-foreground">{formatCurrency(totalPrevisto)}</p></div>
            <div><p className="text-xs text-muted-foreground">Concluídas</p><p className="font-semibold text-success">{categorias.filter(c => c.statusCronograma === 'concluida').length}</p></div>
            <div><p className="text-xs text-muted-foreground">Em Andamento</p><p className="font-semibold text-primary">{categorias.filter(c => c.statusCronograma === 'em_andamento' || c.statusCronograma === 'atrasada').length}</p></div>
            <div><p className="text-xs text-muted-foreground">Não Iniciadas</p><p className="font-semibold text-muted-foreground">{categorias.filter(c => !c.statusCronograma || c.statusCronograma === 'nao_iniciada').length}</p></div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cronograma">
        <TabsList>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value="cronograma" className="mt-4 space-y-3">
          {categorias.length > 0 && (
            <div className="flex justify-end">
              <ToggleGroup type="single" value={cronogramaView} onValueChange={(v) => v && setCronogramaView(v as 'lista' | 'gantt')}>
                <ToggleGroupItem value="lista" aria-label="Lista" size="sm">
                  <List className="h-4 w-4 mr-1" /> Lista
                </ToggleGroupItem>
                <ToggleGroupItem value="gantt" aria-label="Gantt" size="sm">
                  <BarChart3 className="h-4 w-4 mr-1" /> Gantt
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {categorias.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma etapa cadastrada. Acesse o Orçamento para criar categorias.</p>}

          {cronogramaView === 'lista' && categorias.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{cat.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.dataInicioPrevista ? formatDate(cat.dataInicioPrevista) : '—'} → {cat.dataFimPrevista ? formatDate(cat.dataFimPrevista) : '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">{cat.percentualCronograma ?? 0}%</span>
                <Badge variant="secondary" className={
                  cat.statusCronograma === 'concluida' ? 'bg-success/10 text-success border-0' :
                  cat.statusCronograma === 'atrasada' ? 'bg-destructive/10 text-destructive border-0' :
                  cat.statusCronograma === 'em_andamento' ? 'bg-primary/10 text-primary border-0' :
                  'bg-muted text-muted-foreground border-0'
                }>{statusEtapaLabelsLocal[cat.statusCronograma ?? 'nao_iniciada']}</Badge>
              </div>
            </div>
          ))}

          {cronogramaView === 'gantt' && <MiniGantt categorias={categorias} />}
        </TabsContent>

        <TabsContent value="orcamento" className="mt-4">
          {categorias.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria no orçamento.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left p-2 text-muted-foreground font-medium">Código</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Categoria</th>
                <th className="text-right p-2 text-muted-foreground font-medium">Composições</th>
                <th className="text-right p-2 text-muted-foreground font-medium">Total Previsto</th>
              </tr></thead>
              <tbody>
                {categorias.map(cat => (
                  <tr key={cat.id} className="border-b border-border">
                    <td className="p-2 text-muted-foreground font-mono text-xs">{cat.codigo}</td>
                    <td className="p-2 text-foreground">{cat.nome}</td>
                    <td className="p-2 text-right text-foreground">{cat.composicoes.length}</td>
                    <td className="p-2 text-right text-foreground">{formatCurrency(cat.precoTotal)}</td>
                  </tr>
                ))}
                {categorias.length > 0 && (
                  <tr className="font-bold">
                    <td className="p-2" colSpan={3}>Total</td>
                    <td className="p-2 text-right text-foreground">{formatCurrency(totalPrevisto)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
