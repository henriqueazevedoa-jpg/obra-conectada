import { useMemo } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AgendaItem {
  id: string;
  titulo: string;
  tipo: string;
  descricao: string | null;
  data_programada: string;
  hora_programada: string | null;
  responsavel: string | null;
  status: string;
  prioridade: string;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  programado: { label: 'Programado', dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary' },
  confirmado: { label: 'Confirmado', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-700' },
  em_andamento: { label: 'Em Andamento', dot: 'bg-warning', bg: 'bg-warning/10', text: 'text-warning' },
  concluido: { label: 'Concluído', dot: 'bg-muted-foreground', bg: 'bg-muted/50', text: 'text-muted-foreground' },
  atrasado: { label: 'Atrasado', dot: 'bg-destructive', bg: 'bg-destructive/10', text: 'text-destructive' },
  cancelado: { label: 'Cancelado', dot: 'bg-muted-foreground', bg: 'bg-muted/50', text: 'text-muted-foreground' },
};

const tipoLabels: Record<string, string> = {
  execucao: 'Execução', entrega_material: 'Entrega', instalacao: 'Instalação',
  vistoria: 'Vistoria', ensaio: 'Ensaio', reuniao: 'Reunião', medicao: 'Medição',
  administrativo: 'Administrativo', fornecedor: 'Fornecedor', outro: 'Outro',
};

interface Props {
  items: AgendaItem[];
}

export default function AgendaTimelineView({ items }: Props) {
  const today = startOfDay(new Date());

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => a.data_programada.localeCompare(b.data_programada));
  }, [items]);

  if (items.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Nenhum evento encontrado.</div>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative ml-[7px] border-l-2 border-border pl-5 space-y-1">
        {sorted.map(item => {
          const effectiveStatus = (item.status !== 'concluido' && item.status !== 'cancelado' && isBefore(parseISO(item.data_programada), today))
            ? 'atrasado' : item.status;
          const cfg = statusConfig[effectiveStatus] || statusConfig.programado;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div className="relative group cursor-default">
                  <div className={cn('absolute -left-[25px] top-2.5 w-3 h-3 rounded-full border-2 border-background', cfg.dot)} />
                  <Card className={cn('p-2.5 transition-colors hover:bg-muted/50', cfg.bg, 'border-l-2',
                    effectiveStatus === 'atrasado' && 'border-l-destructive',
                    effectiveStatus === 'concluido' && 'border-l-muted-foreground',
                    effectiveStatus === 'programado' && 'border-l-primary',
                    effectiveStatus === 'confirmado' && 'border-l-emerald-500',
                    effectiveStatus === 'em_andamento' && 'border-l-warning',
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                            {format(parseISO(item.data_programada), 'dd/MM/yy')}
                            {item.hora_programada && ` ${item.hora_programada.slice(0, 5)}`}
                          </span>
                          <p className="text-sm font-medium truncate">{item.titulo}</p>
                        </div>
                        {item.responsavel && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 ml-[60px]">{item.responsavel}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-muted/50">
                          {tipoLabels[item.tipo] || item.tipo}
                        </Badge>
                        <Badge className={cn('text-[10px] px-1.5 py-0', cfg.bg, cfg.text, 'border-0')}>
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[250px] space-y-1">
                <p className="font-semibold">{item.titulo}</p>
                <p>{cfg.label} · {tipoLabels[item.tipo] || item.tipo}</p>
                <p>{format(parseISO(item.data_programada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                {item.responsavel && <p>Responsável: {item.responsavel}</p>}
                {item.descricao && <p>{item.descricao}</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
