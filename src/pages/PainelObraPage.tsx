import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useCustoReal } from '@/contexts/CustoRealContext';
import { useCronograma } from '@/hooks/useCronograma';
import { supabase } from '@/integrations/supabase/untyped';
import {
  LayoutDashboard, AlertTriangle, CheckCircle2, BookOpen,
  CalendarDays, Wallet, Package, ArrowRight, Lightbulb, TrendingUp, AlertCircle, PlayCircle, Info, FileSignature, Sparkles
} from 'lucide-react';
import PageShell, { PageKPI } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/data/mockData';
import { format, parseISO, isBefore, isAfter, addDays, startOfDay, startOfWeek, endOfWeek, differenceInDays, startOfMonth, endOfMonth, differenceInBusinessDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LinksDeAcessoCard from '@/components/obra/LinksDeAcessoCard';
import NoObraState from '@/components/obras/NoObraState';

export default function PainelObraPage() {
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const navigate = useNavigate();

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  const { getOrcamento } = useOrcamento();
  const { getMateriaisByObra } = useEstoque();
  const { getItensByObra: getCustoItens } = useCustoReal();
  const { tarefas, impedimentos, stats, loading: loadingCronograma } = useCronograma(obra?.id);

  // States
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  useEffect(() => {
    if (!obra?.id) return;
    setLoadingExtras(true);
    Promise.all([
      supabase.from('pagamentos').select('id, status, data_vencimento, valor_previsto, descricao').eq('obra_id', obra.id)
        .then(({ data, error }) => { if (error) console.error('[DEBUG página pagamentos]', error); return { data, error }; }),
      supabase.from('diario_registros').select('id, data, status').eq('obra_id', obra.id).order('data', { ascending: false })
        .then(({ data, error }) => { if (error) console.error('[DEBUG página diario]', error); return { data, error }; }),
      supabase.from('contratos').select('id, descricao, data_inicio, data_fim_prevista, valor_atual, contratos_medicoes!contratos_medicoes_contrato_id_fkey(id, data_referencia, status)').eq('obra_id', obra.id)
        .then(({ data, error }) => { if (error) console.error('[DEBUG página contratos]', error); return { data, error }; })
    ]).then(([resPag, resDia, resCont]) => {
      setPagamentos(resPag.data || []);
      setDiarios(resDia.data || []);
      setContratos(resCont.data || []);
      setLoadingExtras(false);
    });
  }, [obra?.id]);

  if (!obra) {
    return <NoObraState title="Nenhuma obra cadastrada" description="Transite em obras para visualizar o painel executivo." />;
  }

  // Helpers
  const hoje = startOfDay(new Date());
  const strHoje = format(hoje, 'yyyy-MM-dd');

  // Cálculos Básicos
  const orcamento = getOrcamento(obra.id);
  const etapasOrcamento = orcamento?.etapas || [];
  const totalPrevisto = etapasOrcamento.reduce((s, c) => s + c.precoTotal, 0);
  const custos = getCustoItens(obra.id);
  const totalRealizado = custos.reduce((s, i) => s + i.valor, 0);

  const materiaisObra = getMateriaisByObra(obra.id);
  const materiaisCriticos = materiaisObra.filter(m => m.estoqueAtual < m.estoqueMinimo);
  const impedimentosAbertos = impedimentos.filter(i => !i.resolvido);

  const filterPagamentos = (fn: (p: any) => boolean) => pagamentos.filter(fn);

  // --- HOJE NA OBRA (Variáveis Base) ---
  const tarefasAtrasadas = tarefas.filter(t => t.data_fim && t.percentual_concluido < 100 && isBefore(parseISO(t.data_fim), hoje));
  const vencidos = filterPagamentos(p => p.status === 'atrasado' || (p.status === 'previsto' && p.data_vencimento && isBefore(parseISO(p.data_vencimento), hoje)));
  const diarioHojePreenchido = diarios.some(d => d.data === strHoje);

  let urgencyLevel: 'green' | 'amber' | 'red' = 'green';
  const hasUrgenciasAbertas = tarefasAtrasadas.length > 0 || !diarioHojePreenchido || materiaisCriticos.length > 0;
  const hasBloqueios = impedimentosAbertos.length > 0 || vencidos.length > 0;
  if (hasBloqueios) urgencyLevel = 'red';
  else if (hasUrgenciasAbertas) urgencyLevel = 'amber';

  const urgenceBg = urgencyLevel === 'red' ? 'bg-red-50 border-red-200' : urgencyLevel === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';
  const urgenceIconColor = urgencyLevel === 'red' ? 'text-red-500' : urgencyLevel === 'amber' ? 'text-amber-500' : 'text-emerald-500';

  // --- TRÍPTICO TEMPORAL ---
  // Esta Semana
  const inicioSemana = startOfWeek(hoje, { weekStartsOn: 1 });
  const fimSemana = endOfWeek(hoje, { weekStartsOn: 1 });
  const etapasFinalizandoSemana = tarefas.filter(t => t.data_fim && t.percentual_concluido < 100 &&
    isAfter(parseISO(t.data_fim), hoje) && isBefore(parseISO(t.data_fim), addDays(fimSemana, 1)));
  const pagamentosSemana = filterPagamentos(p => p.status === 'previsto' && p.data_vencimento &&
    isAfter(parseISO(p.data_vencimento), hoje) && isBefore(parseISO(p.data_vencimento), addDays(fimSemana, 1)));
  const diariosSemanaCount = diarios.filter(d => isAfter(parseISO(d.data), addDays(inicioSemana, -1)) && isBefore(parseISO(d.data), addDays(fimSemana, 1))).length;

  // Este Mês
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  const etapasIniciandoMes = tarefas.filter(t => t.data_inicio && (t.percentual_concluido || 0) === 0 &&
    isAfter(parseISO(t.data_inicio), addDays(inicioMes, -1)) && isBefore(parseISO(t.data_inicio), addDays(fimMes, 1)));
  const contratosAtivosSemMedicao = contratos.filter(c => {
    const purs = c.contratos_medicoes || [];
    if (purs.length === 0) return true;
    const last = [...purs].sort((a: any, b: any) => new Date(b.data_referencia).getTime() - new Date(a.data_referencia).getTime())[0];
    return differenceInDays(hoje, parseISO(last.data_referencia)) >= 25 && last.status !== 'concluida';
  });

  // --- INTELIGÊNCIA DECISIONAL ---
  const alertas = [];

  // Alerta 1: Desvio de prazo com causa
  if (tarefasAtrasadas.length > 0 && impedimentosAbertos.length > 0) {
    alertas.push({
      id: 'alerta1', type: 'atraso', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle,
      title: `⚠ Etapa(s) atrasada(s) — ${impedimentosAbertos.length} impedimento(s) podem ser a causa.`,
      action: 'Ver impedimentos', link: '/cronograma?tab=impedimentos'
    });
  }

  // Alerta 2: Correlação financeira via categorias / orçado
  const catCustos: Record<string, number> = {};
  custos.forEach(c => { if (c.etapaNome) catCustos[c.etapaNome] = (catCustos[c.etapaNome] || 0) + c.valor; });
  for (const cat of etapasOrcamento) {
    if (catCustos[cat.nome] && cat.precoTotal > 0 && (catCustos[cat.nome] / cat.precoTotal) >= 0.85 && (catCustos[cat.nome] / cat.precoTotal) < 1.0) {
      alertas.push({
        id: 'alerta2', type: 'financeiro', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Wallet,
        title: `⚠ Etapa "${cat.nome}": custo real atingiu ${Math.round((catCustos[cat.nome] / cat.precoTotal) * 100)}%+ do previsto.`,
        action: 'Ver custos', link: '/financeiro?tab=custo-real'
      });
      break; 
    }
  }

  // Alerta 3: BM não gerado
  if (contratosAtivosSemMedicao.length > 0) {
    alertas.push({
      id: 'alerta3', type: 'contrato', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: FileSignature,
      title: `💡 Medição de contrato(s) com mais de 25d sem emissão no sistema.`,
      action: 'Gerar medição', link: '/contratos'
    });
  }

  // Alerta 4: Inatividade no diário
  const diasSemDiario = diarios.length > 0 ? differenceInBusinessDays(hoje, parseISO(diarios[0].data)) : 999;
  if (diasSemDiario >= 3) {
    alertas.push({
      id: 'alerta4', type: 'diario', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: Info,
      title: `💡 O diário de obra não recebe registros há ${diasSemDiario === 999 ? 'vários' : diasSemDiario} dias úteis.`,
      action: 'Registrar hoje', link: '/diario'
    });
  }

  const sortedAlertas = alertas.slice(0, 4);

  // --- KPIS CALCULAÇÃO ---
  const activeTarefas = tarefas.filter(t => t.data_fim);
  const scheduledDone = activeTarefas.filter(t => isBefore(parseISO(t.data_fim!), hoje)).length;
  const andamentoPlanejado = activeTarefas.length > 0 ? (scheduledDone / activeTarefas.length) * 100 : 0;
  const andamentoReal = stats.progressoGeral;

  let spiVal = andamentoPlanejado > 0 ? andamentoReal / andamentoPlanejado : 1.0;
  let spiColor = spiVal >= 0.9 ? '#10b981' : spiVal >= 0.7 ? '#f59e0b' : '#ef4444';

  let diasFaltantes = 0;
  let maxData = '';
  tarefas.forEach(t => { if (t.data_fim && t.data_fim > maxData) maxData = t.data_fim; });
  if (maxData) {
    diasFaltantes = differenceInDays(parseISO(maxData), hoje);
  }

  const pctFinanceiro = totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0;

  const shellKpis: PageKPI[] = [
    {
      id: 'kpi-avanco', label: 'Avanço Realizado', value: `${andamentoReal}%`, icon: <LayoutDashboard size={18} className="text-primary" />,
      main: true, tint: '#fdfbfe', valueColor: 'var(--color-primary)', labelColor: '#6b7280',
    },
    {
      id: 'kpi-spi', label: 'SPI (Efic. de Prazo)', value: spiVal.toFixed(2), icon: <TrendingUp size={18} style={{ color: spiColor }} />,
      tint: '#fafafa', valueColor: spiColor, labelColor: '#6b7280',
      sublabel: spiVal >= 0.9 ? 'Cronograma em dia' : 'Obra levemente atrasada'
    },
    {
      id: 'kpi-fin', label: 'Custo vs Orçado', value: `${pctFinanceiro}%`, icon: <Wallet size={18} className="text-slate-500" />,
      tint: '#fafafa', valueColor: pctFinanceiro > 100 ? '#ef4444' : '#334155', labelColor: '#6b7280',
    },
    {
      id: 'kpi-prazo', label: 'Entrega Final', value: maxData ? format(parseISO(maxData), 'dd/MMM/yy', { locale: ptBR }) : 'N/D', icon: <CalendarDays size={18} className="text-sky-600" />,
      tint: '#f0f9ff', valueColor: '#0284c7', labelColor: '#0369a1', sublabel: diasFaltantes < 0 ? `${Math.abs(diasFaltantes)} dias de atraso global` : `${diasFaltantes} dias restantes`
    }
  ];

  return (
    <PageShell
      title="Painel da Obra"
      subtitle="Cockpit executivo e inteligência de acompanhamento"
      icon={<LayoutDashboard className="h-5 w-5" />}
      kpis={shellKpis}
    >
      {(loadingExtras || loadingCronograma) ? (
        <div className="h-[200px] flex items-center justify-center animate-pulse text-muted-foreground"><p>Calculando inteligência e consolidando dados da obra...</p></div>
      ) : (
        <div className="max-w-[1280px] w-full mx-auto space-y-6 pb-20 animate-fade-in mt-1 overflow-y-auto h-full px-4 sm:px-6">
          
          {/* Hoje na Obra */}
          <section className={`border rounded-xl px-5 py-4 ${urgenceBg} shrink-0 shadow-sm transition-colors`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                  {urgencyLevel === 'green' ? <CheckCircle2 className={`h-5 w-5 ${urgenceIconColor}`} /> : <AlertCircle className={`h-5 w-5 ${urgenceIconColor}`} />}
                  {urgencyLevel === 'green' ? '✓ Obra em dia' : 'Itens que precisam da sua atenção:'}
                </h3>
                
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {tarefasAtrasadas.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/cronograma')} className="border-orange-200 bg-white hover:bg-orange-50 text-orange-700 h-8 font-medium">
                      ⚠ {tarefasAtrasadas.length} etapa(s) atrasada(s)
                    </Button>
                  )}
                  {impedimentosAbertos.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/cronograma?tab=impedimentos')} className="border-red-200 bg-white hover:bg-red-50 text-red-700 h-8 font-medium">
                      ⛔ {impedimentosAbertos.length} impedimento(s) aberto(s)
                    </Button>
                  )}
                  {vencidos.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/financeiro?tab=pagamentos')} className="border-red-200 bg-white hover:bg-red-50 text-red-700 h-8 font-medium">
                      💰 {vencidos.length} pagamento(s) vencido(s)
                    </Button>
                  )}
                  {!diarioHojePreenchido && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/diario')} className="border-amber-200 bg-white hover:bg-amber-50 text-amber-700 h-8 font-medium">
                      📋 Diário não preenchido hoje
                    </Button>
                  )}
                  {materiaisCriticos.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/estoque')} className="border-amber-200 bg-white hover:bg-amber-50 text-amber-700 h-8 font-medium">
                      📦 {materiaisCriticos.length} material(is) crítico(s)
                    </Button>
                  )}
                  {urgencyLevel === 'green' && (
                    <p className="text-sm text-emerald-800">Sem ocorrências ou bloqueios detectados para o dia atual.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              
              {/* Intel Decisional */}
              {sortedAlertas.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Lightbulb className="h-4 w-4" /> Inteligência Decisional</h4>
                  <div className="grid gap-3">
                    {sortedAlertas.map((alt, i) => (
                      <div key={alt.id + i} className={`flex items-center justify-between p-3 rounded-lg border ${alt.bg} ${alt.border}`}>
                        <div className="flex items-center gap-3">
                          <alt.icon className={`h-4 w-4 ${alt.color}`} />
                          <span className="text-sm font-medium text-foreground">{alt.title}</span>
                        </div>
                        <Button variant="ghost" size="sm" className={`text-xs h-7 shrink-0 hover:${alt.bg} ${alt.color}`} onClick={() => navigate(alt.link)}>
                          {alt.action} <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Tríptico */}
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><PlayCircle className="h-4 w-4" /> Próximas Ações e Saúde</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                  <Card className="shadow-none border-border bg-card/60">
                    <CardHeader className="p-3 pb-2 border-b"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Contexto diário (Hoje)</CardTitle></CardHeader>
                    <CardContent className="p-3 space-y-4 pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status Diário de Obra</p>
                        <Badge variant="outline" className={`font-medium ${diarioHojePreenchido ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {diarioHojePreenchido ? 'Preenchido' : 'Pendente Preenchimento'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Impedimentos Ativos</p>
                        <Link to="/cronograma?tab=impedimentos" className="text-sm font-semibold hover:underline text-foreground">
                          {impedimentosAbertos.length} bloqueio(s) registrado(s)
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-none border-border bg-card/60">
                    <CardHeader className="p-3 pb-2 border-b"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Esta Semana</CardTitle></CardHeader>
                    <CardContent className="p-3 space-y-4 pt-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Entregas de Cronograma</p>
                        <p className="text-sm font-semibold">{etapasFinalizandoSemana.length} etapa(s) previstas para fim</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Obrigações Financeiras</p>
                        <p className="text-sm font-semibold">{pagamentosSemana.length} boletos / pagamentos</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Aderência de Diário</p>
                        <p className="text-sm font-semibold">{diariosSemanaCount} dias úteis com registro</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border bg-card/60">
                    <CardHeader className="p-3 pb-2 border-b"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Este Mês</CardTitle></CardHeader>
                    <CardContent className="p-3 space-y-4 pt-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Gestão de Empreiteiros</p>
                        <p className="text-sm font-semibold">{contratosAtivosSemMedicao.length} contratos sem medição recente</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Kick-off de Etapas</p>
                        <p className="text-sm font-semibold">{etapasIniciandoMes.length} etapa(s) para iniciar este mês</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Semáforo Financeiro */}
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Wallet className="h-4 w-4" /> Semáforo Financeiro</h4>
                <Card className="shadow-sm border-border bg-white overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-border min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Custo Total Orçado (Teto)</p>
                      <p className="text-xl font-bold font-mono text-slate-700">{formatCurrency(totalPrevisto)}</p>
                    </div>
                    <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-border min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Custo Real Executado</p>
                      <p className="text-xl font-bold text-primary font-mono">{formatCurrency(totalRealizado)}</p>
                    </div>
                    <div className="flex-1 p-5 min-w-0 bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Percentual Executado Mão/Material</p>
                      <p className={`text-xl font-bold font-mono ${pctFinanceiro > 100 ? 'text-red-600' : 'text-emerald-600'}`}>{pctFinanceiro}%</p>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Consumo da base orçamentária global</span>
                      <span>{pctFinanceiro > 100 ? 'Orçamento estourado' : 'Dentro do previsto'}</span>
                    </div>
                    <Progress value={Math.min(pctFinanceiro, 100)} className={`h-2 ${pctFinanceiro > 100 && '[&>div]:bg-red-500'}`} />
                  </div>
                </Card>
              </section>
            </div>

            {/* Sidebar Acesso Rápido */}
            <div className="lg:col-span-4 space-y-4">
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 mt-1 flex items-center gap-1.5"><ArrowRight className="h-4 w-4" /> Acesso Rápido</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-[72px] flex-col justify-center items-center gap-1.5 shadow-sm border-dashed hover:border-primary hover:text-primary transition-colors hover:bg-primary/5" onClick={() => navigate('/diario')}>
                    <BookOpen className="h-5 w-5" />
                    <span className="text-[11px] font-medium">+ Novo Diário</span>
                  </Button>
                  <Button variant="outline" className="h-[72px] flex-col justify-center items-center gap-1.5 shadow-sm border-dashed hover:border-primary hover:text-primary transition-colors hover:bg-primary/5" onClick={() => navigate('/cronograma')}>
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Progresso</span>
                  </Button>
                  <Button variant="outline" className="h-[72px] flex-col justify-center items-center gap-1.5 shadow-sm border-dashed hover:border-primary hover:text-primary transition-colors hover:bg-primary/5" onClick={() => navigate('/financeiro?tab=pagamentos&adicionar=1')}>
                    <Wallet className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Registrar Pgto</span>
                  </Button>
                  <Button variant="outline" className="h-[72px] flex-col justify-center items-center gap-1.5 shadow-sm border-dashed hover:border-[#534AB7] hover:text-[#534AB7] transition-colors hover:bg-[#534AB7]/5 text-muted-foreground" onClick={() => navigate('/intelligence')}>
                    <Sparkles className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Intelligence</span>
                  </Button>
                </div>
              </section>

              <div className="pt-2">
                <LinksDeAcessoCard obraId={obra.id} />
              </div>
            </div>
          </div>

        </div>
      )}
    </PageShell>
  );
}
