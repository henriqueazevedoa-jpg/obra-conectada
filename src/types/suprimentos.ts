export type CotacaoLoteStatus = 'aberto' | 'em_cotacao' | 'finalizado';
export type CotacaoFase = 'planejamento' | 'execucao';

export interface CotacaoLote {
  id: string;
  obra_id: string;
  company_id: string | null;
  titulo: string;
  status: CotacaoLoteStatus;
  fase: CotacaoFase;
  created_at: string;
  updated_at: string;
}

export interface CotacaoResposta {
  id: string;
  lote_id: string;
  item_origem_id: string; // Referência ao ID do Insumo (orcamento_subitens) ou Item (custo_real_itens)
  fornecedor_nome: string;
  preco_unitario: number;
  prazo_entrega_dias: number | null;
  is_vencedor: boolean;
  observacoes: string | null;
  created_at: string;
}

export interface ItemParaCotacao {
  id: string; // ID da tabela insumos_pendentes_cotacao
  obra_id: string;
  subitem_id: string | null;
  nome_insumo: string;
  unidade: string | null;
  categoria: string | null;
  status: 'pendente' | 'em_cotacao' | 'resolvido' | 'ignorado';
  created_at: string;
}
