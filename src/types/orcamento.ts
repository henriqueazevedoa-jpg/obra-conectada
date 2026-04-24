export interface OrcamentoInsumo {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoUnitario: number | null;
  precoTotal: number;
  tipo_item?: 'material' | 'mao_obra' | 'equipamento' | 'servico';
  pending?: boolean;

  codigoReferenciaExterna?: string;
  origemGrupoTitulo?: string;
  origemComposicaoCodigo?: string;
  origemComposicaoDescricao?: string;
}

export interface OrcamentoComposicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoUnitario: number | null;
  precoTotal: number;
  insumos: OrcamentoInsumo[];
  usaInsumos: boolean;

  fonteReferencia?: string;
  codigoReferenciaExterna?: string;
  referenciaCompetencia?: string;
  ufReferencia?: string;
  regimeReferencia?: string;
}

export interface OrcamentoEtapa {
  id: string;
  codigo: string;
  nome: string;
  precoTotal: number;
  composicoes: OrcamentoComposicao[];
  usaComposicoes: boolean;
}

export interface OrcamentoObra {
  etapas: OrcamentoEtapa[];
}