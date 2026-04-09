import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  mockDiario, formatCurrency, formatDate, statusEtapaLabels,
  climaLabels
} from '@/data/mockData';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Package, BookOpen,
  Printer, Clock, CalendarDays, DollarSign, BarChart3, Users
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function computePercentual(cat: any): number {
  if (cat.percentualCronograma != null) return cat.percentualCronograma;
  if (!cat.usaComposicoes || cat.composicoes.length === 0) return 0;
  const totalPeso = cat.composicoes.reduce((s: number, c: any) => s + (c.pesoCronograma ?? 0), 0);
  if (totalPeso === 0) {
    const done = cat.composicoes.filter((c: any) => c.concluida).length;
    return Math.round((done / cat.composicoes.length) * 100);
  }
  const done = cat.composicoes.filter((c: any) => c.concluida).reduce((s: number, c: any) => s + (c.pesoCronograma ?? 0), 0);
  return Math.round((done / totalPeso) * 100);
}

function computeStatus(cat: any): string {
  if (cat.statusCronograma) return cat.statusCronograma;
  if ((cat.percentualCronograma ?? 0) >= 100) return 'concluida';
  if (cat.dataInicioReal) {
    if (cat.dataFimPrevista && !cat.dataFimReal && isAfter(new Date(), parseISO(cat.dataFimPrevista))) return 'atrasada';
    return 'em_andamento';
  }
  if (cat.dataFimPrevista && isAfter(new Date(), parseISO(cat.dataFimPrevista))) return 'atrasada';
  return 'nao_iniciada';
}

export default function RelatoriosPage() {
  const { obras } = useObras();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const { getOrcamento } = useOrcamento();
  const { getMateriaisByObra } = useEstoque();

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];
  const orcamento = getOrcamento(obra.id);
  const categorias = orcamento?.categorias || [];
  const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);
  const materiaisObra = getMateriaisByObra(obra.id);
  const materiaisBaixo = materiaisObra.filter(m => m.estoqueAtual < m.estoqueMinimo);
  const registros = mockDiario.filter(d => d.obraId === obra.id);
  const registrosAprovados = registros.filter(d => d.status === 'aprovado');
  const registrosPendentes = registros.filter(d => d.status === 'pendente');

  const today = new Date();

  const concluidas = categorias.filter(c => computeStatus(c) === 'concluida');
  const emAndamento = categorias.filter(c => computeStatus(c) === 'em_andamento');
  const atrasadas = categorias.filter(c => computeStatus(c) === 'atrasada');
  const naoIniciadas = categorias.filter(c => computeStatus(c) === 'nao_iniciada');

  const andamentoReal = categorias.length > 0
    ? Math.round(categorias.reduce((s, c) => s + computePercentual(c), 0) / categorias.length)
    : obra.percentualAndamento;

  const andamentoPlanejado = (() => {
    if (categorias.length === 0) return 0;
    const withDates = categorias.filter(c => c.dataFimPrevista);
    if (withDates.length === 0) return 0;
    const shouldBeDone = withDates.filter(c => new Date(c.dataFimPrevista!) <= today).length;
    return Math.round((shouldBeDone / categorias.length) * 100);
  })();

  const totalTrabalhadores = registrosAprovados.length > 0
    ? Math.round(registrosAprovados.reduce((s, r) => s + r.trabalhadores, 0) / registrosAprovados.length)
    : 0;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - hidden on print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Relatório consolidado da obra</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-[280px] h-9 text-sm">
              <SelectValue placeholder="Selecionar obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-foreground">Relatório de Obra</h1>
        <p className="text-sm text-muted-foreground">{obra.codigo} — {obra.nome}</p>
        <p className="text-xs text-muted-foreground">Emitido em {format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        <Separator className="mt-2" />
      </div>

      {/* Dados da Obra */}
      <Card className="shadow-card print:shadow-none print:border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados da Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Obra</p>
              <p className="font-semibold text-foreground">{obra.nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Código</p>
              <p className="font-semibold text-foreground">{obra.codigo}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-semibold text-foreground">{obra.cliente}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Responsável</p>
              <p className="font-semibold text-foreground">{obra.responsavel}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Endereço</p>
              <p className="font-semibold text-foreground">{obra.endereco}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Início</p>
              <p className="font-semibold text-foreground">{formatDate(obra.dataInicio)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Previsão de Término</p>
              <p className="font-semibold text-foreground">{formatDate(obra.dataPrevisaoTermino)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant="secondary" className="mt-0.5">
                {obra.status === 'em_andamento' ? 'Em Andamento' : obra.status === 'concluida' ? 'Concluída' : obra.status === 'planejamento' ? 'Planejamento' : 'Pausada'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <Card className="shadow-card print:shadow-none print:border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Orçamento Planejado</p>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card print:shadow-none print:border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Andamento Planejado</p>
            </div>
            <p className="text-lg font-bold text-foreground">{andamentoPlanejado}%</p>
            <Progress value={andamentoPlanejado} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        <Card className="shadow-card print:shadow-none print:border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground font-medium">Andamento Real</p>
            </div>
            <p className="text-lg font-bold text-foreground">{andamentoReal}%</p>
            <Progress value={andamentoReal} className="h-1.5 mt-1" />
            {andamentoPlanejado > 0 && (
              <p className={`text-[10px] font-medium mt-0.5 ${andamentoReal >= andamentoPlanejado ? 'text-success' : 'text-destructive'}`}>
                {andamentoReal >= andamentoPlanejado ? 'No prazo' : `${andamentoPlanejado - andamentoReal}% atrasado`}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-card print:shadow-none print:border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Méd. Trabalhadores/dia</p>
            </div>
            <p className="text-lg font-bold text-foreground">{totalTrabalhadores}</p>
            <p className="text-[10px] text-muted-foreground">{registrosAprovados.length} registro(s) aprovado(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Pontos de Atenção */}
      {(atrasadas.length > 0 || materiaisBaixo.length > 0 || registrosPendentes.length > 0) && (
        <Card className="shadow-card border-warning/30 print:shadow-none print:border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Pontos de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {atrasadas.map(c => (
              <p key={c.id} className="text-sm text-foreground">📅 {c.nome} — etapa atrasada ({computePercentual(c)}% concluído)</p>
            ))}
            {materiaisBaixo.map(m => (
              <p key={m.id} className="text-sm text-foreground">📦 {m.nome} — estoque em {m.estoqueAtual} {m.unidade} (mínimo: {m.estoqueMinimo})</p>
            ))}
            {registrosPendentes.length > 0 && (
              <p className="text-sm text-foreground">📋 {registrosPendentes.length} registro(s) de diário pendente(s) de aprovação</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo do Cronograma */}
      <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Resumo do Cronograma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-success/10">
              <p className="text-xl font-bold text-success">{concluidas.length}</p>
              <p className="text-[10px] text-muted-foreground">Concluídas</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-primary/10">
              <p className="text-xl font-bold text-primary">{emAndamento.length}</p>
              <p className="text-[10px] text-muted-foreground">Em Andamento</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/10">
              <p className="text-xl font-bold text-destructive">{atrasadas.length}</p>
              <p className="text-[10px] text-muted-foreground">Atrasadas</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted">
              <p className="text-xl font-bold text-muted-foreground">{naoIniciadas.length}</p>
              <p className="text-[10px] text-muted-foreground">Não Iniciadas</p>
            </div>
          </div>
          <div className="space-y-2">
            {categorias.map(c => {
              const status = computeStatus(c);
              const pct = computePercentual(c);
              return (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors print:p-1">
                  <div className="flex items-center gap-2">
                    {status === 'concluida' ? <CheckCircle2 className="h-4 w-4 text-success" /> :
                     status === 'atrasada' ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
                     status === 'em_andamento' ? <TrendingUp className="h-4 w-4 text-primary" /> :
                     <Clock className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm text-foreground">{c.nome}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                    <Badge variant="secondary" className={
                      status === 'concluida' ? 'bg-success/10 text-success border-0' :
                      status === 'atrasada' ? 'bg-destructive/10 text-destructive border-0' :
                      status === 'em_andamento' ? 'bg-primary/10 text-primary border-0' :
                      'bg-muted text-muted-foreground border-0'
                    }>{statusEtapaLabels[status]}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custos por Categoria */}
      <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Custos por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categorias.map(c => {
              const pctCusto = totalPrevisto > 0 ? Math.round((c.precoTotal / totalPrevisto) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center gap-4">
                  <span className="text-sm text-foreground w-48 shrink-0 truncate">{c.nome}</span>
                  <div className="flex-1">
                    <Progress value={pctCusto} className="h-2" />
                  </div>
                  <span className="text-xs text-muted-foreground w-24 text-right">{formatCurrency(c.precoTotal)}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pctCusto}%</span>
                </div>
              );
            })}
            <Separator />
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-foreground w-48 shrink-0">Total</span>
              <div className="flex-1" />
              <span className="text-sm font-bold text-foreground w-24 text-right">{formatCurrency(totalPrevisto)}</span>
              <span className="text-xs text-muted-foreground w-10 text-right">100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estoque com alerta */}
      {materiaisBaixo.length > 0 && (
        <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Materiais com Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {materiaisBaixo.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.categoria}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-destructive">{m.estoqueAtual} {m.unidade}</p>
                    <p className="text-xs text-muted-foreground">Mín: {m.estoqueMinimo} {m.unidade}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diário recente */}
      <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Últimos Registros do Diário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {registros.slice(0, 8).map(r => (
            <div key={r.id} className="border-b border-border pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">{formatDate(r.data)}</p>
                <span className="text-xs">{climaLabels[r.clima]}</span>
                <span className="text-xs text-muted-foreground">· {r.trabalhadores} trab.</span>
                <Badge variant="secondary" className={
                  r.status === 'aprovado' ? 'bg-success/10 text-success border-0 text-[10px]' :
                  r.status === 'pendente' ? 'bg-warning/10 text-warning border-0 text-[10px]' :
                  'bg-destructive/10 text-destructive border-0 text-[10px]'
                }>{r.status}</Badge>
              </div>
              {r.servicos && r.servicos.length > 0 ? (
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {r.servicos.map(s => (
                    <li key={s.id}>{s.descricao}{s.percentualAdicionado ? ` (+${s.percentualAdicionado}%)` : ''}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{r.servicosExecutados}</p>
              )}
              {r.problemas && (
                <p className="text-xs text-destructive mt-1">⚠️ {r.problemas}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rodapé do relatório (print only) */}
      <div className="hidden print:block text-center text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
        <p>Relatório gerado em {format(today, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        <p>{obra.codigo} — {obra.nome}</p>
      </div>
    </div>
  );
}
