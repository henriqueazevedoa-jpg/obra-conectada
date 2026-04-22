/**
 * gerarBoletimMedicao.ts
 * Gera PDF A4 de Boletim de Medição usando jsPDF + jspdf-autotable.
 * Segue o mesmo padrão de RelatoriosPage (dynamic import).
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Cores do sistema ─────────────────────────────────────────────────────────
const BRAND_DARK   = [15, 23, 42]   as [number, number, number]; // #0f172a
const BRAND_PURPLE = [83, 74, 183]  as [number, number, number]; // #534AB7
const BRAND_LIGHT  = [243, 242, 253] as [number, number, number]; // #F3F2FD
const TEXT_DARK    = [30, 30, 50]   as [number, number, number];
const TEXT_SUB     = [110, 115, 140] as [number, number, number];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BMContrato {
  numero: string;
  contratado: string;
  descricao: string;
  modalidade_medicao: string;
  valor_atual: number;
  tipo: string;
}

export interface BMMedicao {
  numero_medicao: number;
  data_referencia: string;
  data_emissao?: string | null;
  status: string;
  percentual_acumulado_anterior?: number;
  percentual_periodo?: number;
  percentual_acumulado?: number;
  valor_periodo: number;
  valor_acumulado: number;
  observacoes?: string | null;
}

export interface BMMedicaoItem {
  descricao: string;
  unidade?: string;
  quantidade_contrato?: number;
  preco_unitario?: number;
  percentual_anterior?: number;
  percentual_periodo?: number;
  percentual_acumulado?: number;
  quantidade_periodo?: number;
  quantidade_acumulada?: number;
  valor_periodo?: number;
}

export interface BMObra {
  nome: string;
  codigo?: string;
  endereco?: string;
}

export interface GerarBMParams {
  obra: BMObra;
  contrato: BMContrato;
  medicao: BMMedicao;
  itens: BMMedicaoItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
}

// ─── Gerador principal ────────────────────────────────────────────────────────

export async function gerarBoletimMedicaoPDF(params: GerarBMParams): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const { obra, contrato, medicao, itens } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const today = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const modalidadeLabel: Record<string, string> = {
    percentual: 'Percentual por Etapa',
    quantidade: 'Preço Unitário',
    livre: 'Livre',
  };

  // ── Rodapé (definido antes para usar em todas as páginas via addPage hook) ──
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setPage(pageNum);
    doc.setDrawColor(...TEXT_SUB);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_SUB);
    doc.text(
      `Obra Conectada · BM ${medicao.numero_medicao} · ${contrato.numero} · Pág. ${pageNum}/${totalPages}`,
      pageW / 2, pageH - 7,
      { align: 'center' }
    );
  };

  // ── HEADER DARK ────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, pageW, 34, 'F');

  // Logo area (texto)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('OBRA CONECTADA', margin, 8);

  // Título
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Boletim de Medição', margin, 17);

  // Subtítulo
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 230);
  doc.text(`Medição Nº ${medicao.numero_medicao}  ·  ${contrato.numero}  ·  Emitido em ${today}`, margin, 24);

  // Status badge (direita)
  const statusColors: Record<string, [number, number, number]> = {
    rascunho:   [120, 120, 130],
    emitido:    [59, 130, 246],
    aprovado:   [34, 197, 94],
    contestado: [245, 158, 11],
    pago:       [139, 92, 246],
  };
  const sc = statusColors[medicao.status] || [120, 120, 130];
  doc.setFillColor(...sc);
  doc.roundedRect(pageW - margin - 28, 12, 28, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(medicao.status.toUpperCase(), pageW - margin - 14, 18, { align: 'center' });

  y = 42;

  // ── DADOS DA OBRA E CONTRATO ───────────────────────────────────────────────
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Contrato', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [],
    body: [
      ['Obra',        obra.nome,                      'Código',      obra.codigo || '—'],
      ['Contratado',  contrato.contratado,             'Tipo',        contrato.tipo === 'cliente' ? 'Cliente' : 'Empreiteiro'],
      ['Contrato',    contrato.numero,                 'Modalidade',  modalidadeLabel[contrato.modalidade_medicao] || contrato.modalidade_medicao],
      ['Valor Atual', fmt(contrato.valor_atual),       'Endereço',    obra.endereco || '—'],
      ['Objeto',      contrato.descricao,              '',            ''],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, fillColor: BRAND_LIGHT, textColor: [...BRAND_PURPLE] as [number, number, number] },
      1: { cellWidth: 65 },
      2: { fontStyle: 'bold', cellWidth: 28, fillColor: BRAND_LIGHT, textColor: [...BRAND_PURPLE] as [number, number, number] },
      3: { cellWidth: 55 },
    },
    theme: 'plain',
  });
  y = (doc as any).lastAutoTable.finalY + 7;

  // ── DADOS DA MEDIÇÃO ───────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text('Dados da Medição', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [],
    body: [
      ['Período Ref.',   fmtDate(medicao.data_referencia), 'Data Emissão', fmtDate(medicao.data_emissao)],
      ['Nº Medição',     String(medicao.numero_medicao),   'Status',       medicao.status.charAt(0).toUpperCase() + medicao.status.slice(1)],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, fillColor: BRAND_LIGHT, textColor: [...BRAND_PURPLE] as [number, number, number] },
      1: { cellWidth: 65 },
      2: { fontStyle: 'bold', cellWidth: 28, fillColor: BRAND_LIGHT, textColor: [...BRAND_PURPLE] as [number, number, number] },
      3: { cellWidth: 55 },
    },
    theme: 'plain',
  });
  y = (doc as any).lastAutoTable.finalY + 7;

  // ── TABELA DE ITENS ────────────────────────────────────────────────────────
  if (y > 210) { doc.addPage(); y = margin; }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text('Itens da Medição', margin, y);
  y += 4;

  const modalidade = contrato.modalidade_medicao;

  if (modalidade === 'percentual') {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Descrição / Etapa', 'Ant. %', 'Per. %', 'Acum. %', 'Valor Período']],
      body: itens.length > 0
        ? itens.map(it => [
          it.descricao,
          `${(it.percentual_anterior ?? 0).toFixed(1)}%`,
          `${(it.percentual_periodo ?? 0).toFixed(1)}%`,
          `${(it.percentual_acumulado ?? 0).toFixed(1)}%`,
          fmt(Number(it.valor_periodo ?? 0)),
        ])
        : [['Nenhum item registrado', '', '', '', '']],
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      headStyles: { fillColor: BRAND_PURPLE, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 253] },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' },
      },
      theme: 'grid',
    });
  } else if (modalidade === 'quantidade') {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Descrição', 'Un.', 'Preço Unit.', 'Qtd. Período', 'Qtd. Acum.', 'Valor Período']],
      body: itens.length > 0
        ? itens.map(it => [
          it.descricao,
          it.unidade ?? 'un',
          fmt(Number(it.preco_unitario ?? 0)),
          String(it.quantidade_periodo ?? 0),
          String(it.quantidade_acumulada ?? 0),
          fmt(Number(it.valor_periodo ?? 0)),
        ])
        : [['Nenhum item registrado', '', '', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: BRAND_PURPLE, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 253] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      theme: 'grid',
    });
  } else {
    // livre
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Descrição', 'Un.', 'Preço Unit.', 'Qtd.', 'Valor Período']],
      body: itens.length > 0
        ? itens.map(it => [
          it.descricao,
          it.unidade ?? 'un',
          fmt(Number(it.preco_unitario ?? 0)),
          String(it.quantidade_periodo ?? 0),
          fmt(Number(it.valor_periodo ?? 0)),
        ])
        : [['Nenhum item registrado', '', '', '', '']],
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      headStyles: { fillColor: BRAND_PURPLE, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 253] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      theme: 'grid',
    });
  }
  y = (doc as any).lastAutoTable.finalY + 7;

  // ── RESUMO FINANCEIRO ──────────────────────────────────────────────────────
  if (y > 210) { doc.addPage(); y = margin; }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text('Resumo Financeiro', margin, y);
  y += 4;

  const pctAcum = medicao.percentual_acumulado ?? 0;
  const pctPer  = medicao.percentual_periodo ?? 0;
  const pctAnt  = medicao.percentual_acumulado_anterior ?? 0;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Item', 'R$', '%']],
    body: [
      ['Valor do Contrato',          fmt(contrato.valor_atual),    '100,00%'],
      ['Acumulado Anterior (BMs ant.)', fmt(medicao.valor_acumulado - medicao.valor_periodo), `${pctAnt.toFixed(2)}%`],
      ['Valor Desta Medição',        fmt(medicao.valor_periodo),   `${pctPer.toFixed(2)}%`],
      ['Acumulado Total',            fmt(medicao.valor_acumulado), `${pctAcum.toFixed(2)}%`],
      ['Saldo a Medir',              fmt(Math.max(0, contrato.valor_atual - medicao.valor_acumulado)), `${Math.max(0, 100 - pctAcum).toFixed(2)}%`],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND_PURPLE, textColor: [255, 255, 255], fontStyle: 'bold' },
    bodyStyles: { textColor: [...TEXT_DARK] },
    alternateRowStyles: { fillColor: [248, 248, 253] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right', cellWidth: 28 },
    },
    // Destacar linha "Desta Medição"
    didParseCell: (data: any) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [...BRAND_LIGHT];
        data.cell.styles.textColor = [...BRAND_PURPLE];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 7;

  // ── OBSERVAÇÕES ────────────────────────────────────────────────────────────
  if (medicao.observacoes) {
    if (y > 220) { doc.addPage(); y = margin; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text('Observações', margin, y); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_SUB);
    const obsLines = doc.splitTextToSize(medicao.observacoes, pageW - margin * 2);
    doc.text(obsLines, margin, y);
    y += obsLines.length * 4 + 5;
  }

  // ── CAMPO DE ASSINATURAS ───────────────────────────────────────────────────
  const needsNewPage = y + 45 > pageH - 20;
  if (needsNewPage) { doc.addPage(); y = margin; }
  y = Math.max(y, pageH - 70); // empurrar para o final da página

  doc.setDrawColor(...TEXT_SUB);
  doc.setLineWidth(0.3);

  // Linha Contratante
  doc.line(margin, y, margin + 75, y);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_SUB);
  doc.text('Contratante', margin + 37.5, y + 4, { align: 'center' });
  doc.text('Nome / Cargo / Data', margin + 37.5, y + 8, { align: 'center' });

  // Linha Contratado
  doc.line(pageW - margin - 75, y, pageW - margin, y);
  doc.text('Contratado', pageW - margin - 37.5, y + 4, { align: 'center' });
  doc.text(contrato.contratado, pageW - margin - 37.5, y + 8, { align: 'center' });

  // Linha Fiscal / Responsável
  const midX = pageW / 2;
  doc.line(midX - 35, y + 20, midX + 35, y + 20);
  doc.text('Fiscal / Responsável Técnico', midX, y + 24, { align: 'center' });
  doc.text('Visto e Aprovado em: ___/___/______', midX, y + 28, { align: 'center' });

  // ── RODAPÉ EM TODAS AS PÁGINAS ────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    drawFooter(i, totalPages);
  }

  // ── SALVAR ────────────────────────────────────────────────────────────────
  const filename = `BM-${contrato.numero.replace(/[^a-zA-Z0-9]/g, '-')}-${medicao.numero_medicao}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
