import { useMemo } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PendenciaItem {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  prioridade: string;
  status: string;
  data_limite: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  aberta: { label: 'Aberta', dot: 'bg-warning', bg: 'bg-warning/10', text: 'text-warning' },
  em_andamento: { label: 'Em Andamento', dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary' },
  resolvida: { label: 'Resolvida', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-700' },
};

const prioridadeLabels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const tipoLabels: Record<string, string> = {
  documento: 'Documento', custo: 'Custo', pagamento: 'Pagamento', diario: 'Diário', orcamento: 'Orçamento',
};

interface Props {
  items: PendenciaItem[];
}

export default function PendenciasTimelineView({ items }: Props) {
  const today = startOfDay(new Date());

  const sorted = useMemo(() => {
    return [...items].sort((a, b) =>
      (a.data_limite || '9999').localeCompare(b.data_limite || '9999')
    );
  }, [items]);

  if (items.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma pendência encontrada.</div>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative ml-[7px] border-l-2 border-border pl-5 space-y-1">
        {sorted.map(p => {
          const cfg = statusConfig[p.status] || statusConfig.aberta;
          const isVencida = p.status !== 'resolvida' && p.data_limite && isBefore(parseISO(p.data_limite), today);

          return (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <div className="relative group cursor-default">
                  <div className={cn('absolute -left-[25px] top-2.5 w-3 h-3 rounded-full border-2 border-background', isVencida ? 'bg-destructive' : cfg.dot)} />
                  <Card className={cn('p-2.5 transition-colors hover:bg-muted/50', cfg.bg, 'border-l-2',
                    isVencida && 'border-l-destructive',
                    !isVencida && p.status === 'resolvida' && 'border-l-emerald-500',
                    !isVencida && p.status === 'aberta' && 'border-l-warning',
                    !isVencida && p.status === 'em_andamento' && 'border-l-primary',
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {p.data_limite && (
                            <span className={cn("text-[11px] font-mono shrink-0", isVencida ? "text-destructive font-medium" : "text-muted-foreground")}>
                              {format(parseISO(p.data_limite), 'dd/MM/yy')}
                            </span>
                          )}
                          <p className="text-sm font-medium truncate">{p.titulo}</p>
                        </div>
                        {p.descricao && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 ml-[60px]">{p.descricao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-muted/50">
                          {tipoLabels[p.tipo] || p.tipo}
                        </Badge>
                        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0',
                          p.prioridade === 'alta' ? 'bg-destructive/10 text-destructive' :
                          p.prioridade === 'media' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground', 'border-0'
                        )}>
                          {prioridadeLabels[p.prioridade] || p.prioridade}
                        </Badge>
                        <Badge className={cn('text-[10px] px-1.5 py-0', cfg.bg, cfg.text, 'border-0')}>
                          {isVencida ? 'Vencida' : cfg.label}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[250px] space-y-1">
                <p className="font-semibold">{p.titulo}</p>
                {p.descricao && <p>{p.descricao}</p>}
                <p>{isVencida ? 'Vencida' : cfg.label} · {prioridadeLabels[p.prioridade] || p.prioridade} · {tipoLabels[p.tipo] || p.tipo}</p>
                {p.data_limite && <p>Prazo: {format(parseISO(p.data_limite), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
