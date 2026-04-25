/**
 * cronogramaPdf.ts
 *
 * Bloco 2 — SPRINT-E (CRON-B)
 * Gera PDF do Cronograma de Obra usando jspdf + jspdf-autotable.
 * Disponível nas fases Analítico e Execução.
 * Inclui: WBS completa, desvio vs baseline, legenda de status.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CronogramaTarefa, CronogramaDependencia } from '@/hooks/useCronograma';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ObraInfoCron {
  nome: string;
  responsavel?: string | null;
  data_inicio?: string | null;
  data_previsao_termino?: string | null;
}

export interface VersaoInfo {
  tipo: string;
  numero: number;
  criado_em?: string;
}

export interface CompanyInfoCron {
  nome: string;
  email?: string | null;
}

// ── Colors ─────────────────────────────────────────────────────────────────────

const PRIMARY = [83, 74, 183] as const;
const GREEN   = [59, 109, 17] as const;
const RED     = [163, 45, 45] as const;
const AMBER   = [133, 79, 11] as const;
const GRAY    = [136, 135, 128] as const;
const BORDER  = [220, 220, 228] as const;
const DARK    = [20, 20, 30] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch { return d; }
}

function diffDias(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

function statusLabel(t: CronogramaTarefa): string {
  if (t.percentual_concluido >= 100) return 'Concluída';
  const hoje = new Date();
  if (t.data_fim && new Date(t.data_fim) < hoje) return 'Atrasada';
  if (t.data_inicio && new Date(t.data_inicio) <= hoje) return 'Em andamento';
  return 'Não iniciada';
}

function statusColor(t: CronogramaTarefa): [number, number, number] {
  if (t.percentual_concluido >= 100) return GREEN;
  const hoje = new Date();
  if (t.data_fim && new Date(t.data_fim) < hoje) return RED;
  if (t.data_inicio && new Date(t.data_inicio) <= hoje) return [24, 95, 165];
  return GRAY;
}

// ── Mini Gantt bars (landscape) ────────────────────────────────────────────────

function drawGanttBars(
  doc: jsPDF,
  tarefas: CronogramaTarefa[],
  startY: number,
  margin: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const barAreaX = margin + 100;
  const barAreaWidth = pageWidth - barAreaX - margin;
  const rowH = 7;
  const barH = 3.5;

  const allDates = tarefas
    .filter(t => t.data_inicio && t.data_fim)
    .flatMap(t => [new Date(t.data_inicio!).getTime(), new Date(t.data_fim!).getTime()]);
  if (allDates.length === 0) return startY;

  const minT = Math.min(...allDates);
  const maxT = Math.max(...allDates);
  const range = Math.max(1, maxT - minT);

  let y = startY;
  tarefas.filter(t => t.data_inicio && t.data_fim).forEach(t => {
    const x1 = barAreaX + ((new Date(t.data_inicio!).getTime() - minT) / range) * barAreaWidth;
    const x2 = barAreaX + ((new Date(t.data_fim!).getTime() - minT) / range) * barAreaWidth;
    const w = Math.max(1, x2 - x1);

    // Label
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    const lbl = t.nome.length > 22 ? t.nome.slice(0, 21) + '…' : t.nome;
    doc.text(lbl, margin, y + barH * 0.8);

    // Baseline (ghost)
    if (t.baseline_inicio && t.baseline_fim) {
      const bx1 = barAreaX + ((new Date(t.baseline_inicio).getTime() - minT) / range) * barAreaWidth;
      const bx2 = barAreaX + ((new Date(t.baseline_fim).getTime() - minT) / range) * barAreaWidth;
      doc.setFillColor(220, 215, 248);
      doc.roundedRect(bx1, y + 1, Math.max(1, bx2 - bx1), barH - 1, 0.5, 0.5, 'F');
    }

    // Current bar
    const [r, g, b] = statusColor(t);
    doc.setFillColor(r, g, b);
    doc.roundedRect(x1, y, w, barH, 0.5, 0.5, 'F');

    y += rowH;
  });

  return y + 4;
}

// ── Main function ──────────────────────────────────────────────────────────────

export function gerarCronogramaPdf(
  obra: ObraInfoCron,
  tarefas: CronogramaTarefa[],
  _dependencias: CronogramaDependencia[],
  versao: VersaoInfo,
  company: CompanyInfoCron,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const today = new Date();

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CRONOGRAMA DE OBRA', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(obra.nome, margin, 20);

  const versaoLabel = `${versao.tipo.charAt(0).toUpperCase() + versao.tipo.slice(1)} v${versao.numero}`;
  doc.text(versaoLabel, pageWidth / 2, 14, { align: 'center' });
  doc.text(`Gerado em: ${today.toLocaleDateString('pt-BR')} ${today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 20, { align: 'center' });

  if (obra.responsavel) doc.text(`Resp.: ${obra.responsavel}`, pageWidth - margin, 14, { align: 'right' });
  doc.text(company.nome, pageWidth - margin, 20, { align: 'right' });

  let y = 34;

  // ── Gantt bars ───────────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('Diagrama de Gantt', margin, y);
  y += 6;

  y = drawGanttBars(doc, tarefas.slice(0, 30), y, margin);

  // ── Legenda ──────────────────────────────────────────────────────────────────
  const legendItems: { label: string; color: [number, number, number] }[] = [
    { label: 'Não iniciada', color: GRAY },
    { label: 'Em andamento', color: [24, 95, 165] },
    { label: 'Concluída', color: GREEN },
    { label: 'Atrasada', color: RED },
    { label: 'Baseline (planejado)', color: [175, 169, 236] },
  ];

  let lx = margin;
  legendItems.forEach(item => {
    doc.setFillColor(...item.color);
    doc.roundedRect(lx, y, 8, 3.5, 0.5, 0.5, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(item.label, lx + 10, y + 2.8);
    lx += 40;
  });

  y += 10;

  // ── Nova página: WBS Table ───────────────────────────────────────────────────
  doc.addPage();
  y = 20;

  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('WBS — Detalhamento das Tarefas', margin, y);
  y += 8;

  const hasBaseline = tarefas.some(t => t.baseline_inicio);

  const cols = [
    'Tarefa', 'Dur.', 'Início', 'Término',
    '% Conc.', 'Status',
    ...(hasBaseline ? ['B. Início', 'B. Fim', 'Desvio'] : []),
  ];

  const rows = tarefas.map(t => {
    const desvio = hasBaseline
      ? (() => {
          const d = diffDias(t.data_fim, t.baseline_fim);
          if (d === null) return '—';
          return d === 0 ? '0d' : d > 0 ? `+${d}d` : `${d}d`;
        })()
      : undefined;

    return [
      '  '.repeat(Math.max(0, t.nivel - 1)) + t.nome,
      t.duracao_dias > 0 ? `${t.duracao_dias}d` : '—',
      fmtDate(t.data_inicio),
      fmtDate(t.data_fim),
      `${t.percentual_concluido}%`,
      statusLabel(t),
      ...(hasBaseline ? [fmtDate(t.baseline_inicio), fmtDate(t.baseline_fim), desvio ?? '—'] : []),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [cols],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'ellipsize' },
    headStyles: { fillColor: [...PRIMARY], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center', cellWidth: 12 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 22 },
      ...(hasBaseline ? {
        6: { halign: 'center', cellWidth: 20 },
        7: { halign: 'center', cellWidth: 20 },
        8: { halign: 'center', cellWidth: 16 },
      } : {}),
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const tarefa = tarefas[data.row.index];
        if (!tarefa) return;
        const [r, g, b] = statusColor(tarefa);
        doc.setTextColor(r, g, b);
        doc.setFontSize(7.5);
        doc.text(statusLabel(tarefa), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
      }
      if (hasBaseline && data.section === 'body' && data.column.index === 8) {
        const tarefa = tarefas[data.row.index];
        if (!tarefa) return;
        const desvio = diffDias(tarefa.data_fim, tarefa.baseline_fim);
        if (desvio === null) return;
        const [r, g, b] = desvio > 0 ? RED : desvio < 0 ? GREEN : GRAY;
        doc.setTextColor(r, g, b);
      }
    },
    margin: { left: margin, right: margin },
  });

  // ── Footer ───────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...PRIMARY);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(`${company.nome} | Cronograma gerado em ${today.toLocaleDateString('pt-BR')}`, margin, pageHeight - 3.5);
    doc.text(`${p}/${totalPages}`, pageWidth - margin, pageHeight - 3.5, { align: 'right' });
  }

  const nomeArquivo = `cronograma_${obra.nome.replace(/\s+/g, '_').toLowerCase()}_${today.toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
