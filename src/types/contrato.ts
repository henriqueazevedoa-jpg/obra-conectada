// src/types/contrato.ts

export type ContratoTipo = 'cliente' | 'empreiteiro';
export type ContratoStatus = 'ativo' | 'concluido' | 'distratado' | 'rascunho';
export type ModalidadeMedicao = 'percentual' | 'quantidade' | 'livre';

export interface Contrato {
  id: string;
  obra_id: string;
  numero: string;
  tipo: ContratoTipo;
  descricao: string;
  contratado: string;
  contratado_id?: string;
  cnpj?: string;
  valor_inicial: number;
  valor_atual: number;
  modalidade_medicao: ModalidadeMedicao;
  status: ContratoStatus;
  data_inicio?: string;
  data_fim_prevista?: string;
  data_fim_real?: string;
  moeda: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export type MedicaoStatus = 'rascunho' | 'emitido' | 'aprovado' | 'contestado' | 'pago';

export interface ContratoMedicao {
  id: string;
  obra_id: string;
  contrato_id: string;
  numero_medicao: number;
  data_referencia: string;
  data_emissao?: string;
  status: MedicaoStatus;
  aprovacao_token?: string;
  percentual_acumulado_anterior?: number;
  percentual_periodo?: number;
  percentual_acumulado?: number;
  valor_periodo: number;
  valor_acumulado: number;
  responsavel_id?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContratoMedicaoItem {
  id?: string;
  medicao_id?: string;
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

export interface ContratoComMetricas extends Contrato {
  total_medido: number;
}

export type AditivoTipo = 'valor' | 'prazo' | 'escopo';
export type AditivoStatus = 'pendente' | 'assinado';

export interface ContratoAditivo {
  id: string;
  contrato_id: string;
  numero_aditivo: number;
  tipo: AditivoTipo;
  delta_valor?: number;
  delta_prazo_dias?: number;
  justificativa: string;
  status: AditivoStatus;
  data_assinatura?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}
