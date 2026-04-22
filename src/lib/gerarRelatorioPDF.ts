/**
 * gerarRelatorioPDF.ts
 * Motor unificado de geração de relatórios com branding (logo da construtora).
 * Formatos e cores neutros (#1e293b, #0f766e, #f8fafc)
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Cores do Layout Neutro ──────────────────────────────────────────────────
const HEADER_BG = [30, 41, 59] as [number, number, number]; // slate-800
const ACCENT_COLOR = [15, 118, 110] as [number, number, number]; // teal-700
const TEXT_DARK = [15, 23, 42] as [number, number, number]; // slate-900
const TEXT_MUTED = [100, 116, 139] as [number, number, number]; // slate-500
const ROW_ALT_BG = [248, 250, 252] as [number, number, number]; // slate-50

export type PDFReportType = 'executivo' | 'rdo' | 'financeiro';

export interface ReportConfig {
  type: PDFReportType;
  company: { nome: string; logo_url?: string | null };
  obra: { nome: string; codigo?: string; cliente?: string; responsavel?: string; endereco?: string };
  data: any; // payload específico do tipo
}

// ── Image Helper ─────────────────────────────────────────────────────────────
async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Motor Principal ──────────────────────────────────────────────────────────
export async function gerarRelatorioPDF(config: ReportConfig): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const { type, company, obra, data } = config;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // Pré-load logo se existir
  let base64Logo: string | null = null;
  if (company.logo_url) {
    base64Logo = await fetchImageBase64(company.logo_url);
  }

  // ── CABEÇALHO (Adicionado via didDrawPage hook para todas as pgs) ──────────
  const drawHeader = (dataHook: any) => {
    const isFirstPage = dataHook.pageNumber === 1;
    // Evita desenhar mais de uma vez na mesma página usando controle básico,
    // mas o didDrawPage já chama 1x por pág. Nos inserts manuais de página precisamos cuidar.
    doc.setFillColor(...HEADER_BG);
    doc.rect(0, 0, pageW, 28, 'F');
    
    // Logo ou Nome Construtora (Esquerda)
    if (base64Logo) {
      try {
        doc.addImage(base64Logo, 'PNG', margin, 4, 30, 20, undefined, 'FAST');
      } catch (e) {
         // fallback caso formato não suportado
         doc.setTextColor(255, 255, 255);
         doc.setFontSize(14);
         doc.setFont('helvetica', 'bold');
         doc.text(company.nome.toUpperCase(), margin, 18);
      }
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(company.nome.toUpperCase(), margin, 18);
    }

    // Texto fixo direita
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const headerTitle = type === 'executivo' ? 'RELATÓRIO EXECUTIVO' : type === 'rdo' ? 'DIÁRIO DE OBRA' : 'RELATÓRIO FINANCEIRO';
    doc.text(headerTitle, pageW - margin, 14, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 220);
    doc.text(`${obra.codigo ? obra.codigo + ' - ' : ''}${obra.nome}`, pageW - margin, 19, { align: 'right' });
  };

  const drawFooter = (dataHook: any) => {
    const pageNum = dataHook.pageNumber;
    const str = `${company.nome} · ${obra.nome} · Pág ${pageNum} · ${format(new Date(), 'dd/MM/yyyy')}`;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(str, pageW / 2, pageH - 7, { align: 'center' });
  };

  const autoTableConfig = {
    margin: { top: 35, bottom: 20, left: margin, right: margin },
    headStyles: { fillColor: ACCENT_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: ROW_ALT_BG },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: TEXT_DARK },
    didDrawPage: (dataHook: any) => {
      drawHeader(dataHook);
      drawFooter(dataHook);
    }
  };

  // Espaçamento inicial da 1a pág
  currentY = 35;

  // ═════════════════════════════════════════════════════════════════════════
  // 1. RELATÓRIO EXECUTIVO
  // ═════════════════════════════════════════════════════════════════════════
  if (type === 'executivo') {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Visão Geral da Obra', margin, currentY); currentY += 5;

    autoTable(doc, {
      ...autoTableConfig,
      startY: currentY,
      theme: 'plain',
      head: [],
      body: [
        ['Cliente', obra.cliente || '—', 'Responsável', obra.responsavel || '—'],
        ['Endereço', obra.endereco || '—', 'Prazo Previsto', data.prazoPrevisto || '—'],
      ],
      styles: { fontSize: 9, cellPadding: 2, textColor: TEXT_DARK },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 25 },
        2: { fontStyle: 'bold', cellWidth: 25 }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores de Performance', margin, currentY); currentY += 5;

    autoTable(doc, {
      ...autoTableConfig,
      startY: currentY,
      head: [['Métrica', 'Valor']],
      body: [
        ['Avanço Físico (Cronograma)', `${data.andamentoReal || 0}%`],
        ['Orçamento Total Previsto', fmt(data.totalPrevisto || 0)],
        ['Custo Consumido', fmt(data.totalPago || 0)],
        ['Eficiência Financeira', `${data.totalPrevisto ? Math.round(((data.totalPago || 0) / data.totalPrevisto) * 100) : 0}% consumido`]
      ]
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    if (data.categorias && data.categorias.length > 0) {
      doc.setFontSize(11);
      doc.text('Progresso por Etapa', margin, currentY); currentY += 5;
      
      autoTable(doc, {
        ...autoTableConfig,
        startY: currentY,
        head: [['Etapa', 'Peso/Valor', 'Concluído']],
        body: data.categorias.map((c: any) => [
          c.nome,
          fmt(c.precoTotal || 0),
          `${c.percentualCronograma || 0}%`
        ])
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. DIÁRIO DE OBRA (RDO)
  // ═════════════════════════════════════════════════════════════════════════
  else if (type === 'rdo') {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Registros Diários', margin, currentY); currentY += 5;

    if (!data.registros || data.registros.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhum registro encontrado no período.', margin, currentY);
      drawHeader({ pageNumber: 1 });
      drawFooter({ pageNumber: 1 });
    } else {
      let isFirst = true;

      // Desenhamos por autoTable para quebrar pág certinho
      data.registros.forEach((r: any) => {
        let contentArray = [];
        contentArray.push([{ content: `DATA: ${r.data ? format(new Date(r.data+'T12:00:00'), 'dd/MM/yyyy') : '—'}   |   CLIMA: ${r.clima}   |   TRABALHADORES: ${r.trabalhadores}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }]);
        contentArray.push(['Serviços Executados', r.servicos_executados || 'Nenhum serviço detalhado.']);
        if (r.problemas) {
          contentArray.push([{ content: 'Problemas/Ocorrências', styles: { textColor: [180, 0, 0] } }, { content: r.problemas, styles: { textColor: [180, 0, 0] } }]);
        }
        
        autoTable(doc, {
          ...autoTableConfig,
          startY: isFirst ? currentY : (doc as any).lastAutoTable.finalY + 8,
          head: [],
          body: contentArray,
          columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
          theme: 'grid'
        });
        isFirst = false;
      });

      // Area de Assinatura no final
      let sigY = (doc as any).lastAutoTable.finalY + 30;
      if (sigY > pageH - 40) { doc.addPage(); sigY = 50; }
      
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(pageW / 2 - 40, sigY, pageW / 2 + 40, sigY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_DARK);
      doc.text('Responsável Técnico / Engenheiro', pageW / 2, sigY + 5, { align: 'center' });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. FINANCEIRO / DRE
  // ═════════════════════════════════════════════════════════════════════════
  else if (type === 'financeiro') {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DRE Simplificada (Receitas x Despesas)', margin, currentY); currentY += 5;

    // Calculos basicos baseados nos params
    const recebido = data.contratosValor || 0; // Exemplo de injecao
    const despesas = data.totalPago || 0;
    const saldo = recebido - despesas;

    autoTable(doc, {
      ...autoTableConfig,
      startY: currentY,
      head: [['Categoria', 'Movimento (R$)']],
      body: [
        ['(+) Contratos Firmados (Receita Prevista)', fmt(recebido)],
        ['(-) Despesas Pagas (Saídas)', fmt(despesas)],
        [{ content: 'Saldo Atual', styles: { fontStyle: 'bold' } }, { content: fmt(saldo), styles: { fontStyle: 'bold', textColor: saldo < 0 ? [180, 0, 0] : [0, 120, 0] } }]
      ]
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    if (data.pagamentos && data.pagamentos.length > 0) {
      doc.setFontSize(11);
      doc.text('Histórico de Pagamentos (Recentes)', margin, currentY); currentY += 5;

      autoTable(doc, {
        ...autoTableConfig,
        startY: currentY,
        head: [['Descrição', 'Data Venc.', 'Status', 'Valor']],
        body: data.pagamentos.map((p: any) => [
          p.descricao,
          p.data_vencimento ? format(new Date(p.data_vencimento+'T12:00:00'), 'dd/MM/yyyy') : '',
          p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente',
          fmt(p.valor_previsto || 0)
        ]),
        columnStyles: { 3: { halign: 'right' } }
      });
    }
  }

  // Handle do caso onde só tem 1 pagina sem table ou a tela de RDO draw
  const totalPages = (doc.internal as any).getNumberOfPages();
  // jsPDF autotable lida com os didDrawPage na criaçao pelas tables, 
  // caso nao caia nas tables (ex RDO vazio), aplicamos manually:
  if (type === 'rdo' && (!data.registros || data.registros.length === 0)) {
     // ja demos manual call
  }

  doc.save(`Relatorio-${type.toUpperCase()}-${obra.codigo || 'OBRA'}-${format(new Date(), 'yyyyMMdd')}.pdf`);
}
