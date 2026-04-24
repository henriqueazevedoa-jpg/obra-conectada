// ============================================================
// CALCULADORA DE ORÇAMENTO ESTIMATIVO — Engine de Cálculo
// Sprint 2 / Bloco 12
//
// Sem dependências externas. Recebe params + dados do banco
// e retorna um CalculadoraResultado completo.
// ============================================================

import type {
  CalculadoraParams,
  CalculadoraResultado,
  CUBRecord,
  EAPTemplateRecord,
  EtapaResultado,
  CronogramaEtapa,
  TipoEstrutura,
  TipoFundacao,
  Topografia,
  TipoCobertura,
} from '@/types/calculadora';

// ─────────────────────────────────────────────────────────────
// TABELAS DE FATORES
// ─────────────────────────────────────────────────────────────

const FATOR_ESTRUTURA: Record<TipoEstrutura, number> = {
  alvenaria_estrutural: 1.00,
  concreto_armado:      1.08,
  estrutura_metalica:   1.15,
  wood_frame:           0.95,
  steel_frame:          1.05,
};

// Baseado na NBR — cada pavimento adicional acrescenta ~3%
function calcFatorPavimentos(n: number): number {
  if (n <= 1) return 1.00;
  if (n === 2) return 1.03;
  if (n === 3) return 1.06;
  if (n <= 5)  return 1.08 + (n - 3) * 0.015;
  return 1.11 + (n - 5) * 0.01;
}

const FATOR_TOPOGRAFIA: Record<Topografia, number> = {
  plano:          1.00,
  aclive_leve:    1.03,
  aclive_forte:   1.10,
  declive_leve:   1.05,
  declive_forte:  1.14,
};

const FATOR_FUNDACAO: Record<TipoFundacao, number> = {
  radier:  0.97,
  sapata:  1.00,
  estaca:  1.12,
};

const FATOR_COBERTURA: Record<TipoCobertura, number> = {
  aparente_ceramica:      1.00,
  aparente_fibrocimento:  0.95,
  embutida_metalica:      1.05,
  laje_impermeabilizada:  1.08,
};

// Fator de padrão sobre o CUB (relativo ao padrão normal=1)
const FATOR_PADRAO = {
  baixo:  0.85,
  normal: 1.00,
  alto:   1.22,
};

// Fator sistemas especiais (acumulativo por feature)
function calcFatorSistemas(params: CalculadoraParams): number {
  let fator = 1.00;
  if (params.tem_area_lazer)          fator += 0.025;
  if (params.tem_aquecimento_solar)   fator += 0.015;
  if (params.tem_ar_condicionado)     fator += 0.030;
  if (params.tem_automacao)           fator += 0.020;
  if (params.tem_energia_fotovoltaica) fator += 0.025;
  if (params.tem_elevador)            fator += 0.045;
  return fator;
}

function calcFatorAcesso(params: CalculadoraParams): number {
  return params.acesso_dificil ? 1.08 : 1.00;
}

// ─────────────────────────────────────────────────────────────
// BUSCA DE CUB
// ─────────────────────────────────────────────────────────────

/**
 * Busca o melhor CUB para os parâmetros dados.
 * Prioriza override de empresa (company_id !== null) sobre global.
 */
export function buscarCUB(
  cubList: CUBRecord[],
  params: Pick<CalculadoraParams, 'estado' | 'tipo_uso' | 'padrao_acabamento'>
): CUBRecord | null {
  const candidatos = cubList.filter(
    (c) =>
      c.estado === params.estado &&
      c.tipo_uso === params.tipo_uso &&
      c.padrao === params.padrao_acabamento
  );

  if (candidatos.length === 0) {
    // Fallback 1: mesmo estado e tipo_uso, qualquer padrão (mais próximo)
    const fallback1 = cubList.filter(
      (c) => c.estado === params.estado && c.tipo_uso === params.tipo_uso
    );
    if (fallback1.length > 0) return fallback1[0];

    // Fallback 2: mesmo estado, tipo residencial_unifamiliar
    const fallback2 = cubList.filter(
      (c) => c.estado === params.estado && c.tipo_uso === 'residencial_unifamiliar'
    );
    if (fallback2.length > 0) return fallback2[0];

    return null;
  }

  // Preferir override da empresa
  const comEmpresa = candidatos.find((c) => c.company_id !== null);
  return comEmpresa ?? candidatos[0];
}

// ─────────────────────────────────────────────────────────────
// BUSCA DO TEMPLATE EAP
// ─────────────────────────────────────────────────────────────

/**
 * Filtra e ordena o template EAP para o tipo de uso dado.
 * Prioriza override de empresa sobre global.
 */
export function buscarEAP(
  eapList: EAPTemplateRecord[],
  tipo_uso: CalculadoraParams['tipo_uso'],
  company_id?: string
): EAPTemplateRecord[] {
  const todasParaTipo = eapList.filter((e) => e.tipo_uso === tipo_uso);

  if (todasParaTipo.length === 0) {
    // Fallback para residencial
    return eapList
      .filter((e) => e.tipo_uso === 'residencial_unifamiliar')
      .sort((a, b) => a.ordem - b.ordem);
  }

  // Preferir overrides de empresa onde existir, global onde não
  const etapasNomes = [...new Set(todasParaTipo.map((e) => e.etapa_nome))];
  const resultado: EAPTemplateRecord[] = [];

  for (const nome of etapasNomes) {
    const variantes = todasParaTipo.filter((e) => e.etapa_nome === nome);
    const comEmpresa = company_id
      ? variantes.find((e) => e.company_id === company_id)
      : undefined;
    resultado.push(comEmpresa ?? variantes[0]);
  }

  return resultado.sort((a, b) => a.ordem - b.ordem);
}

// ─────────────────────────────────────────────────────────────
// NORMALIZAÇÃO DE PERCENTUAIS
// ─────────────────────────────────────────────────────────────

/** Garante que a soma dos percentuais seja exatamente 100% */
function normalizarPercentuais(etapas: { percentual_base: number }[]): number[] {
  const soma = etapas.reduce((s, e) => s + e.percentual_base, 0);
  if (soma === 0) return etapas.map(() => 0);
  return etapas.map((e) => (e.percentual_base / soma) * 100);
}

// ─────────────────────────────────────────────────────────────
// CÁLCULO DO CRONOGRAMA
// ─────────────────────────────────────────────────────────────

/**
 * Gera o cronograma paramétrico.
 * As etapas são sequenciais com sobreposição de 20% com a próxima.
 */
export function gerarCronograma(
  etapas: EtapaResultado[],
  prazoTotal: number
): CronogramaEtapa[] {
  if (etapas.length === 0 || prazoTotal <= 0) return [];

  const somaValores = etapas.reduce((s, e) => s + e.valor, 0);
  const cronograma: CronogramaEtapa[] = [];

  let cursorSemana = 1;

  etapas.forEach((etapa, idx) => {
    const percentualCusto = somaValores > 0 ? (etapa.valor / somaValores) * 100 : 0;
    // Duração proporcional ao custo, com mínimo de 1 semana
    const duracao = Math.max(1, Math.round((percentualCusto / 100) * prazoTotal));
    const inicio = cursorSemana;
    const fim = inicio + duracao - 1;

    cronograma.push({
      nome: etapa.nome,
      inicio_semana: inicio,
      fim_semana: Math.min(fim, prazoTotal),
      percentual_custo: Number(percentualCusto.toFixed(2)),
    });

    // Sobreposição de 20% (exceto última etapa)
    if (idx < etapas.length - 1) {
      cursorSemana = inicio + Math.max(1, Math.floor(duracao * 0.8));
    }
  });

  // Garantir que última etapa termine no prazo total
  if (cronograma.length > 0) {
    cronograma[cronograma.length - 1].fim_semana = prazoTotal;
  }

  return cronograma;
}

// ─────────────────────────────────────────────────────────────
// CÁLCULO DO PRAZO
// ─────────────────────────────────────────────────────────────

/**
 * Estima o prazo total em semanas com base na área e tipo de uso.
 * Fórmula empírica calibrada para obras típicas brasileiras.
 */
function calcularPrazo(params: CalculadoraParams): number {
  const base = Math.sqrt(params.area_construida_m2) * 2.5;

  const multiplicadores: Record<string, number> = {
    residencial_unifamiliar: 1.0,
    residencial_multifamiliar: 1.4,
    comercial: 1.2,
    galpao_industrial: 0.9,
    reforma_interiores: 0.6,
  };

  const mult = multiplicadores[params.tipo_uso] ?? 1.0;
  const pavimentosFator = 1 + (params.num_pavimentos - 1) * 0.12;

  const semanas = Math.round(base * mult * pavimentosFator);
  return Math.max(8, Math.min(semanas, 260)); // entre 8 semanas e 5 anos
}

// ─────────────────────────────────────────────────────────────
// CÁLCULO DE CUSTOS ADICIONAIS
// ─────────────────────────────────────────────────────────────

function calcularCustosAdicionais(
  params: CalculadoraParams,
  custoBase: number
): { itens: EtapaResultado[]; total: number } {
  const ca = params.custos_adicionais;
  if (!ca) return { itens: [], total: 0 };

  const itens: EtapaResultado[] = [];

  if (ca.incluir_projeto_arquitetonico) {
    const valor = custoBase * 0.04;
    itens.push({ nome: 'Projeto Arquitetônico', percentual_base: 4, percentual_ajustado: 4, valor, origem: 'adicional' });
  }
  if (ca.incluir_projetos_complementares) {
    const valor = custoBase * 0.025;
    itens.push({ nome: 'Projetos Complementares', percentual_base: 2.5, percentual_ajustado: 2.5, valor, origem: 'adicional' });
  }
  if (ca.incluir_alvara_aprovacoes) {
    const valor = custoBase * 0.015;
    itens.push({ nome: 'Alvará e Aprovações', percentual_base: 1.5, percentual_ajustado: 1.5, valor, origem: 'adicional' });
  }
  if (ca.incluir_terreno && ca.valor_terreno_estimado) {
    itens.push({ nome: 'Terreno', percentual_base: 0, percentual_ajustado: 0, valor: ca.valor_terreno_estimado, origem: 'adicional' });
  }
  if (ca.incluir_custos_financiamento && ca.percentual_financiamento) {
    const valor = custoBase * (ca.percentual_financiamento / 100);
    itens.push({ nome: 'Custos de Financiamento', percentual_base: ca.percentual_financiamento, percentual_ajustado: ca.percentual_financiamento, valor, origem: 'adicional' });
  }
  if (ca.incluir_marketing_vendas && ca.percentual_marketing) {
    const valor = custoBase * (ca.percentual_marketing / 100);
    itens.push({ nome: 'Marketing e Vendas', percentual_base: ca.percentual_marketing, percentual_ajustado: ca.percentual_marketing, valor, origem: 'adicional' });
  }

  const total = itens.reduce((s, i) => s + i.valor, 0);
  return { itens, total };
}

// ─────────────────────────────────────────────────────────────
// ENGINE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export interface EngineInput {
  params: CalculadoraParams;
  cubList: CUBRecord[];
  eapList: EAPTemplateRecord[];
  companyId?: string;
}

/**
 * Calcula o orçamento estimativo completo.
 *
 * @throws Error se não encontrar CUB para o estado/tipo/padrão solicitado.
 */
export function calcularEstimativa(input: EngineInput): CalculadoraResultado {
  const { params, cubList, eapList, companyId } = input;

  // ── 1. Buscar CUB ───────────────────────────────────────────
  const cubRecord = buscarCUB(cubList, params);
  if (!cubRecord) {
    throw new Error(
      `CUB não encontrado para ${params.estado} / ${params.tipo_uso} / ${params.padrao_acabamento}. Configure os valores de CUB no painel admin.`
    );
  }

  // ── 2. Calcular fatores ─────────────────────────────────────
  const fAtorEstrutura = FATOR_ESTRUTURA[params.tipo_estrutura] ?? 1.0;
  const fatorPavimentos = calcFatorPavimentos(params.num_pavimentos);
  const fatorTopografia = FATOR_TOPOGRAFIA[params.topografia] ?? 1.0;
  const fatorFundacao = FATOR_FUNDACAO[params.tipo_fundacao] ?? 1.0;
  const fatorCobertura = FATOR_COBERTURA[params.tipo_cobertura] ?? 1.0;
  const fatorPadrao = FATOR_PADRAO[params.padrao_acabamento] ?? 1.0;
  const fatorSistemas = calcFatorSistemas(params);
  const fatorAcesso = calcFatorAcesso(params);

  const fatorTotal =
    fAtorEstrutura *
    fatorPavimentos *
    fatorTopografia *
    fatorFundacao *
    fatorCobertura *
    fatorPadrao *
    fatorSistemas *
    fatorAcesso;

  // ── 3. Custo base CUB ───────────────────────────────────────
  const cubValorM2 = cubRecord.valor_m2;
  const custoCubBruto = cubValorM2 * params.area_construida_m2 * fatorTotal;

  // ── 4. Distribuir por EAP ───────────────────────────────────
  const eapTemplate = buscarEAP(eapList, params.tipo_uso, companyId);
  const percentuaisNormalizados = normalizarPercentuais(eapTemplate);

  const etapasBase: EtapaResultado[] = eapTemplate.map((etapa, idx) => ({
    nome: etapa.etapa_nome,
    percentual_base: etapa.percentual_base,
    percentual_ajustado: Number(percentuaisNormalizados[idx].toFixed(4)),
    valor: (percentuaisNormalizados[idx] / 100) * custoCubBruto,
    origem: 'cub' as const,
  }));

  // ── 5. Ajustes financeiros ──────────────────────────────────
  const bdiPct = params.bdi_percentual ?? 20;
  const contingenciaPct = params.contingencia_percentual ?? 5;

  const custoConstrucaoBruto = custoCubBruto;
  const bdiValor = custoConstrucaoBruto * (bdiPct / 100);
  const contingenciaValor = custoConstrucaoBruto * (contingenciaPct / 100);

  // ── 6. Custos adicionais ────────────────────────────────────
  const { itens: etapasAdicionais, total: custosAdicionaisValor } =
    calcularCustosAdicionais(params, custoConstrucaoBruto);

  // ── 7. Total final ──────────────────────────────────────────
  const custoTotal =
    custoConstrucaoBruto + bdiValor + contingenciaValor + custosAdicionaisValor;

  const valorM2Resultante =
    params.area_construida_m2 > 0 ? custoTotal / params.area_construida_m2 : 0;

  // ── 8. Faixa de valores ─────────────────────────────────────
  // Derivada dos valores reais de cada etapa (base + sinapi + adicionais)
  // em vez de percentual fixo arbitrário sobre custo_total.
  // Cada etapa tem variância própria: ±5% (mínimo conservador) / +15% (máximo otimista)
  // Adicionais e BDI/contingência não variam (são fixos nos inputs).
  const todasEtapas = [...etapasBase, ...etapasAdicionais];
  const somaEtapasMin = todasEtapas.reduce((s, e) => s + e.valor * 0.95, 0);
  const somaEtapasMax = todasEtapas.reduce((s, e) => s + e.valor * 1.15, 0);
  const faixaMinima = somaEtapasMin + bdiValor + contingenciaValor;
  const faixaMaxima = somaEtapasMax + bdiValor + contingenciaValor;

  // ── 9. Cronograma ───────────────────────────────────────────
  const prazoSemanas = calcularPrazo(params);
  const cronograma = gerarCronograma(etapasBase, prazoSemanas);

  // ── 10. Preço de venda sugerido (apenas informativo) ────────
  // Assume margem de 30% sobre custo total (sem terreno)
  const custoProduto = custoConstrucaoBruto + bdiValor + contingenciaValor;
  const precoVendaSugerido = custoProduto * 1.30;

  return {
    metodo: params.metodo,
    estado: params.estado,
    tipo_uso: params.tipo_uso,

    custo_base_cub: custoCubBruto,
    cub_valor_m2: cubValorM2,

    fatores: {
      estrutura: fAtorEstrutura,
      pavimentos: fatorPavimentos,
      topografia: fatorTopografia,
      fundacao: fatorFundacao,
      cobertura: fatorCobertura,
      padrao: fatorPadrao,
      sistemas_especiais: fatorSistemas,
      acesso: fatorAcesso,
    },

    etapas_base: etapasBase,
    etapas_sinapi: [], // Preenchido pelo Método B/C no hook
    etapas_adicionais: etapasAdicionais,

    custo_construcao_bruto: custoConstrucaoBruto,
    bdi_valor: bdiValor,
    contingencia_valor: contingenciaValor,
    custos_adicionais_valor: custosAdicionaisValor,

    custo_total: custoTotal,
    valor_m2_resultante: valorM2Resultante,

    faixa_minima: faixaMinima,
    faixa_maxima: faixaMaxima,

    prazo_semanas: prazoSemanas,
    cronograma,

    preco_venda_sugerido: precoVendaSugerido,
  };
}

// ─────────────────────────────────────────────────────────────
// HELPERS UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

/** Formata valor em BRL */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata m² com 2 casas */
export function formatarM2(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
}

/** Retorna lista de estados brasileiros */
export const ESTADOS_BRASIL = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' },
] as const;

/** Labels amigáveis para tipo de uso */
export const TIPO_USO_LABELS: Record<string, string> = {
  residencial_unifamiliar:  'Residencial Unifamiliar',
  residencial_multifamiliar: 'Residencial Multifamiliar',
  comercial:                'Comercial',
  galpao_industrial:        'Galpão / Industrial',
  reforma_interiores:       'Reforma de Interiores',
};

/** Labels para padrão */
export const PADRAO_LABELS: Record<string, string> = {
  baixo:  'Econômico (Baixo)',
  normal: 'Padrão (Normal)',
  alto:   'Alto Padrão',
};

/** Labels para método */
export const METODO_LABELS: Record<string, string> = {
  a_cub_simplificado:      'Método A — CUB Simplificado',
  b_hibrido:               'Método B — Híbrido (CUB + SINAPI)',
  c_sinapi_quantitativos:  'Método C — SINAPI Quantitativos',
};
