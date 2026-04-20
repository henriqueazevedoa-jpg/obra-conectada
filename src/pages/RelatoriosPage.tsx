/**
 * RelatoriosPage — E6
 * Relatório consolidado da obra com dados 100% reais (sem mockDiario)
 * + Exportação PDF via jsPDF / jspdf-autotable
 */
import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import NoObraState from '@/components/obras/NoObraState';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Package, BookOpen,
  Clock, CalendarDays, DollarSign, Users, Download, Printer,
  FileText, Loader2, Receipt, BarChart3,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface DiarioRegistro {
  id: string;
  data: string;
  clima: string;
  trabalhadores: number;
  servicos_executados: string | null;
  observacoes: string | null;
  problemas: string | null;
  status: string;
  usuario_nome: string | null;
}

interface PagamentoResumo {
  id: string;
  descricao: string;
  valor_previsto: number;
  data_vencimento: string;
  status: string;
  tipo_pagamento: string;
  etapa_orcamento: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'dd/MM/yyyy'); } catch { return '—'; }
}

const CLIMA_LABELS: Record<string, string> = {
  ensolarado: '☀️ Ensolarado',
  nublado: '☁️ Nublado',
  chuvoso: '🌧️ Chuvoso',
  parcialmente_nublado: '⛅ Parcialmente Nublado',
  tempestade: '⛈️ Tempestade',
};

const STATUS_LABELS: Record<string, string> = {
  aprovado: 'Aprovado', pendente: 'Pendente', rejeitado: 'Rejeitado',
};

const TIPO_PAG_LABELS: Record<string, string> = {
  material: 'Material', mao_de_obra: 'Mão de Obra', servico: 'Serviço',
  aluguel: 'Aluguel', outro: 'Outro',
};

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

// ── Export PDF ─────────────────────────────────────────────────────────────────

async function exportPDF(params: {
  obra: any;
  categorias: any[];
  pagamentos: PagamentoResumo[];
  registros: DiarioRegistro[];
  totalPago: number;
  totalPrevisto: number;
  andamentoReal: number;
  mediaTrabalhadores: number;
}) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Obra', margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${params.obra.codigo ? params.obra.codigo + ' — ' : ''}${params.obra.nome}`, margin, 19);
  doc.text(`Emitido em ${today}`, margin, 24);
  y = 36;

  // ── Dados da Obra ──────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 50);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados da Obra', margin, y); y += 5;

  const obraData = [
    ['Obra', params.obra.nome, 'Código', params.obra.codigo || '—'],
    ['Cliente', params.obra.cliente || '—', 'Responsável', params.obra.responsavel || '—'],
    ['Início', fmtDate(params.obra.dataInicio), 'Prev. Término', fmtDate(params.obra.dataPrevisaoTermino)],
    ['Status', params.obra.status === 'em_andamento' ? 'Em Andamento' : params.obra.status || '—', 'Endereço', params.obra.endereco || '—'],
  ];

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [], body: obraData,
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 }, 2: { fontStyle: 'bold', cellWidth: 32 } },
    theme: 'plain',
    didDrawPage: () => {},
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Indicadores Financeiros ────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicadores', margin, y); y += 5;

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [['Indicador', 'Valor']],
    body: [
      ['Orçamento Total', fmt(params.totalPrevisto)],
      ['Total Pago', fmt(params.totalPago)],
      ['% Pago', `${params.totalPrevisto > 0 ? Math.round((params.totalPago / params.totalPrevisto) * 100) : 0}%`],
      ['Andamento Real (cronograma)', `${params.andamentoReal}%`],
      ['Média Trabalhadores/dia', String(params.mediaTrabalhadores)],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Cronograma por Etapa ───────────────────────────────────────────────────
  if (params.categorias.length > 0) {
    if (y > 220) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cronograma por Etapa', margin, y); y += 5;

    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Etapa', 'Valor Orçado', '% Concluído', 'Status']],
      body: params.categorias.map(c => [
        c.nome,
        fmt(c.precoTotal),
        `${computePercentual(c)}%`,
        ({ concluida: 'Concluída', em_andamento: 'Em Andamento', atrasada: 'Atrasada', nao_iniciada: 'Não Iniciada' } as any)[computeStatus(c)] || '—',
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Pagamentos ─────────────────────────────────────────────────────────────
  if (params.pagamentos.length > 0) {
    if (y > 200) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Pagamentos', margin, y); y += 5;

    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Descrição', 'Tipo', 'Valor', 'Vencimento', 'Status']],
      body: params.pagamentos.map(p => [
        p.descricao,
        TIPO_PAG_LABELS[p.tipo_pagamento] || p.tipo_pagamento,
        fmt(Number(p.valor_previsto)),
        fmtDate(p.data_vencimento),
        p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      theme: 'grid',
      columnStyles: { 2: { halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Diário ────────────────────────────────────────────────────────────────
  if (params.registros.length > 0) {
    if (y > 200) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Últimos Registros do Diário', margin, y); y += 5;

    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Data', 'Clima', 'Trab.', 'Serviços Executados', 'Problemas']],
      body: params.registros.slice(0, 15).map(r => [
        fmtDate(r.data),
        CLIMA_LABELS[r.clima]?.replace(/^[^\s]+ /, '') || r.clima,
        String(r.trabalhadores),
        r.servicos_executados || '—',
        r.problemas || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: { 3: { cellWidth: 55 }, 4: { cellWidth: 35 } },
      theme: 'grid',
    });
  }

  // ── Rodapé em todas as páginas ────────────────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 170);
    doc.text(
      `Obra Conectada · ${params.obra.nome} · Pág. ${i}/${pageCount}`,
      pageW / 2, doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  doc.save(`relatorio-${params.obra.codigo || params.obra.nome}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const { getOrcamento } = useOrcamento();
  const { getMateriaisByObra } = useEstoque();

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  // Dados reais
  const [registros, setRegistros] = useState<DiarioRegistro[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!obra) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('diario_registros')
        .select('id, data, clima, trabalhadores, servicos_executados, observacoes, problemas, status, usuario_nome')
        .eq('obra_id', obra.id)
        .order('data', { ascending: false })
        .limit(30),
      supabase
        .from('pagamentos')
        .select('id, descricao, valor_previsto, data_vencimento, status, tipo_pagamento, etapa_orcamento')
        .eq('obra_id', obra.id)
        .neq('status', 'cancelado')
        .order('data_vencimento', { ascending: false }),
    ]).then(([{ data: diario }, { data: pags }]) => {
      setRegistros((diario as unknown as DiarioRegistro[]) || []);
      setPagamentos((pags as unknown as PagamentoResumo[]) || []);
      setLoading(false);
    });
  }, [obra?.id]);

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra selecionada"
        description="Selecione uma obra para gerar o relatório consolidado."
      />
    );
  }

  const orcamento = getOrcamento(obra.id);
  const categorias = orcamento?.categorias || [];
  const totalPrevisto = categorias.reduce((s, c) => s + (c.precoTotal || 0), 0);

  const materiaisObra = getMateriaisByObra(obra.id);
  const materiaisBaixo = materiaisObra.filter(m => (m.estoqueAtual || 0) < (m.estoqueMinimo || 0));

  // KPIs financeiros reais
  const totalPago = useMemo(() =>
    pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_previsto), 0),
    [pagamentos]
  );
  const totalAtrasado = useMemo(() =>
    pagamentos.filter(p => p.status === 'atrasado').reduce((s, p) => s + Number(p.valor_previsto), 0),
    [pagamentos]
  );

  // KPIs diário reais
  const mediaTrabalhadores = useMemo(() => {
    if (registros.length === 0) return 0;
    return Math.round(registros.reduce((s, r) => s + (r.trabalhadores || 0), 0) / registros.length);
  }, [registros]);

  // Cronograma
  const today = new Date();
  const concluidas = categorias.filter(c => computeStatus(c) === 'concluida');
  const emAndamento = categorias.filter(c => computeStatus(c) === 'em_andamento');
  const atrasadas = categorias.filter(c => computeStatus(c) === 'atrasada');
  const naoIniciadas = categorias.filter(c => computeStatus(c) === 'nao_iniciada');

  const andamentoReal = categorias.length > 0
    ? Math.round(categorias.reduce((s, c) => s + computePercentual(c), 0) / categorias.length)
    : (obra.percentualAndamento || 0);

  const andamentoPlanejado = (() => {
    if (categorias.length === 0) return 0;
    const withDates = categorias.filter(c => c.dataFimPrevista);
    if (withDates.length === 0) return 0;
    const shouldBeDone = withDates.filter(c => new Date(c.dataFimPrevista!) <= today).length;
    return Math.round((shouldBeDone / categorias.length) * 100);
  })();

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportPDF({
        obra, categorias, pagamentos, registros,
        totalPago, totalPrevisto, andamentoReal, mediaTrabalhadores,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary/80" />
            Relatórios & KPIs
          </h1>
          <p className="text-sm text-muted-foreground">{obra.nome}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Gerando PDF…' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* ── Print header ────────────────────────────────────────────────── */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Relatório de Obra</h1>
        <p className="text-sm text-muted-foreground">{obra.codigo} — {obra.nome}</p>
        <p className="text-xs text-muted-foreground">
          Emitido em {format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <Separator className="mt-2" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Dados da Obra ──────────────────────────────────────────────── */}
          <Card className="shadow-card print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Dados da Obra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  ['Obra', obra.nome],
                  ['Código', obra.codigo || '—'],
                  ['Cliente', obra.cliente || '—'],
                  ['Responsável', obra.responsavel || '—'],
                  ['Endereço', obra.endereco || '—'],
                  ['Início', fmtDate(obra.dataInicio)],
                  ['Prev. Término', fmtDate(obra.dataPrevisaoTermino)],
                  ['Status', obra.status === 'em_andamento' ? 'Em Andamento' : obra.status === 'concluida' ? 'Concluída' : obra.status === 'planejamento' ? 'Planejamento' : 'Pausada'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── KPIs ────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: DollarSign, label: 'Orçamento Total',    value: fmt(totalPrevisto), color: 'text-primary' },
              { icon: Receipt,    label: 'Total Pago',          value: fmt(totalPago),     color: 'text-emerald-600', sub: `${totalPrevisto > 0 ? Math.round((totalPago / totalPrevisto) * 100) : 0}% do orçado` },
              { icon: AlertTriangle, label: 'Em Atraso',       value: fmt(totalAtrasado), color: totalAtrasado > 0 ? 'text-red-600' : 'text-muted-foreground' },
              { icon: Users,      label: 'Méd. Trabalhadores', value: String(mediaTrabalhadores), sub: `${registros.length} reg. no diário`, color: 'text-primary' },
            ].map(({ icon: Icon, label, value, color, sub }) => (
              <Card key={label} className="shadow-card print:shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('h-4 w-4', color)} />
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  </div>
                  <p className={cn('text-lg font-bold', color)}>{value}</p>
                  {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Andamento ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="shadow-card print:shadow-none">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Andamento Real</p>
                  <span className="text-sm font-bold">{andamentoReal}%</span>
                </div>
                <Progress value={andamentoReal} className="h-2" />
                {andamentoPlanejado > 0 && (
                  <p className={cn('text-[10px] font-medium', andamentoReal >= andamentoPlanejado ? 'text-emerald-600' : 'text-red-600')}>
                    {andamentoReal >= andamentoPlanejado ? '✓ No prazo' : `${andamentoPlanejado - andamentoReal}% abaixo do planejado`}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-card print:shadow-none">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Execução Financeira</p>
                <Progress
                  value={totalPrevisto > 0 ? Math.round((totalPago / totalPrevisto) * 100) : 0}
                  className="h-2"
                />
                <p className="text-[10px] text-muted-foreground">
                  {fmt(totalPago)} pago de {fmt(totalPrevisto)} orçado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Alertas ─────────────────────────────────────────────────────── */}
          {(atrasadas.length > 0 || materiaisBaixo.length > 0 || totalAtrasado > 0) && (
            <Card className="shadow-card border-warning/30 print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Pontos de Atenção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {atrasadas.map(c => (
                  <p key={c.id} className="text-sm">📅 <strong>{c.nome}</strong> — etapa atrasada ({computePercentual(c)}% concluído)</p>
                ))}
                {materiaisBaixo.map(m => (
                  <p key={m.id} className="text-sm">📦 <strong>{m.nome}</strong> — estoque em {m.estoqueAtual} {m.unidade} (mín: {m.estoqueMinimo})</p>
                ))}
                {totalAtrasado > 0 && (
                  <p className="text-sm">💰 <strong>{fmt(totalAtrasado)}</strong> em pagamentos vencidos</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Cronograma ──────────────────────────────────────────────────── */}
          <Card className="shadow-card print:shadow-none print:break-inside-avoid">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Cronograma por Etapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Orçamento não cadastrado.</p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { count: concluidas.length,  label: 'Concluídas',   color: 'bg-emerald-500/10 text-emerald-600' },
                      { count: emAndamento.length,  label: 'Em Andamento', color: 'bg-primary/10 text-primary' },
                      { count: atrasadas.length,    label: 'Atrasadas',    color: 'bg-red-500/10 text-red-600' },
                      { count: naoIniciadas.length, label: 'Não Iniciadas', color: 'bg-muted text-muted-foreground' },
                    ].map(({ count, label, color }) => (
                      <div key={label} className={cn('text-center p-2.5 rounded-lg', color)}>
                        <p className="text-xl font-bold">{count}</p>
                        <p className="text-[10px]">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {categorias.map(c => {
                      const status = computeStatus(c);
                      const pct = computePercentual(c);
                      return (
                        <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                          {status === 'concluida' ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> :
                           status === 'atrasada'   ? <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" /> :
                           status === 'em_andamento' ? <TrendingUp className="h-4 w-4 text-primary shrink-0" /> :
                           <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <span className="text-sm flex-1 truncate">{c.nome}</span>
                          <div className="w-24 hidden sm:block">
                            <Progress value={pct} className="h-1.5" />
                          </div>
                          <span className="text-xs text-muted-foreground w-9 text-right">{pct}%</span>
                          <span className="text-xs font-medium w-24 text-right hidden md:block">{fmt(c.precoTotal)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Pagamentos recentes ──────────────────────────────────────────── */}
          {pagamentos.length > 0 && (
            <Card className="shadow-card print:shadow-none print:break-inside-avoid">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Pagamentos ({pagamentos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 font-semibold">Descrição</th>
                        <th className="text-left py-2 font-semibold hidden sm:table-cell">Tipo</th>
                        <th className="text-right py-2 font-semibold">Valor</th>
                        <th className="text-right py-2 font-semibold hidden sm:table-cell">Vencimento</th>
                        <th className="text-right py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagamentos.slice(0, 10).map(p => (
                        <tr key={p.id} className="border-b border-border/40 last:border-0">
                          <td className="py-2 truncate max-w-[180px]">{p.descricao}</td>
                          <td className="py-2 text-muted-foreground hidden sm:table-cell">{TIPO_PAG_LABELS[p.tipo_pagamento] || p.tipo_pagamento}</td>
                          <td className="py-2 text-right font-medium tabular-nums">{fmt(Number(p.valor_previsto))}</td>
                          <td className="py-2 text-right text-muted-foreground hidden sm:table-cell">{fmtDate(p.data_vencimento)}</td>
                          <td className="py-2 text-right">
                            <Badge variant="outline" className={cn('text-[10px]',
                              p.status === 'pago' ? 'text-emerald-600 border-emerald-500/30' :
                              p.status === 'atrasado' ? 'text-red-600 border-red-500/30' :
                              'text-amber-600 border-amber-500/30'
                            )}>
                              {p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pagamentos.length > 10 && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      Mostrando 10 de {pagamentos.length}. Export PDF inclui todos.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Diário recente ───────────────────────────────────────────────── */}
          <Card className="shadow-card print:shadow-none print:break-inside-avoid">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Últimos Registros do Diário
                {registros.length === 0 && (
                  <Badge variant="secondary" className="text-[10px]">Sem registros</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registros.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum registro no diário de obra ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {registros.slice(0, 8).map(r => (
                    <div key={r.id} className="border-b border-border pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium">{fmtDate(r.data)}</p>
                        <span className="text-xs text-muted-foreground">{CLIMA_LABELS[r.clima] || r.clima}</span>
                        <span className="text-xs text-muted-foreground">· {r.trabalhadores} trab.</span>
                        {r.usuario_nome && (
                          <span className="text-xs text-muted-foreground">· por {r.usuario_nome}</span>
                        )}
                        <Badge variant="secondary" className={cn('text-[10px]',
                          r.status === 'aprovado' ? 'bg-emerald-500/10 text-emerald-700' :
                          r.status === 'pendente'  ? 'bg-amber-500/10 text-amber-700' :
                          'bg-red-500/10 text-red-700'
                        )}>
                          {STATUS_LABELS[r.status] || r.status}
                        </Badge>
                      </div>
                      {r.servicos_executados && (
                        <p className="text-sm text-muted-foreground">{r.servicos_executados}</p>
                      )}
                      {r.problemas && (
                        <p className="text-xs text-red-600 mt-0.5">⚠️ {r.problemas}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Estoque baixo ────────────────────────────────────────────────── */}
          {materiaisBaixo.length > 0 && (
            <Card className="shadow-card print:shadow-none print:break-inside-avoid">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" /> Materiais com Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {materiaisBaixo.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5">
                      <div>
                        <p className="text-sm font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">{m.categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">{m.estoqueAtual} {m.unidade}</p>
                        <p className="text-xs text-muted-foreground">Mín: {m.estoqueMinimo} {m.unidade}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Rodapé print ────────────────────────────────────────────────── */}
          <div className="hidden print:block text-center text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
            <p>Relatório gerado em {format(today, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            <p>{obra.codigo} — {obra.nome} · Obra Conectada</p>
          </div>
        </>
      )}
    </div>
  );
}
