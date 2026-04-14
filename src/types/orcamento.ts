export interface OrcamentoSubitem {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoUnitario: number | null;
  precoTotal: number;

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
  subitens: OrcamentoSubitem[];
  usaSubitens: boolean;

  fonteReferencia?: string;
  codigoReferenciaExterna?: string;
  referenciaCompetencia?: string;
  ufReferencia?: string;
  regimeReferencia?: string;
}

export interface OrcamentoCategoria {
  id: string;
  codigo: string;
  nome: string;
  precoTotal: number;
  composicoes: OrcamentoComposicao[];
  usaComposicoes: boolean;
}

export interface OrcamentoObra {
  categorias: OrcamentoCategoria[];
}