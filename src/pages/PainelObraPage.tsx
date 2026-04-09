import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useCustoReal } from '@/contexts/CustoRealContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  formatCurrency, formatDate, statusEtapaLabels, climaLabels, statusDiarioLabels
} from '@/data/mockData';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Package, BookOpen,
  Clock, CalendarDays, DollarSign, Users, Building2,
  BarChart3, Plus
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SCurveChart from '@/components/painel/SCurveChart';
import ABCTable from '@/components/painel/ABCTable';
import PrintSectionPicker, { PrintSections, defaultPrintSections } from '@/components/painel/PrintSectionPicker';

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

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  useEffect(() => {
    if (!obra) return;
    supabase.from('diario_registros').select('*').eq('obra_id', obra.id)
      .order('data', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setDiarioRegistros(data as DiarioRow[]); });
  }, [obra?.id]);

  const handleObraSelectChange = (value: string) => {
    if (value === '__nova_obra__') {
      navigate('/obras?nova=1');
    } else {
      setSelectedObraId(value);
    }
  };

  if (!obra) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground text-sm">Nenhuma obra cadastrada.</p>
        <Button onClick={() => navigate('/obras?nova=1')}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Nova Obra
        </Button>
      </div>
    );
  }

  const orcamento = getOrcamento(obra.id);
  const categorias = orcamento?.categorias || [];
  const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);
  const custoItens = getCustoItensByObra(obra.id);
  const totalRealizado = custoItens.reduce((s, i) => s + i.precoTotal, 0);
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

  const totalTrabalhadores = registrosAprovados.length > 0
    ? Math.round(registrosAprovados.reduce((s, r) => s + r.trabalhadores, 0) / registrosAprovados.length)
    : 0;

  const desvioOrcamento = totalRealizado - totalPrevisto;
  const statusPrazo = andamentoReal >= andamentoPlanejado ? 'No prazo' : 'Atrasada';

  const handlePrint = () => {
    // Apply print section visibility via data attributes
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel da Obra</h1>
          <p className="text-muted-foreground text-sm">Visão executiva consolidada</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedObraId} onValueChange={handleObraSelectChange}>
            <SelectTrigger className="w-[280px] h-9 text-sm">
              <SelectValue placeholder="Selecionar obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>
              ))}
              <SelectItem value="__nova_obra__" className="text-primary font-medium">
                <span className="flex items-center gap-2"><Plus className="h-3.5 w-3.5" /> Criar Nova Obra</span>
              </SelectItem>
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

      {/* 1. Cabeçalho da obra */}
      <div data-print-section="identificacao">
        <Card className="shadow-card print:shadow-none print:border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identificação da Obra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Obra</p><p className="font-semibold text-foreground">{obra.nome}</p></div>
              <div><p className="text-muted-foreground text-xs">Código</p><p className="font-semibold text-foreground">{obra.codigo}</p></div>
              <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-semibold text-foreground">{obra.cliente || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">Responsável</p><p className="font-semibold text-foreground">{obra.responsavel || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">Endereço</p><p className="font-semibold text-foreground">{obra.endereco || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">Início</p><p className="font-semibold text-foreground">{formatDate(obra.dataInicio)}</p></div>
              <div><p className="text-muted-foreground text-xs">Previsão de Término</p><p className="font-semibold text-foreground">{formatDate(obra.dataPrevisaoTermino)}</p></div>
              <div><p className="text-muted-foreground text-xs">Status</p><Badge variant="secondary" className="mt-0.5">{obra.status === 'em_andamento' ? 'Em Andamento' : obra.status === 'concluida' ? 'Concluída' : obra.status === 'planejamento' ? 'Planejamento' : 'Pausada'}</Badge></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. KPIs */}
      <div data-print-section="kpis">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
          <Card className="shadow-card print:shadow-none print:border"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground font-medium">Orçamento Planejado</p></div><p className="text-lg font-bold text-foreground">{formatCurrency(totalPrevisto)}</p></CardContent></Card>
          <Card className="shadow-card print:shadow-none print:border"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground font-medium">Custo Realizado</p></div><p className="text-lg font-bold text-foreground">{custoItens.length > 0 ? formatCurrency(totalRealizado) : '—'}</p>{custoItens.length > 0 && desvioOrcamento !== 0 && (<p className={`text-[10px] font-medium ${desvioOrcamento > 0 ? 'text-destructive' : 'text-success'}`}>{desvioOrcamento >= 0 ? '+' : ''}{formatCurrency(desvioOrcamento)}</p>)}</CardContent></Card>
          <Card className="shadow-card print:shadow-none print:border"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><CalendarDays className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground font-medium">Andamento Planejado</p></div><p className="text-lg font-bold text-foreground">{andamentoPlanejado}%</p><Progress value={andamentoPlanejado} className="h-1.5 mt-1" /></CardContent></Card>
          <Card className="shadow-card print:shadow-none print:border"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground font-medium">Andamento Real</p></div><p className="text-lg font-bold text-foreground">{andamentoReal}%</p><Progress value={andamentoReal} className="h-1.5 mt-1" />{andamentoPlanejado > 0 && (<p className={`text-[10px] font-medium mt-0.5 ${andamentoReal >= andamentoPlanejado ? 'text-success' : 'text-destructive'}`}>{statusPrazo}</p>)}</CardContent></Card>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 mt-3">
          <Card className="shadow-card print:shadow-none print:border"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground font-medium">Status de Prazo</p></div><Badge variant="secondary" className={andamentoReal >= andamentoPlanejado ? 'bg-success/10 text-success border-0' : 'bg-destructive/10 text-destructive border-0'}>{statusPrazo}</Badge></CardContent></Card>
          <Card className="shadow-card print:shadow-none print:border"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><BookOpen className="h-4 w-4 text-warning" /><p className="text-xs text-muted-foreground font-medium">Pendências</p></div><p className="text-lg font-bold text-foreground">{registrosPendentes.length}</p><p className="text-[10px] text-muted-foreground">aguardando aprovação</p></CardContent></Card>
          <Card className="shadow-card print:shadow-none print:border"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground font-medium">Méd. Trabalhadores/dia</p></div><p className="text-lg font-bold text-foreground">{totalTrabalhadores}</p><p className="text-[10px] text-muted-foreground">{registrosAprovados.length} registro(s)</p></CardContent></Card>
          <Card className="shadow-card print:shadow-none print:border"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-warning" /><p className="text-xs text-muted-foreground font-medium">Alertas Totais</p></div><p className={`text-lg font-bold ${(atrasadas.length + materiaisBaixo.length + registrosPendentes.length) > 0 ? 'text-warning' : 'text-foreground'}`}>{atrasadas.length + materiaisBaixo.length + registrosPendentes.length}</p></CardContent></Card>
        </div>
      </div>

      {/* 3. Pontos de Atenção */}
      {(atrasadas.length > 0 || materiaisBaixo.length > 0 || registrosPendentes.length > 0) && (
        <div data-print-section="pontosAtencao">
          <Card className="shadow-card border-warning/30 print:shadow-none print:border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Pontos de Atenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {atrasadas.map(c => (
                <div key={c.id} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-destructive mt-0.5">📅</span>
                  <span><strong>{c.nome}</strong> — etapa atrasada ({computePercentual(c)}% concluído)</span>
                </div>
              ))}
              {materiaisBaixo.map(m => (
                <div key={m.id} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-warning mt-0.5">📦</span>
                  <span><strong>{m.nome}</strong> — estoque em {m.estoqueAtual} {m.unidade} (mínimo: {m.estoqueMinimo})</span>
                </div>
              ))}
              {registrosPendentes.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-warning mt-0.5">📋</span>
                  <span>{registrosPendentes.length} registro(s) de diário pendente(s) de aprovação</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Curva S */}
      <div data-print-section="curvaS">
        <SCurveChart
          categorias={categorias}
          custoItens={custoItens}
          obraInicio={obra.dataInicio}
          obraFim={obra.dataPrevisaoTermino}
        />
      </div>

      {/* 5. Resumo do Cronograma */}
      <div data-print-section="cronograma">
        <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Resumo do Cronograma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-success/10"><p className="text-xl font-bold text-success">{concluidas.length}</p><p className="text-[10px] text-muted-foreground">Concluídas</p></div>
              <div className="text-center p-2 rounded-lg bg-primary/10"><p className="text-xl font-bold text-primary">{emAndamento.length}</p><p className="text-[10px] text-muted-foreground">Em Andamento</p></div>
              <div className="text-center p-2 rounded-lg bg-destructive/10"><p className="text-xl font-bold text-destructive">{atrasadas.length}</p><p className="text-[10px] text-muted-foreground">Atrasadas</p></div>
              <div className="text-center p-2 rounded-lg bg-muted"><p className="text-xl font-bold text-muted-foreground">{naoIniciadas.length}</p><p className="text-[10px] text-muted-foreground">Não Iniciadas</p></div>
            </div>
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
          </CardContent>
        </Card>
      </div>

      {/* 6. Custos por Etapa */}
      <div data-print-section="custosEtapa">
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
                    <span className="text-sm text-foreground w-40 sm:w-48 shrink-0 truncate">{c.nome}</span>
                    <div className="flex-1"><Progress value={pctCusto} className="h-2" /></div>
                    <span className="text-xs text-muted-foreground w-24 text-right hidden sm:block">{formatCurrency(c.precoTotal)}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pctCusto}%</span>
                  </div>
                );
              })}
              {categorias.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-foreground w-40 sm:w-48 shrink-0">Total</span>
                    <div className="flex-1" />
                    <span className="text-sm font-bold text-foreground w-24 text-right hidden sm:block">{formatCurrency(totalPrevisto)}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">100%</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7. Curva ABC */}
      <div data-print-section="curvaABC">
        <ABCTable categorias={categorias} custoItens={custoItens} />
      </div>

      {/* 8. Estoque Crítico */}
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

      {/* 9. Últimos Registros do Diário */}
      <div data-print-section="diario">
        <Card className="shadow-card print:shadow-none print:border print:break-inside-avoid">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Últimos Registros do Diário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diarioRegistros.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro no diário desta obra.</p>
            )}
            {diarioRegistros.slice(0, 8).map(r => (
              <div key={r.id} className="border-b border-border pb-3 last:border-0">
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
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 10. Ações rápidas */}
      <Card className="shadow-card print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { to: '/orcamento', label: 'Orçamento', icon: DollarSign },
              { to: '/custo-real', label: 'Custo Real', icon: BarChart3 },
              { to: '/cronograma', label: 'Cronograma', icon: CalendarDays },
              { to: '/diario', label: 'Diário', icon: BookOpen },
              { to: '/estoque', label: 'Estoque', icon: Package },
              { to: '/obras', label: 'Obras', icon: Building2 },
            ].map(item => (
              <Link key={item.to} to={item.to}>
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5">
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rodapé print */}
      <div className="hidden print:block text-center text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
        <p>Panorama Geral gerado em {format(today, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        <p>{obra.codigo} — {obra.nome}</p>
      </div>
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
