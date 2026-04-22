import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';

export type NotificationDisplayType = 'alerta' | 'pagamento' | 'prazo' | 'sucesso';

export interface AppNotification {
  id: string;
  tipo: string;
  prioridade: 'critica' | 'importante' | 'informativa';
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  acao_url: string | null;
  acao_label: string | null;
  obra_id: string | null;
  created_at: string;
  // campo resolvido no cliente
  displayType: NotificationDisplayType;
}

// Mapeamento tipo → displayType
function resolveDisplayType(tipo: string): NotificationDisplayType {
  if (
    ['material_faltante', 'estoque_critico', 'item_urgente_diario',
      'etapa_atrasada', 'fluxo_negativo'].includes(tipo)
  ) return 'alerta';

  if (['pagamento_vencendo', 'pagamento_atrasado'].includes(tipo)) return 'pagamento';

  if (
    ['recebimento_pendente', 'medicao_pendente',
      'diario_nao_preenchido', 'checagem_semanal',
      'pedido_sem_resposta', 'contrato_medicao_vencendo'].includes(tipo)
  ) return 'prazo';

  return 'sucesso';
}

// Formata created_at como tempo relativo em pt-BR
export function formatNotificationTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `Há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Ontem';
  if (days < 7) return `Há ${days} dias`;
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function mapRow(row: any): AppNotification {
  return {
    id: row.id,
    tipo: row.tipo,
    prioridade: row.prioridade,
    titulo: row.titulo,
    mensagem: row.mensagem,
    lida: row.lida,
    acao_url: row.acao_url,
    acao_label: row.acao_label,
    obra_id: row.obra_id,
    created_at: row.created_at,
    displayType: resolveDisplayType(row.tipo),
  };
}

export function useNotifications() {
  const { company } = useCompany();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  const companyId = company?.id;

  const fetchNotifications = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setNotifications(data.map(mapRow));
    } catch (err) {
      console.warn('[useNotifications] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Fetch inicial + realtime subscription
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    let channel: any;
    
    try {
      const handlePayload = (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [mapRow(payload.new), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => prev.map(n => (n.id === payload.new.id ? mapRow(payload.new) : n)));
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      };

      channel = (supabase as any)
        .channel(`notifications:company:${companyId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `company_id=eq.${companyId}`
        }, handlePayload)
        .subscribe();
    } catch (e) {
      console.warn('Realtime unavailable:', e);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [companyId]);

  const markAsRead = useCallback(async (id: string) => {
    if (!company?.id) return;
    await (supabase as any)
      .from('notifications')
      .update({ lida: true })
      .eq('id', id)
      .eq('company_id', company.id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, lida: true } : n))
    );
  }, [company?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!company?.id) return;
    await (supabase as any)
      .from('notifications')
      .update({ lida: true })
      .eq('company_id', company.id)
      .eq('lida', false);
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
  }, [company?.id]);

  const dismiss = useCallback(async (id: string) => {
    if (!company?.id) return;
    await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('company_id', company.id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [company?.id]);

  const unreadCount = notifications.filter(n => !n.lida).length;

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
  };
}
