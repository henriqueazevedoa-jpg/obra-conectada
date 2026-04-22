import { supabase } from '@/integrations/supabase/untyped';

export type NotificationTipo =
  | 'pagamento_vencendo'
  | 'pagamento_atrasado'
  | 'fluxo_negativo'
  | 'material_faltante'
  | 'estoque_critico'
  | 'recebimento_pendente'
  | 'pedido_sem_resposta'
  | 'etapa_atrasada'
  | 'medicao_pendente'
  | 'diario_nao_preenchido'
  | 'item_urgente_diario'
  | 'checagem_semanal'
  | 'contrato_medicao_vencendo';

export type NotificationPrioridade = 'critica' | 'importante' | 'informativa';

export interface NotificationPayload {
  company_id: string;
  obra_id?: string;
  user_id?: string;
  tipo: NotificationTipo;
  prioridade?: NotificationPrioridade;
  titulo: string;
  mensagem?: string;
  acao_url?: string;
  acao_label?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insere uma notificação na tabela `notifications`.
 * Falha silenciosa — não deve quebrar o fluxo principal.
 */
export async function createNotification(p: NotificationPayload): Promise<void> {
  try {
    await (supabase as any).from('notifications').insert({
      company_id: p.company_id,
      obra_id: p.obra_id ?? null,
      user_id: p.user_id ?? null,
      tipo: p.tipo,
      prioridade: p.prioridade ?? 'informativa',
      titulo: p.titulo,
      mensagem: p.mensagem ?? null,
      acao_url: p.acao_url ?? null,
      acao_label: p.acao_label ?? null,
      metadata: p.metadata ?? {},
    });
  } catch (err) {
    console.warn('[createNotification] falha silenciosa:', err);
  }
}
