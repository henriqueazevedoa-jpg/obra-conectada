import { supabase } from '@/integrations/supabase/untyped';

// In-memory lock to prevent React StrictMode or double-fetch spam.
// Ranks as an optimizer, the primary absolute protection is the DB check.
const localLocks = new Set<string>();

/**
 * Verifica no banco de dados se uma notificação exata já foi disparada
 * dentro de um intervalo de tempo, mitigando duplicatas operacionais.
 */
export async function notificacaoJaExiste(
  companyId: string,
  tipo: string,
  metadataKey: string,
  metadataValue: string,
  janelaDias: number = 1
): Promise<boolean> {
  const desde = new Date();
  desde.setDate(desde.getDate() - janelaDias);

  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('company_id', companyId)
    .eq('tipo', tipo)
    .gte('created_at', desde.toISOString())
    .contains('metadata', { [metadataKey]: metadataValue })
    .limit(1)
    .maybeSingle();

  return !!data;
}

export interface NotificationPayload {
  company_id: string;
  obra_id?: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  acao_url?: string | null;
  acao_label?: string | null;
  prioridade?: 'informativa' | 'importante' | 'critica';
  metadataKey: string;
  metadataValue: string;
}

/**
 * Flow unificado para envios dedup.
 * Encapsula a verificação de duplicidade e protege re-renders por meio de in-memory locks.
 */
export async function enviarNotificacaoDedup(
  payload: NotificationPayload,
  janelaDias: number = 1
): Promise<boolean> {
  const { company_id, tipo, metadataKey, metadataValue } = payload;
  const lockKey = `${company_id}:${tipo}:${metadataKey}:${metadataValue}`;

  // 1. Otimizador in-memory (previne spam síncrono no frontend)
  if (localLocks.has(lockKey)) return false;
  localLocks.add(lockKey);
  setTimeout(() => localLocks.delete(lockKey), 10000); // lock morre em 10s

  try {
    // 2. Garantia real: validação no banco de dados
    const existe = await notificacaoJaExiste(company_id, tipo, metadataKey, metadataValue, janelaDias);
    if (existe) return false;

    // 3. Efetiva o INSERT
    await (supabase.from('notifications') as any).insert({
      company_id: payload.company_id,
      obra_id: payload.obra_id || null,
      tipo: payload.tipo,
      titulo: payload.titulo,
      mensagem: payload.mensagem,
      acao_url: payload.acao_url || null,
      acao_label: payload.acao_label || null,
      prioridade: payload.prioridade || 'informativa',
      lida: false,
      metadata: { [metadataKey]: metadataValue },
    });
    
    return true;
  } catch (err) {
    console.error('Erro ao enviar notificação dedup:', err);
    return false;
  }
}
