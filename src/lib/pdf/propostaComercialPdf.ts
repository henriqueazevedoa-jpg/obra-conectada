/**
 * propostaComercialPdf.ts
 *
 * Bloco 1 — SPRINT-E (CRON-B)
 * Gera PDF de Proposta Comercial usando jspdf + jspdf-autotable.
 * Disponível apenas na fase Estimativo.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ObraInfo {
  nome: string;
  cliente?: string | null;
  endereco?: string | null;
  responsavel?: string | null;
  data_inicio?: string | null;
  data_previsao_termino?: string | null;
}

export interface CompanyInfo {
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  logo_url?: string | null;
}

export interface TarefaPdf {
  nome: string;
  duracao_dias: number;
  data_inicio: string | null;
  data_fim: string | null;
  peso_orcamento: number;
  percentual_concluido: number;
  tipo_tarefa: string;
  nivel: number;
  parent_tarefa_id?: string | null;
}

// ── Color palette ──────────────────────────────────────────────────────────────

const PRIMARY = [83, 74, 183] as const;        // #534AB7
const PRIMARY_LIGHT = [175, 169, 236] as const; // #AFA9EC
const DARK = [20, 20, 30] as const;
const MUTED = [120, 120, 120] as const;
const BORDER = [220, 220, 228] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function rgb(r: number, g: number, b: number): [number, number, number] {
  return [r, g, b];
}

function fmtBrl(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch { return d; }
}

// ── Gantt bar mini ─────────────────────────────────────────────────────────────

function drawMiniGantt(
  doc: jsPDF,
  tarefas: TarefaPdf[],
  y: number,
  pageWidth: number,
  margin: number,
) {
  const chartWidth = pageWidth - margin * 2;
  const barAreaX = margin + 80;
  const barAreaWidth = chartWidth - 80;
  const rowH = 7;
  const barH = 4;

  const datas = tarefas
    .filter(t => t.data_inicio && t.data_fim && t.tipo_tarefa !== 'RESUMO')
    .flatMap(t => [new Date(t.data_inicio!), new Date(t.data_fim!)]);
  if (datas.length === 0) return y;

  const minT = Math.min(...datas.map(d => d.getTime()));
  const maxT = Math.max(...datas.map(d => d.getTime()));
  const totalMs = Math.max(1, maxT - minT);

  const rootTarefas = tarefas.filter(t => !t.parent_tarefa_id && t.tipo_tarefa !== 'RESUMO');

  // Grid lines (months)
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);

  rootTarefas.forEach((t, i) => {
    const rowY = y + i * rowH;
    if (!t.data_inicio || !t.data_fim) return;

    const start = new Date(t.data_inicio).getTime();
    const end = new Date(t.data_fim).getTime();
    const x1 = barAreaX + ((start - minT) / totalMs) * barAreaWidth;
    const x2 = barAreaX + ((end - minT) / totalMs) * barAreaWidth;
    const barWidth = Math.max(1, x2 - x1);

    // Label
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const label = t.nome.length > 18 ? t.nome.slice(0, 17) + '…' : t.nome;
    doc.text(label, margin, rowY + barH / 2 + 1);

    // Bar background
    doc.setFillColor(...BORDER);
    doc.roundedRect(barAreaX, rowY, barAreaWidth, barH - 1, 1, 1, 'F');

    // Bar fill
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(x1, rowY, barWidth, barH - 1, 1, 1, 'F');
  });

  return y + rootTarefas.length * rowH + 8;
}

// ── Main function ──────────────────────────────────────────────────────────────

export function gerarPropostaComercial(
  obra: ObraInfo,
  tarefas: TarefaPdf[],
  company: CompanyInfo,
  valorTotalOrcado: number,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const today = new Date();
  const validade = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA COMERCIAL', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(company.nome, margin, 26);
  if (company.cnpj) doc.text(`CNPJ: ${company.cnpj}`, margin, 32);

  const dateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(9);
  doc.text(dateStr, pageWidth - margin, 26, { align: 'right' });
  doc.text(`Válida até: ${validade.toLocaleDateString('pt-BR')}`, pageWidth - margin, 32, { align: 'right' });

  // ── Obra info ────────────────────────────────────────────────────────────────
  let y = 50;

  doc.setFillColor(247, 247, 251);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 36, 3, 3, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 36, 3, 3, 'S');

  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(obra.nome, margin + 6, y + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  const infos = [
    obra.cliente && `Cliente: ${obra.cliente}`,
    obra.endereco && `Endereço: ${obra.endereco}`,
    obra.responsavel && `Responsável: ${obra.responsavel}`,
    (obra.data_inicio || obra.data_previsao_termino) && `Período: ${fmtDate(obra.data_inicio)} → ${fmtDate(obra.data_previsao_termino)}`,
  ].filter(Boolean) as string[];

  infos.forEach((info, i) => doc.text(info, margin + 6, y + 18 + i * 6));

  y += 46;

  // ── Resumo executivo ─────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Executivo', margin, y);
  y += 8;

  const totalDias = tarefas
    .filter(t => t.data_inicio && t.data_fim && !t.parent_tarefa_id)
    .reduce((sum, t) => Math.max(sum, t.duracao_dias || 0), 0);

  const kpiData = [
    ['Prazo Total', totalDias > 0 ? `${totalDias} dias úteis` : '—'],
    ['Valor Total Orçado', fmtBrl(valorTotalOrcado)],
    ['Início Previsto', fmtDate(tarefas.filter(t => t.data_inicio)[0]?.data_inicio)],
    ['Término Previsto', fmtDate([...tarefas].filter(t => t.data_fim).sort((a, b) => (b.data_fim ?? '').localeCompare(a.data_fim ?? ''))[0]?.data_fim)],
  ];

  autoTable(doc, {
    startY: y,
    body: kpiData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [...DARK], fillColor: [247, 247, 251], cellWidth: 60 },
      1: { textColor: [...DARK] },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Tabela de etapas ─────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('Etapas do Projeto', margin, y);
  y += 6;

  const etapas = tarefas.filter(t => !t.parent_tarefa_id && t.tipo_tarefa !== 'RESUMO');
  const totalPeso = etapas.reduce((s, t) => s + (t.peso_orcamento || 0), 0) || 1;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Etapa', 'Duração', 'Início', 'Término', '% do Total']],
    body: etapas.map((t, i) => [
      String(i + 1),
      t.nome,
      t.duracao_dias > 0 ? `${t.duracao_dias}d` : '—',
      fmtDate(t.data_inicio),
      fmtDate(t.data_fim),
      `${((t.peso_orcamento / totalPeso) * 100).toFixed(1)}%`,
    ]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      5: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Mini Gantt ───────────────────────────────────────────────────────────────
  if (y + etapas.length * 7 + 20 < pageHeight - 30) {
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.text('Cronograma Simplificado', margin, y);
    y += 8;
    y = drawMiniGantt(doc, tarefas, y, pageWidth, margin);
  } else {
    doc.addPage();
    y = 20;
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.text('Cronograma Simplificado', margin, y);
    y += 8;
    y = drawMiniGantt(doc, tarefas, y, pageWidth, margin);
  }

  // ── Footer em todas as páginas ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...PRIMARY);
    doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text(`${company.nome} | ${company.email || ''} | ${company.telefone || ''}`, margin, pageHeight - 5);
    doc.text(`Página ${p}/${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    doc.text(`Proposta válida por 30 dias a partir de ${today.toLocaleDateString('pt-BR')}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  }

  const nomeArquivo = `proposta_${obra.nome.replace(/\s+/g, '_').toLowerCase()}_${today.toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
