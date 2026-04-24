import jsPDF from 'jspdf';
import type { CalculadoraResultado, CalculadoraParams, EtapaResultado, CronogramaEtapa } from '@/types/calculadora';

// ── Constantes ────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PRIMARY: [number, number, number] = [79, 70, 183];
const GRAY_LIGHT: [number, number, number] = [245, 245, 248];
const TEXT_DARK: [number, number, number] = [30, 27, 60];
const TEXT_MID: [number, number, number] = [90, 85, 120];

export interface PDFConfig {
  nome_obra?: string;
  nome_cliente?: string;
  logo_url?: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
  empresa_endereco?: string;
  responsavel_nome?: string;
  responsavel_cargo?: string;
  validade_dias?: number;
  texto_condicoes?: string;
}

// ── Helpers ───────────────────────────────────────────────────

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function addPageNum(doc: jsPDF, num: number) {
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MID);
  doc.text(`${num} / 5`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
}

async function urlToBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    return await new Promise<string>(res => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Página 1: CAPA ────────────────────────────────────────────

async function pag1(doc: jsPDF, config: PDFConfig) {
  // Retângulo primário no topo
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_W, 65, 'F');

  // Logo
  if (config.logo_url) {
    const b64 = await urlToBase64(config.logo_url);
    if (b64) {
      try { doc.addImage(b64, 'PNG', MARGIN, 12, 40, 20); } catch {}
    }
  }

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA COMERCIAL', PAGE_W / 2, 32, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Estimativa de Custo de Obra', PAGE_W / 2, 45, { align: 'center' });

  // Corpo
  let y = 85;
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(config.nome_obra ?? 'Estimativa de Obra', MARGIN, y);
  y += 10;

  if (config.nome_cliente) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MID);
    doc.text(`Cliente: ${config.nome_cliente}`, MARGIN, y);
    y += 8;
  }

  // Linha separadora
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 4, PAGE_W - MARGIN, y + 4);
  y += 16;

  // Dados da empresa
  if (config.empresa_nome || config.empresa_cnpj || config.empresa_endereco) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text('Dados da Empresa', MARGIN, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MID);
    if (config.empresa_nome)     { doc.text(config.empresa_nome, MARGIN, y); y += 6; }
    if (config.empresa_cnpj)     { doc.text(`CNPJ: ${config.empresa_cnpj}`, MARGIN, y); y += 6; }
    if (config.empresa_endereco) { doc.text(config.empresa_endereco, MARGIN, y); y += 6; }
    y += 6;
  }

  // Datas
  const hoje = new Date();
  const validade = new Date(hoje.getTime() + (config.validade_dias ?? 30) * 864e5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);
  doc.text(`Data de emissão: ${fmtDate(hoje)}`, MARGIN, y); y += 7;
  doc.text(`Validade da proposta: ${fmtDate(validade)}`, MARGIN, y);

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MID);
  doc.text('Gerado pela Calculadora de Orçamento — Lastra', PAGE_W / 2, PAGE_H - 12, { align: 'center' });
  addPageNum(doc, 1);
}

// ── Página 2: DADOS DA OBRA ───────────────────────────────────

function pag2(doc: jsPDF, params: CalculadoraParams, resultado: CalculadoraResultado) {
  doc.addPage();
  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('Parâmetros da Obra', MARGIN, y);
  y += 12;

  const dados: [string, string][] = [
    ['Estado', params.estado],
    ['Tipo de uso', params.tipo_uso?.replace(/_/g, ' ') ?? '—'],
    ['Área construída', `${params.area_construida_m2} m²`],
    ['Padrão de acabamento', params.padrao_acabamento ?? '—'],
    ['Tipo de estrutura', params.tipo_estrutura ?? '—'],
    ['N° de pavimentos', String(params.num_pavimentos ?? '—')],
    ['Topografia', params.topografia ?? '—'],
    ['Tipo de fundação', params.tipo_fundacao ?? '—'],
  ];
  if (params.num_quartos)              dados.push(['Quartos', String(params.num_quartos)]);
  if (params.num_vagas)                dados.push(['Vagas de garagem', String(params.num_vagas)]);
  if (params.tem_energia_fotovoltaica) dados.push(['Energia solar', 'Sim']);
  if (params.tem_automacao)            dados.push(['Automação', 'Sim']);

  // Tabela 2 colunas
  let col = 0;
  dados.forEach(([label, value], i) => {
    const x = col === 0 ? MARGIN : PAGE_W / 2 + 5;
    if (i % 2 === 0 && i > 0 && col === 0) y += 14;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MID);
    doc.text(label, x, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text(value, x, y + 5);
    col = col === 0 ? 1 : 0;
    if (col === 0) y += 0;
  });

  y += 20;

  // Box de nota
  doc.setFillColor(...GRAY_LIGHT);
  doc.roundedRect(MARGIN, y, CONTENT_W, 32, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);
  const linhas = doc.splitTextToSize(
    `Esta estimativa foi elaborada pelo método paramétrico CUB/SINAPI com precisão típica de ±10–15%. Valores sujeitos a variação conforme projeto executivo e condições locais de mercado.`,
    CONTENT_W - 10
  );
  doc.text(linhas, MARGIN + 5, y + 8);

  addPageNum(doc, 2);
}

// ── Página 3: ESTIMATIVA ──────────────────────────────────────

function pag3(doc: jsPDF, resultado: CalculadoraResultado) {
  doc.addPage();
  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('Estimativa de Custos', MARGIN, y);
  y += 12;

  // Faixa de valores
  const min = resultado.faixa_minima ?? resultado.custo_total * 0.85;
  const max = resultado.faixa_maxima ?? resultado.custo_total * 1.15;
  const central = resultado.custo_total;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);
  doc.text('Faixa de valores estimados:', MARGIN, y); y += 7;

  const barX = MARGIN;
  const barW = CONTENT_W;
  doc.setFillColor(...GRAY_LIGHT);
  doc.roundedRect(barX, y, barW, 10, 2, 2, 'F');
  doc.setFillColor(...PRIMARY);
  const fill = barW * 0.6;
  doc.roundedRect(barX + barW * 0.2, y, fill, 10, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MID);
  doc.text(moeda(min), barX, y + 16);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text(moeda(central), barX + barW / 2, y + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);
  doc.text(moeda(max), barX + barW, y + 16, { align: 'right' });
  y += 26;

  // Tabela de etapas
  const renderSecao = (titulo: string, etapas: any[]) => {
    if (!etapas?.length) return;
    doc.setFillColor(...PRIMARY);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, MARGIN + 3, y + 5);
    y += 10;

    etapas.forEach((e: EtapaResultado) => {
      if (y > PAGE_H - MARGIN - 10) { doc.addPage(); y = MARGIN; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_DARK);
      doc.text(e.nome ?? '—', MARGIN + 2, y);
      doc.text(`${(e.percentual_ajustado ?? 0).toFixed(1)}%`, MARGIN + 110, y, { align: 'right' });
      doc.text(moeda(e.valor ?? 0), PAGE_W - MARGIN, y, { align: 'right' });
      doc.setDrawColor(220, 218, 240);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
      y += 7;
    });
    y += 4;
  };

  renderSecao('Custo Base', resultado.etapas_base);
  renderSecao('Instalações / SINAPI', resultado.etapas_sinapi);
  renderSecao('Adicionais', resultado.etapas_adicionais);

  // Resumo
  y += 4;
  const resumo: [string, number, boolean][] = [
    ['Custo de construção', resultado.custo_total, false],
    ['BDI + Contingência', resultado.bdi_valor + resultado.contingencia_valor, false],
    ['Preço de venda sugerido', resultado.preco_venda_sugerido ?? resultado.custo_total, true],
  ];
  resumo.forEach(([label, val, bold]) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    if (bold) { doc.setTextColor(...PRIMARY); } else { doc.setTextColor(...TEXT_DARK); }
    doc.text(label, MARGIN, y);
    doc.text(moeda(val), PAGE_W - MARGIN, y, { align: 'right' });
    y += 7;
  });

  addPageNum(doc, 3);
}

// ── Página 4: CRONOGRAMA ──────────────────────────────────────

function pag4(doc: jsPDF, resultado: CalculadoraResultado) {
  doc.addPage();
  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('Cronograma Estimado', MARGIN, y);
  y += 8;

  const semanas = resultado.prazo_semanas ?? 0;
  const meses = Math.round(semanas / 4.3);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);
  doc.text(`Prazo total: ${semanas} semanas (~${meses} meses)`, MARGIN, y);
  y += 10;

  // Tabela de etapas cronograma
  const etapas = resultado.cronograma ?? [];
  if (etapas.length) {
    doc.setFillColor(...PRIMARY);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    ['Etapa', 'Início (sem.)', 'Duração', 'Fim (sem.)'].forEach((h, i) => {
      const xs = [MARGIN + 2, MARGIN + 80, MARGIN + 115, MARGIN + 145];
      doc.text(h, xs[i], y + 5);
    });
    y += 10;

    etapas.forEach((e: CronogramaEtapa) => {
      if (y > PAGE_H - MARGIN - 10) { doc.addPage(); y = MARGIN; }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_DARK);
      doc.setFontSize(8);
      const xs = [MARGIN + 2, MARGIN + 80, MARGIN + 115, MARGIN + 145];
      const duracao = e.fim_semana - e.inicio_semana + 1;
      const vals = [
        e.nome?.slice(0, 35) ?? '—',
        String(e.inicio_semana ?? '—'),
        `${duracao} sem.`,
        String(e.fim_semana ?? '—'),
      ];
      vals.forEach((v, i) => doc.text(v, xs[i], y));
      doc.setDrawColor(220, 218, 240);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
      y += 7;
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MID);
    doc.text('Cronograma não disponível para o método utilizado.', MARGIN, y);
  }

  addPageNum(doc, 4);
}

// ── Página 5: CONDIÇÕES ───────────────────────────────────────

function pag5(doc: jsPDF, config: PDFConfig, params: CalculadoraParams) {
  doc.addPage();
  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('Condições Gerais', MARGIN, y);
  y += 12;

  const valDias = config.validade_dias ?? 30;
  const textoCondicoes = config.texto_condicoes ??
    `Esta proposta tem validade de ${valDias} dias a partir da data de emissão. Os valores são estimativos e baseados em parâmetros paramétricos (CUB/SINAPI). O orçamento definitivo será elaborado após aprovação dos projetos executivos e levantamento detalhado de quantitativos. Preços sujeitos a alteração conforme flutuação do mercado e disponibilidade de mão de obra.`;

  const linhas = doc.splitTextToSize(textoCondicoes, CONTENT_W);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);
  doc.text(linhas, MARGIN, y);
  y += linhas.length * 6 + 20;

  // Assinatura
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + 120, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text('Local e data: _______________, ___ de _________ de ______', MARGIN, y);
  y += 12;
  if (config.responsavel_nome) {
    doc.setFont('helvetica', 'bold');
    doc.text(config.responsavel_nome, MARGIN, y);
    y += 6;
  }
  if (config.responsavel_cargo) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MID);
    doc.text(config.responsavel_cargo, MARGIN, y);
  }

  addPageNum(doc, 5);
}

// ── Exportar ──────────────────────────────────────────────────

export async function gerarPropostaPDF(
  resultado: CalculadoraResultado,
  params: CalculadoraParams,
  config: PDFConfig = {}
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  await pag1(doc, config);
  pag2(doc, params, resultado);
  pag3(doc, resultado);
  pag4(doc, resultado);
  pag5(doc, config, params);

  const data = new Date().toISOString().slice(0, 10);
  const estado = params.estado?.toLowerCase() ?? 'br';
  const tipo = params.tipo_uso?.toLowerCase().replace(/_/g, '-') ?? 'obra';
  doc.save(`estimativa-obra-${estado}-${tipo}-${data}.pdf`);
}
