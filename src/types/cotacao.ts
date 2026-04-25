/**
 * Tipos compartilhados do módulo de Cotações
 * Versão unificada com suporte completo a campos SINAPI
 */

/** Insumo consolidado para o mapa de cotações */
export interface MapaItem {
  key: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoAtual: number | null;
  etapaNome: string;
  etapaId: string;
  /** 'SINAPI' quando o preço vem da tabela SINAPI importada */
  fonteReferencia?: string;
  /** true quando é uma composição sem detalhamento de insumos (não usa usaInsumos) */
  ehComposicaoSemInsumos?: boolean;
  /** Dados SINAPI gravados pelo assistente de IA (vêm do banco, sem RPC adicional) */
  sinapiPreco?: number | null;
  sinapiCodigo?: number | null;
  sinapiFonte?: string | null;
  sinapiConfidence?: string | null;
  sinapiConfirmado?: boolean;
}

/** Fornecedor unificado: pode vir de link respondido ou de entrada manual */
export interface MapaFornecedor {
  id: string; // link.id ou slug do nome para manuais
  nome: string;
  tipo: 'link' | 'manual';
  status?: 'pendente' | 'respondido' | 'expirado'; // só para links
  precos: Record<string, number>; // item_key → preço unitário
  especialidades?: string[]; // codigos de cotacao_categorias
  fonte: 'link' | 'manual';
}

/** Preço adotado conscientemente pelo usuário para um item */
export interface AdoptedPrice {
  fornId: string;
  fornNome: string;
  preco: number;
}

/** Link de cotação enviado para fornecedor */
export interface CotacaoLink {
  id: string;
  token: string;
  fornecedor_nome: string;
  fornecedor_email: string | null;
  status: 'pendente' | 'respondido' | 'expirado';
  itens: MapaItem[];
  respostas: Record<string, number>;
  created_at: string;
  expires_at: string | null;
}

export type SortField = 'descricao' | 'quantidade' | 'precoAtual' | null;
export type SortDir = 'asc' | 'desc';

/**
 * Filtro de status dos itens:
 * - sem_preco: sem nenhum preço (nem SINAPI)
 * - cotado: tem preço de fornecedor real (fonte != SINAPI)
 * - sinapi: tem apenas preço de referência SINAPI
 * - excluir_sinapi: tudo exceto itens SINAPI (default: oculta SINAPI da view)
 */
export type StatusFilter = 'todos' | 'sem_preco' | 'cotado' | 'sinapi' | 'excluir_sinapi';
