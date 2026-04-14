import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DiarioItem {
  id: string;
  data: string;
  clima: string;
  trabalhadores: number;
  servicosExecutados: string;
  problemas: string;
  observacoes: string;
  status: string;
  usuario: string;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  pendente: { label: 'Pendente', dot: 'bg-warning', bg: 'bg-warning/10', text: 'text-warning' },
  aprovado: { label: 'Aprovado', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-700' },
  rejeitado: { label: 'Rejeitado', dot: 'bg-destructive', bg: 'bg-destructive/10', text: 'text-destructive' },
};

const climaIcons: Record<string, string> = {
  sol: '☀️', nublado: '⛅', chuva: '🌧️', chuvoso_forte: '⛈️',
};

interface Props {
  items: DiarioItem[];
}

export default function DiarioTimelineView({ items }: Props) {
  const grouped = useMemo(() => {
    const map: Record<string, DiarioItem[]> = {};
    items.forEach(item => {
      const month = item.data.slice(0, 7);
      const monthLabel = format(parseISO(item.data), "MMMM 'de' yyyy", { locale: ptBR });
      if (!map[monthLabel]) map[monthLabel] = [];
      map[monthLabel].push(item);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => b.data.localeCompare(a.data)));
    return Object.entries(map);
  }, [items]);

  if (items.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Nenhum registro encontrado.</div>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {grouped.map(([month, registros]) => {
          const totalAprovados = registros.filter(r => r.status === 'aprovado').length;
          const totalPendentes = registros.filter(r => r.status === 'pendente').length;

          return (
            <div key={month}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground truncate capitalize">{month}</h3>
                </div>
                <div className="h-px bg-border flex-1" />
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground">
                  <span>{registros.length} registros</span>
                  {totalPendentes > 0 && (
                    <Badge variant="secondary" className="bg-warning/10 text-warning text-[10px] px-1.5 py-0">
                      {totalPendentes} pendentes
                    </Badge>
                  )}
                </div>
              </div>

              <div className="relative ml-[7px] border-l-2 border-border pl-5 space-y-1">
                {registros.map(r => {
                  const cfg = statusConfig[r.status] || statusConfig.pendente;
                  const clima = climaIcons[r.clima] || '';
                  const desc = r.servicosExecutados
                    ? (r.servicosExecutados.length > 80 ? r.servicosExecutados.slice(0, 80) + '…' : r.servicosExecutados)
                    : 'Sem serviços registrados';

                  return (
                    <Tooltip key={r.id}>
                      <TooltipTrigger asChild>
                        <div className="relative group cursor-default">
                          <div className={cn('absolute -left-[25px] top-2.5 w-3 h-3 rounded-full border-2 border-background', cfg.dot)} />
                          <Card className={cn('p-2.5 transition-colors hover:bg-muted/50', cfg.bg, 'border-l-2',
                            r.status === 'aprovado' && 'border-l-emerald-500',
                            r.status === 'pendente' && 'border-l-warning',
                            r.status === 'rejeitado' && 'border-l-destructive',
                          )}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                                    {format(parseISO(r.data), 'dd/MM/yy')}
                                  </span>
                                  {clima && <span className="text-xs">{clima}</span>}
                                  <p className="text-sm font-medium truncate">{desc}</p>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5 ml-[60px]">
                                  {r.usuario} · {r.trabalhadores} trab.
                                </p>
                              </div>
                              <Badge className={cn('text-[10px] px-1.5 py-0', cfg.bg, cfg.text, 'border-0')}>
                                {cfg.label}
                              </Badge>
                            </div>
                          </Card>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[280px] space-y-1">
                        <p className="font-semibold">{format(parseISO(r.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        <p>{clima} {r.clima} · {r.trabalhadores} trabalhadores</p>
                        {r.servicosExecutados && <p>{r.servicosExecutados}</p>}
                        {r.problemas && <p className="text-destructive">⚠ {r.problemas}</p>}
                        <p>{cfg.label} · por {r.usuario}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
