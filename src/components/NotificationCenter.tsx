import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, CheckCircle2, DollarSign, Clock, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNotifications, formatNotificationTime, type NotificationDisplayType } from '@/hooks/useNotifications';

const typeConfig: Record<NotificationDisplayType, {
  icon: React.ElementType;
  color: string;
  dot: string;
}> = {
  alerta:   { icon: AlertTriangle, color: 'text-amber-400',  dot: 'bg-amber-400'  },
  sucesso:  { icon: CheckCircle2,  color: 'text-emerald-400', dot: 'bg-emerald-400' },
  pagamento:{ icon: DollarSign,    color: 'text-primary/80', dot: 'bg-primary/80'  },
  prazo:    { icon: Clock,         color: 'text-rose-400',   dot: 'bg-rose-400'    },
};

const prioridadeBadge: Record<string, string> = {
  critica:    'bg-rose-500/20 text-rose-400 border-0',
  importante: 'bg-amber-500/20 text-amber-400 border-0',
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss } = useNotifications();

  function handleClick(id: string, acoUrl: string | null) {
    markAsRead(id);
    if (acoUrl) {
      navigate(acoUrl);
      setOpen(false);
    }
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
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Painel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary/80" />
                <span className="text-sm font-semibold text-slate-100">Notificações</span>
                {unreadCount > 0 && (
                  <Badge className="h-5 px-1.5 bg-primary/20 text-primary/60 border-0 text-[10px]">
                    {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] text-slate-400 hover:text-primary/60 transition-colors"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
              {loading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = typeConfig[n.displayType];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'group relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer',
                        n.lida ? 'opacity-60' : 'bg-slate-800/40 hover:bg-slate-800/60'
                      )}
                      onClick={() => handleClick(n.id, n.acao_url)}
                    >
                      {/* Dot não lido */}
                      {!n.lida && (
                        <span className={`absolute left-2 top-4 h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      )}

                      <div className={cn('mt-0.5 shrink-0', cfg.color)}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-slate-100 leading-snug">{n.titulo}</p>
                          {n.prioridade !== 'informativa' && (
                            <Badge className={cn('h-4 px-1 text-[9px] mt-0.5', prioridadeBadge[n.prioridade])}>
                              {n.prioridade === 'critica' ? 'Crítico' : 'Importante'}
                            </Badge>
                          )}
                        </div>
                        {n.mensagem && (
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">{n.mensagem}</p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-slate-500">{formatNotificationTime(n.created_at)}</p>
                          {n.acao_label && (
                            <span className="text-[10px] text-primary/70 hover:text-primary transition-colors">
                              {n.acao_label} →
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
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
                Central de notificações →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
