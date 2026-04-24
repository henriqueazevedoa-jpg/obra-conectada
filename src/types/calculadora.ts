// ============================================================
// CALCULADORA DE ORÇAMENTO ESTIMATIVO — Tipos TypeScript
// Sprint 2 / Bloco 11
// ============================================================

// ── Enums / Unions ──────────────────────────────────────────

export type TipoUso =
  | 'residencial_unifamiliar'
  | 'residencial_multifamiliar'
  | 'comercial'
  | 'galpao_industrial'
  | 'reforma_interiores';

export type PadraoAcabamento = 'baixo' | 'normal' | 'alto';

export type TipoEstrutura =
  | 'alvenaria_estrutural'
  | 'concreto_armado'
  | 'estrutura_metalica'
  | 'wood_frame'
  | 'steel_frame';

export type TipoFundacao = 'radier' | 'sapata' | 'estaca';

export type Topografia =
  | 'plano'
  | 'aclive_leve'
  | 'aclive_forte'
  | 'declive_leve'
  | 'declive_forte';

export type TipoCobertura =
  | 'aparente_ceramica'
  | 'aparente_fibrocimento'
  | 'embutida_metalica'
  | 'laje_impermeabilizada';

export type MetodoCalculo =
  | 'a_cub_simplificado'
  | 'b_hibrido'
  | 'c_sinapi_quantitativos';

export type ConstrucaoExistente = 'nenhuma' | 'parcial' | 'total';

export type RegimeTributario = 'sem_desoneracao' | 'com_desoneracao';

// ── Parâmetros Obrigatórios ──────────────────────────────────

export interface ParamsObrigatorios {
  /** UF em 2 caracteres (ex: "SP") */
  estado: string;
  tipo_uso: TipoUso;
  padrao_acabamento: PadraoAcabamento;
  area_construida_m2: number;
  tipo_estrutura: TipoEstrutura;
  num_pavimentos: number;
  topografia: Topografia;
  tipo_fundacao: TipoFundacao;
  tipo_cobertura: TipoCobertura;
  metodo: MetodoCalculo;
}

// ── Parâmetros Opcionais (influenciam fatores) ───────────────

export interface ParamsOpcionais {
  construcao_existente?: ConstrucaoExistente;
  area_construcao_existente_m2?: number;
  area_terreno_m2?: number;

  // Programa arquitetônico
  num_quartos?: number;
  num_banheiros?: number;
  num_vagas?: number;

  // Sistemas especiais
  tem_area_lazer?: boolean;
  tem_aquecimento_solar?: boolean;
  tem_ar_condicionado?: boolean;
  tem_automacao?: boolean;
  tem_energia_fotovoltaica?: boolean;
  tem_elevador?: boolean;

  // Logística
  acesso_dificil?: boolean;
  regime_tributario?: RegimeTributario;
}

// ── Custos Adicionais (empreendimento) ──────────────────────

export interface CustosAdicionaisConfig {
  incluir_projeto_arquitetonico?: boolean;
  incluir_projetos_complementares?: boolean;
  incluir_alvara_aprovacoes?: boolean;
  incluir_terreno?: boolean;
  valor_terreno_estimado?: number;
  incluir_custos_financiamento?: boolean;
  percentual_financiamento?: number;
  incluir_marketing_vendas?: boolean;
  percentual_marketing?: number;
}

// ── Parâmetros Financeiros ───────────────────────────────────

export interface ParamsFinanceiros {
  bdi_percentual?: number;         // default: 20
  contingencia_percentual?: number;  // default: 5
  fator_seguranca?: number;          // default: 1.05
  custos_adicionais?: CustosAdicionaisConfig;
}

// ── Quantitativos Reais (Método C) ──────────────────────────

export interface QuantitativosReais {
  area_forma_m2?: number;
  volume_concreto_m3?: number;
  peso_aco_kg?: number;
  area_alvenaria_m2?: number;
  area_revestimento_m2?: number;
  area_piso_m2?: number;
  pontos_eletricos?: number;
  pontos_hidraulicos?: number;
}

// ── Params Completo (intersecção de todos) ───────────────────

export type CalculadoraParams = ParamsObrigatorios &
  ParamsOpcionais &
  ParamsFinanceiros & {
    quantitativos_reais?: QuantitativosReais;
  };

// ── Resultado por Etapa ──────────────────────────────────────

export interface EtapaResultado {
  nome: string;
  percentual_base: number;
  percentual_ajustado: number;
  valor: number;
  /** Origem do custo: calculado por CUB, referência SINAPI ou fora da obra */
  origem: 'cub' | 'sinapi' | 'adicional';
  /** Código SINAPI da composição usada (Método B/C) */
  sinapi_codigo?: number;
}

// ── Etapa do Cronograma ──────────────────────────────────────

export interface CronogramaEtapa {
  nome: string;
  inicio_semana: number;
  fim_semana: number;
  percentual_custo: number;
}

// ── Resultado Completo da Calculadora ───────────────────────

export interface CalculadoraResultado {
  // Metadados
  metodo: MetodoCalculo;
  estado: string;
  tipo_uso: TipoUso;

  // Custo base (antes de BDI/contingência)
  custo_base_cub: number;
  cub_valor_m2: number;

  // Fatores aplicados
  fatores: {
    estrutura: number;
    pavimentos: number;
    topografia: number;
    fundacao: number;
    cobertura: number;
    padrao: number;
    sistemas_especiais: number;
    acesso: number;
  };

  // Etapas (distribuição por EAP)
  etapas_base: EtapaResultado[];       // Calculadas pelo CUB
  etapas_sinapi: EtapaResultado[];     // Refinadas por SINAPI (Método B/C)
  etapas_adicionais: EtapaResultado[]; // Custos do empreendimento

  // Totais antes de ajustes
  custo_construcao_bruto: number;

  // Ajustes
  bdi_valor: number;
  contingencia_valor: number;
  custos_adicionais_valor: number;

  // Totais finais
  custo_total: number;
  valor_m2_resultante: number;

  // Faixa de valores (mín -10%, máx +15%)
  faixa_minima: number;
  faixa_maxima: number;

  // Cronograma
  prazo_semanas: number;
  cronograma: CronogramaEtapa[];

  // Preço de venda sugerido (apenas informativo)
  preco_venda_sugerido?: number;
}

// ── Dados de CUB do banco ────────────────────────────────────

export interface CUBRecord {
  estado: string;
  tipo_uso: TipoUso;
  padrao: PadraoAcabamento;
  valor_m2: number;
  mes_referencia: string;
  company_id?: string | null;
}

// ── Template de EAP do banco ─────────────────────────────────

export interface EAPTemplateRecord {
  tipo_uso: TipoUso;
  etapa_nome: string;
  percentual_base: number;
  ordem: number;
  company_id?: string | null;
}

// ── Configurações da empresa ─────────────────────────────────

export interface CalculadoraConfiguracoes {
  company_id: string;
  bdi_padrao: number;
  contingencia_padrao: number;
  fator_seguranca_padrao: number;
  atualizacao_automatica_cub: boolean;
}

// ── Conta/Acesso da calculadora ──────────────────────────────

export interface CalculadoraConta {
  company_id: string;
  usuario_id: string;
  limite_estimativas_mes: number;
  estimativas_geradas_mes: number;
  permite_metodo_c: boolean;
  permite_exportar_pdf: boolean;
  data_renovacao: string;
}

// ── Flags de acesso por plano ────────────────────────────────

export interface AcessoCalculadora {
  metodo_a: boolean;
  metodo_b: boolean;
  metodo_c: boolean;
  pdf: boolean;
  salvar_estimativa: boolean;
  limite_mensal: number | null; // null = ilimitado
  estimativas_usadas: number;
  plano_slug: string | null;
}
