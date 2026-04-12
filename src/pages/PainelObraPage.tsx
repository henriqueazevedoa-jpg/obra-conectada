import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useCustoReal } from '@/contexts/CustoRealContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  formatCurrency, formatDate, statusEtapaLabels, climaLabels, statusDiarioLabels
} from '@/data/mockData';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Package, BookOpen,
  Clock, CalendarDays, DollarSign, Users,
  LayoutDashboard, Plus, ChevronDown, List, BarChart3,
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay, differenceInWeeks, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SCurveChart from '@/components/painel/SCurveChart';
import ABCTable from '@/components/painel/ABCTable';
import PrintSectionPicker, { PrintSections, defaultPrintSections } from '@/components/painel/PrintSectionPicker';
import ResumoExecutivo from '@/components/painel/ResumoExecutivo';
import SmartCards from '@/components/painel/SmartCards';
import ObraHeader from '@/components/painel/ObraHeader';
import AcoesPrioritarias from '@/components/painel/AcoesPrioritarias';
import PendenciasBlock from '@/components/painel/PendenciasBlock';
import CostPieChart from '@/components/painel/CostPieChart';
import PontosAtencao from '@/components/painel/PontosAtencao';
import GanttChart from '@/components/painel/GanttChart';
import NoObraState from '@/components/obras/NoObraState';

interface DiarioRow {
  id: string; data: string; clima: string; trabalhadores: number;
  servicos_executados: string | null; problemas: string | null;
  observacoes: string | null; status: string; usuario_nome: string;
}

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

function GestorPainel() {
  const { obras } = useObras();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const navigate = useNavigate();
  const { getOrcamento } = useOrcamento();
  const { getMateriaisByObra } = useEstoque();
  const { getItensByObra: getCustoItensByObra } = useCustoReal();
  const [printSections, setPrintSections] = useState<PrintSections>(defaultPrintSections);
  const [diarioRegistros, setDiarioRegistros] = useState<DiarioRow[]>([]);
  const [pagamentosAtrasados, setPagamentosAtrasados] = useState<{ count: number; valor: number }>({ count: 0, valor: 0 });
  const [pendenciasAlta, setPendenciasAlta] = useState(0);
  const [diarioOpen, setDiarioOpen] = useState(false);
  const [cronogramaView, setCronogramaView] = useState<'list' | 'gantt'>('list');

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  useEffect(() => {
    if (!obra) return;
    supabase.from('diario_registros').select('*').eq('obra_id', obra.id)
      .order('data', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setDiarioRegistros(data as DiarioRow[]); });

    const today = startOfDay(new Date()).toISOString().slice(0, 10);
    supabase.from('pagamentos').select('id, valor_previsto, status, data_vencimento')
      .eq('obra_id', obra.id)
      .then(({ data }) => {
        const pags = (data || []) as any[];
        const atrasados = pags.filter(p =>
          p.status === 'atrasado' ||
          (p.status === 'previsto' && p.data_vencimento && p.data_vencimento < today)
        );
        setPagamentosAtrasados({
          count: atrasados.length,
          valor: atrasados.reduce((s: number, p: any) => s + (Number(p.valor_previsto) || 0), 0),
        });
      });

    supabase.from('pendencias').select('id, prioridade, status')
      .eq('obra_id', obra.id)
      .then(({ data }) => {
        const pends = (data || []) as any[];
        setPendenciasAlta(pends.filter(p => p.prioridade === 'alta' && p.status !== 'resolvida').length);
      });
  }, [obra?.id]);

  const handleObraSelectChange = (value: string) => {
    if (value === '__nova_obra__') navigate('/obras?nova=1');
    else setSelectedObraId(value);
  };

  if (!obra) {
    return <NoObraState title="Nenhuma obra cadastrada" description="Cadastre uma obra para visualizar o painel executivo consolidado." />;
  }

  const orcamento = getOrcamento(obra.id);
  const categorias = orcamento?.categorias || [];
  const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);
  const custoItens = getCustoItensByObra(obra.id);
  const totalRealizado = custoItens.reduce((s, i) => s + i.valor, 0);
  const materiaisObra = getMateriaisByObra(obra.id);
  const materiaisBaixo = materiaisObra.filter(m => m.estoqueAtual < m.estoqueMinimo);
  const registrosPendentes = diarioRegistros.filter(d => d.status === 'pendente');
  const registrosAprovados = diarioRegistros.filter(d => d.status === 'aprovado');

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

  // Previsto acumulado proporcional ao avanço real (no hook, just derived)
  const previstoAcumulado = categorias.length === 0 || totalPrevisto === 0 ? 0 :
    categorias.reduce((sum, cat) => sum + cat.precoTotal * (computePercentual(cat) / 100), 0);

  const totalTrabalhadores = registrosAprovados.length > 0
    ? Math.round(registrosAprovados.reduce((s, r) => s + r.trabalhadores, 0) / registrosAprovados.length)
    : 0;

  const handlePrint = () => {
    document.querySelectorAll('[data-print-section]').forEach(el => {
      const section = el.getAttribute('data-print-section') as keyof PrintSections;
      if (section && !printSections[section]) {
        (el as HTMLElement).classList.add('print-section-hidden');
      } else {
        (el as HTMLElement).classList.remove('print-section-hidden');
      }
    });
    setTimeout(() => window.print(), 100);
  };

  const etapasAtrasadasData = atrasadas.map(c => ({ id: c.id, nome: c.nome, percentual: computePercentual(c) }));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Painel da Obra
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Central de controle e decisão</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedObraId} onValueChange={handleObraSelectChange}>
            <SelectTrigger className="w-full sm:w-[260px] h-9 text-sm">
              <SelectValue placeholder="Selecionar obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.codigo ? `${o.codigo} - ` : ''}{o.nome}</SelectItem>
              ))}
              <SelectItem value="__nova_obra__" className="text-primary font-medium">+ Criar Nova Obra</SelectItem>
            </SelectContent>
          </Select>
          <PrintSectionPicker sections={printSections} onChange={setPrintSections} onPrint={handlePrint} />
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-foreground">Panorama Geral da Obra</h1>
        <p className="text-sm text-muted-foreground">{obra.codigo} — {obra.nome}</p>
        <p className="text-xs text-muted-foreground">Emitido em {format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        <Separator className="mt-2" />
      </div>

      {/* 1. Compact Obra Header */}
      <ObraHeader obra={obra} />

      {/* 2. Smart Cards */}
      <SmartCards
        totalPrevisto={totalPrevisto}
        totalRealizado={totalRealizado}
        previstoAcumulado={previstoAcumulado}
        andamentoReal={andamentoReal}
        andamentoPlanejado={andamentoPlanejado}
        etapasAtrasadas={atrasadas.length}
        materiaisBaixo={materiaisBaixo.length}
        registrosPendentes={registrosPendentes.length}
        pagamentosAtrasados={pagamentosAtrasados.count}
      />

      {/* 3. Ações Prioritárias */}
      <AcoesPrioritarias
        pagamentosAtrasados={pagamentosAtrasados.count}
        pagamentosAtrasadosValor={pagamentosAtrasados.valor}
        materiaisBaixo={materiaisBaixo.map(m => ({ nome: m.nome, estoqueAtual: m.estoqueAtual, unidade: m.unidade }))}
        pendenciasAlta={pendenciasAlta}
        etapasAtrasadas={atrasadas.map(c => ({ nome: c.nome }))}
        registrosPendentes={registrosPendentes.length}
      />

      {/* 4. Resumo Executivo */}
      <div data-print-section="resumoExecutivo">
        <ResumoExecutivo
          obraId={obra.id}
          totalPrevisto={totalPrevisto}
          totalRealizado={totalRealizado}
          andamentoReal={andamentoReal}
          andamentoPlanejado={andamentoPlanejado}
        />
      </div>

      {/* 5. Charts Row 1: Curva S + Pizza */}
      <div className="grid md:grid-cols-2 gap-5">
        <div data-print-section="curvaS">
          <SCurveChart
            categorias={categorias}
            custoItens={custoItens}
            obraInicio={obra.dataInicio}
            obraFim={obra.dataPrevisaoTermino}
          />
        </div>
        <CostPieChart categorias={categorias} custoItens={custoItens} />
      </div>

      {/* 6. Curva ABC — Full Width */}
      <div data-print-section="curvaABC">
        <ABCTable categorias={categorias} custoItens={custoItens} />
      </div>

      {/* 7. Pendências + Pontos de Atenção */}
      <div className="grid md:grid-cols-2 gap-5">
        <PendenciasBlock obraId={obra.id} />
        <PontosAtencao
          etapasAtrasadas={etapasAtrasadasData}
          materiaisBaixo={materiaisBaixo.map(m => ({
            id: m.id, nome: m.nome, estoqueAtual: m.estoqueAtual,
            estoqueMinimo: m.estoqueMinimo, unidade: m.unidade,
          }))}
          registrosPendentes={registrosPendentes.length}
          pagamentosAtrasados={pagamentosAtrasados.count}
          pagamentosAtrasadosValor={pagamentosAtrasados.valor}
        />
      </div>

      {/* 8. Resumo do Cronograma com Gantt */}
      <div data-print-section="cronograma">
        <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Resumo do Cronograma
              </CardTitle>
              <div className="flex border border-border rounded-md print:hidden">
                <Button variant={cronogramaView === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 rounded-r-none gap-1 text-xs" onClick={() => setCronogramaView('list')}>
                  <List className="h-3 w-3" /> Lista
                </Button>
                <Button variant={cronogramaView === 'gantt' ? 'default' : 'ghost'} size="sm" className="h-7 rounded-l-none gap-1 text-xs" onClick={() => setCronogramaView('gantt')}>
                  <BarChart3 className="h-3 w-3" /> Gantt
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-success/10"><p className="text-xl font-bold text-success">{concluidas.length}</p><p className="text-[10px] text-muted-foreground">Concluídas</p></div>
              <div className="text-center p-2 rounded-lg bg-primary/10"><p className="text-xl font-bold text-primary">{emAndamento.length}</p><p className="text-[10px] text-muted-foreground">Em Andamento</p></div>
              <div className="text-center p-2 rounded-lg bg-destructive/10"><p className="text-xl font-bold text-destructive">{atrasadas.length}</p><p className="text-[10px] text-muted-foreground">Atrasadas</p></div>
              <div className="text-center p-2 rounded-lg bg-muted"><p className="text-xl font-bold text-muted-foreground">{naoIniciadas.length}</p><p className="text-[10px] text-muted-foreground">Não Iniciadas</p></div>
            </div>

            {cronogramaView === 'gantt' ? (
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <GanttChart categorias={categorias} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {categorias.map(c => {
                  const status = computeStatus(c);
                  const pct = computePercentual(c);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors print:p-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {status === 'concluida' ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> :
                         status === 'atrasada' ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> :
                         status === 'em_andamento' ? <TrendingUp className="h-4 w-4 text-primary shrink-0" /> :
                         <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="text-sm text-foreground truncate">{c.nome}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-20"><Progress value={pct} className="h-1.5" /></div>
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
                {categorias.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma etapa cadastrada no orçamento.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 9. Estoque Crítico */}
      {materiaisBaixo.length > 0 && (
        <div data-print-section="estoqueCritico">
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
                    <div><p className="text-sm font-medium text-foreground">{m.nome}</p><p className="text-xs text-muted-foreground">{m.categoria}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold text-destructive">{m.estoqueAtual} {m.unidade}</p><p className="text-xs text-muted-foreground">Mín: {m.estoqueMinimo} {m.unidade}</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 10. Diário de Obra — Collapsible */}
      <div data-print-section="diario">
        <Collapsible open={diarioOpen} onOpenChange={setDiarioOpen}>
          <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Diário de Obra
                  <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-[10px] ml-1">
                    {diarioRegistros.length}
                  </Badge>
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 print:hidden">
                    <ChevronDown className={`h-4 w-4 transition-transform ${diarioOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {diarioRegistros.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro no diário desta obra.</p>
              )}
              {diarioRegistros.slice(0, 3).map(r => (
                <DiarioItem key={r.id} r={r} />
              ))}
              <CollapsibleContent className="space-y-3">
                {diarioRegistros.slice(3, 8).map(r => (
                  <DiarioItem key={r.id} r={r} />
                ))}
              </CollapsibleContent>
              {diarioRegistros.length > 3 && !diarioOpen && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-primary w-full print:hidden">
                    Ver mais {diarioRegistros.length - 3} registro(s)
                  </Button>
                </CollapsibleTrigger>
              )}
            </CardContent>
          </Card>
        </Collapsible>
      </div>

      {/* Rodapé print */}
      <div className="hidden print:block text-center text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
        <p>Panorama Geral gerado em {format(today, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        <p>{obra.codigo} — {obra.nome}</p>
      </div>
    </div>
  );
}

function DiarioItem({ r }: { r: DiarioRow }) {
  return (
    <div className="border-b border-border pb-3 last:border-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <p className="text-sm font-medium text-foreground">{formatDate(r.data)}</p>
        <span className="text-xs">{climaLabels[r.clima as keyof typeof climaLabels]}</span>
        <span className="text-xs text-muted-foreground">· {r.usuario_nome}</span>
        <span className="text-xs text-muted-foreground">· {r.trabalhadores} trab.</span>
        <Badge variant="secondary" className={
          r.status === 'aprovado' ? 'bg-success/10 text-success border-0 text-[10px]' :
          r.status === 'pendente' ? 'bg-warning/10 text-warning border-0 text-[10px]' :
          'bg-destructive/10 text-destructive border-0 text-[10px]'
        }>{statusDiarioLabels[r.status as keyof typeof statusDiarioLabels] || r.status}</Badge>
      </div>
      {r.servicos_executados && (<p className="text-sm text-muted-foreground line-clamp-1">{r.servicos_executados}</p>)}
      {r.problemas && (<p className="text-xs text-destructive mt-1">⚠️ {r.problemas}</p>)}
    </div>
  );
}

function FuncionarioPainel() {
  const { obras } = useObras();
  const { getOrcamento } = useOrcamento();
  const { user } = useAuth();
  const obra = obras[0];
  const [diarioRegistros, setDiarioRegistros] = useState<DiarioRow[]>([]);

  useEffect(() => {
    if (!obra) return;
    supabase.from('diario_registros').select('*').eq('obra_id', obra.id)
      .order('data', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setDiarioRegistros(data as DiarioRow[]); });
  }, [obra?.id]);

  const meusRegistros = diarioRegistros.filter(d => d.usuario_nome === user?.name);
  const orcamento = obra ? getOrcamento(obra.id) : null;
  const categorias = orcamento?.categorias || [];
  const etapasAndamento = categorias.filter(c => c.statusCronograma === 'em_andamento');

  if (!obra) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Nenhuma obra disponível.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel da Obra</h1>
        <p className="text-muted-foreground text-sm">Bem-vindo de volta, {user?.name || 'Funcionário'}</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground">{obra.nome}</h3>
          <p className="text-sm text-muted-foreground">{obra.endereco}</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium text-foreground">{obra.percentualAndamento}%</span>
            </div>
            <Progress value={obra.percentualAndamento} className="h-2" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/diario"><Button className="w-full h-auto py-4 flex-col gap-2"><BookOpen className="h-5 w-5" /><span className="text-xs">Novo Diário</span></Button></Link>
        <Link to="/estoque"><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2"><Package className="h-5 w-5" /><span className="text-xs">Estoque</span></Button></Link>
      </div>
      {etapasAndamento.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">Etapas em Andamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {etapasAndamento.map(e => (
              <div key={e.id} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="font-medium text-foreground">{e.nome}</span><span className="text-muted-foreground">{e.percentualCronograma || 0}%</span></div>
                <Progress value={e.percentualCronograma || 0} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="shadow-card">
        <CardHeader className="pb-3"><CardTitle className="text-base">Meus Registros Recentes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {meusRegistros.slice(0, 4).map(d => (
            <div key={d.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <div><p className="text-sm font-medium text-foreground">{formatDate(d.data)}</p><p className="text-xs text-muted-foreground line-clamp-1">{d.servicos_executados}</p></div>
              <Badge variant="secondary" className={d.status === 'aprovado' ? 'bg-success/10 text-success border-0' : 'bg-warning/10 text-warning border-0'}>{statusDiarioLabels[d.status as keyof typeof statusDiarioLabels]}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientePainel() {
  const { obras } = useObras();
  const { getOrcamento } = useOrcamento();
  const obra = obras[0];
  const [diarioRegistros, setDiarioRegistros] = useState<DiarioRow[]>([]);

  useEffect(() => {
    if (!obra) return;
    supabase.from('diario_registros').select('*').eq('obra_id', obra.id)
      .order('data', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setDiarioRegistros(data as DiarioRow[]); });
  }, [obra?.id]);

  const orcamento = obra ? getOrcamento(obra.id) : null;
  const categorias = orcamento?.categorias || [];
  const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);
  const registrosAprovados = diarioRegistros.filter(d => d.status === 'aprovado');
  const proximasEtapas = categorias.filter(c => c.statusCronograma === 'em_andamento' || c.statusCronograma === 'nao_iniciada').slice(0, 3);

  if (!obra) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Nenhuma obra disponível.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Obra</h1>
        <p className="text-muted-foreground text-sm">Acompanhe o andamento da sua obra</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-foreground">{obra.nome}</h3>
          <p className="text-sm text-muted-foreground mb-4">{obra.endereco}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso Geral</span>
              <span className="text-lg font-bold text-primary">{obra.percentualAndamento}%</span>
            </div>
            <Progress value={obra.percentualAndamento} className="h-3" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Previsto</p><p className="text-base font-bold text-foreground">{formatCurrency(totalPrevisto)}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Andamento</p><p className="text-base font-bold text-foreground">{obra.percentualAndamento}%</p></CardContent></Card>
      </div>
      {proximasEtapas.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">Próximas Etapas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {proximasEtapas.map(e => (
              <div key={e.id} className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-foreground">{e.nome}</p><p className="text-xs text-muted-foreground">{e.dataInicioPrevista ? formatDate(e.dataInicioPrevista) : '—'} → {e.dataFimPrevista ? formatDate(e.dataFimPrevista) : '—'}</p></div>
                <Badge variant="secondary" className={e.statusCronograma === 'em_andamento' ? 'bg-primary/10 text-primary border-0' : 'bg-muted text-muted-foreground border-0'}>{e.statusCronograma ? statusEtapaLabels[e.statusCronograma] : 'Não iniciada'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="shadow-card">
        <CardHeader className="pb-3"><CardTitle className="text-base">Últimas Atualizações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {registrosAprovados.slice(0, 4).map(d => (
            <div key={d.id} className="border-b border-border pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1"><p className="text-sm font-medium text-foreground">{formatDate(d.data)}</p><span className="text-xs text-muted-foreground">{climaLabels[d.clima as keyof typeof climaLabels]}</span></div>
              <p className="text-sm text-muted-foreground">{d.servicos_executados}</p>
              {d.problemas && <p className="text-xs text-destructive mt-1">⚠ {d.problemas}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PainelObraPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'gestor') return <GestorPainel />;
  if (user.role === 'funcionario') return <FuncionarioPainel />;
  return <ClientePainel />;
}
