/**
 * criarPagamentoDeMedicao.ts
 * Quando uma medição de EMPREITEIRO é emitida, insere um pagamento
 * previsto em 'pagamentos' com vencimento = data_referencia + 30 dias.
 */
import { supabase } from '@/integrations/supabase/untyped';

interface CriarPagamentoParams {
  obraId: string;
  contratoId: string;
  medicaoId: string;
  contratoNumero: string;
  contratado: string;
  valorPeriodo: number;
  dataReferencia: string; // YYYY-MM-DD
}

export async function criarPagamentoDeMedicao(params: CriarPagamentoParams): Promise<void> {
  const {
    obraId,
    contratoId,
    medicaoId,
    contratoNumero,
    contratado,
    valorPeriodo,
    dataReferencia,
  } = params;

  // Vencimento = data_referencia + 30 dias
  const dataRef = new Date(dataReferencia + 'T12:00:00');
  dataRef.setDate(dataRef.getDate() + 30);
  const dataVencimento = dataRef.toISOString().slice(0, 10);

  const payload = {
    obra_id:        obraId,
    descricao:      `Medição — ${contratoNumero} — ${contratado}`,
    valor_previsto: valorPeriodo,
    status:         'previsto',
    tipo_pagamento: 'servico',
    data_vencimento: dataVencimento,
    // Campos opcionais para rastreabilidade
    etapa_orcamento: `Contrato ${contratoId} · BM ${medicaoId}`,
  };

  const { error } = await (supabase as any)
    .from('pagamentos')
    .insert(payload);

  if (error) {
    // Log sem bloquear o fluxo principal
    console.warn('[criarPagamentoDeMedicao] Erro ao criar pagamento:', error.message);
  }
}
