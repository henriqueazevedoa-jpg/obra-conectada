import { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle2, DollarSign, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  type: 'alerta' | 'sucesso' | 'pagamento' | 'prazo';
  title: string;
  description?: string;
  at: string;
  read: boolean;
}

// Notificações estáticas de exemplo — serão dinamizadas na Sprint 4
const STATIC_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'alerta',
    title: 'Etapa com prazo vencido',
    description: 'Fundações está atrasada há 3 dias',
    at: 'Hoje, 09:15',
    read: false,
  },
  {
    id: '2',
    type: 'pagamento',
    title: 'Pagamento vencendo amanhã',
    description: 'Concretagem — R$ 18.500,00',
    at: 'Hoje, 08:00',
    read: false,
  },
  {
    id: '3',
    type: 'sucesso',
    title: 'Cotação respondida',
    description: 'Aço CA-50 — 3 preços recebidos',
    at: 'Ontem, 16:42',
    read: true,
  },
  {
    id: '4',
    type: 'prazo',
    title: 'Diário pendente de aprovação',
    description: '2 registros aguardando revisão',
    at: 'Ontem, 14:20',
    read: true,
  },
];

const typeConfig = {
  alerta: { icon: AlertTriangle, color: 'text-amber-400', dot: 'bg-amber-400' },
  sucesso: { icon: CheckCircle2, color: 'text-emerald-400', dot: 'bg-emerald-400' },
  pagamento: { icon: DollarSign, color: 'text-primary/80', dot: 'bg-primary/80' },
  prazo: { icon: Clock, color: 'text-rose-400', dot: 'bg-rose-400' },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(STATIC_NOTIFICATIONS);

  const unread = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="relative">
      {/* Botão sino */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/60"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {/* Painel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
            {/* Header do painel */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary/80" />
                <span className="text-sm font-semibold text-slate-100">Notificações</span>
                {unread > 0 && (
                  <Badge className="h-5 px-1.5 bg-primary/20 text-primary/60 border-0 text-[10px]">
                    {unread} novas
                  </Badge>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-slate-400 hover:text-primary/60 transition-colors"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = typeConfig[n.type];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'group relative flex items-start gap-3 px-4 py-3 transition-colors',
                        n.read ? 'opacity-60' : 'bg-slate-800/40'
                      )}
                    >
                      {/* Dot não lido */}
                      {!n.read && (
                        <span className={`absolute left-2 top-4 h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      )}

                      <div className={cn('mt-0.5 shrink-0', cfg.color)}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 leading-snug">{n.title}</p>
                        {n.description && (
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{n.description}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">{n.at}</p>
                      </div>

                      <button
                        onClick={() => dismiss(n.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 shrink-0 mt-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-800">
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-primary/80 hover:text-primary/60 w-full text-center transition-colors"
              >
                Ver central de notificações →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
