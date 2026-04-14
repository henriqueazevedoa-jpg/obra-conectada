import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PagamentoItem {
  id: string;
  descricao: string;
  valor_previsto: number;
  data_vencimento: string;
  status: string;
  fornecedor: string | null;
  etapa_orcamento: string | null;
  tipo_pagamento?: string;
  forma_pagamento?: string;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  pago: { label: 'Pago', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-700' },
  previsto: { label: 'Previsto', dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary' },
  atrasado: { label: 'Atrasado', dot: 'bg-destructive', bg: 'bg-destructive/10', text: 'text-destructive' },
  cancelado: { label: 'Cancelado', dot: 'bg-muted-foreground', bg: 'bg-muted/50', text: 'text-muted-foreground' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface Props {
  items: PagamentoItem[];
}

export default function PagamentosTimelineView({ items }: Props) {
  // Group by etapa_orcamento, then sort by date within each group
  const grouped = useMemo(() => {
    const map: Record<string, PagamentoItem[]> = {};
    
    items.forEach(p => {
      const etapa = p.etapa_orcamento || 'Sem etapa';
      if (!map[etapa]) map[etapa] = [];
      map[etapa].push(p);
    });

    // Sort items within each group by date
    Object.values(map).forEach(arr => {
      arr.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    });

    // Sort groups: named etapas first (alphabetically), "Sem etapa" last
    return Object.entries(map).sort(([a], [b]) => {
      if (a === 'Sem etapa') return 1;
      if (b === 'Sem etapa') return -1;
      return a.localeCompare(b);
    });
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhum pagamento encontrado.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {grouped.map(([etapa, pagamentos]) => {
          const totalEtapa = pagamentos.reduce((s, p) => s + Number(p.valor_previsto), 0);
          const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_previsto), 0);
          const totalAtrasado = pagamentos.filter(p => p.status === 'atrasado').reduce((s, p) => s + Number(p.valor_previsto), 0);

          return (
            <div key={etapa}>
              {/* Etapa header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-sm bg-primary shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground truncate">{etapa}</h3>
                </div>
                <div className="h-px bg-border flex-1" />
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground">
                  <span className="font-mono">{formatCurrency(totalEtapa)}</span>
                  {totalPago > 0 && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 text-[10px] px-1.5 py-0">
                      {formatCurrency(totalPago)} pago
                    </Badge>
                  )}
                  {totalAtrasado > 0 && (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0">
                      {formatCurrency(totalAtrasado)} atrasado
                    </Badge>
                  )}
                </div>
              </div>

              {/* Timeline items */}
              <div className="relative ml-[7px] border-l-2 border-border pl-5 space-y-1">
                {pagamentos.map((p, idx) => {
                  const cfg = statusConfig[p.status] || statusConfig.previsto;
                  const isLast = idx === pagamentos.length - 1;

                  return (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <div className="relative group cursor-default">
                          {/* Dot on the timeline line */}
                          <div className={cn(
                            'absolute -left-[25px] top-2.5 w-3 h-3 rounded-full border-2 border-background',
                            cfg.dot
                          )} />

                          {/* Card */}
                          <Card className={cn(
                            'p-2.5 transition-colors hover:bg-muted/50',
                            cfg.bg,
                            'border-l-2',
                            p.status === 'pago' && 'border-l-emerald-500',
                            p.status === 'atrasado' && 'border-l-destructive',
                            p.status === 'previsto' && 'border-l-primary',
                            p.status === 'cancelado' && 'border-l-muted-foreground',
                          )}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                                    {format(parseISO(p.data_vencimento), 'dd/MM/yy')}
                                  </span>
                                  <p className="text-sm font-medium truncate">{p.descricao}</p>
                                </div>
                                {p.fornecedor && (
                                  <p className="text-[11px] text-muted-foreground truncate mt-0.5 ml-[60px]">{p.fornecedor}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-bold font-mono">{formatCurrency(Number(p.valor_previsto))}</span>
                                <Badge className={cn('text-[10px] px-1.5 py-0', cfg.bg, cfg.text, 'border-0')}>
                                  {cfg.label}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[250px] space-y-1">
                        <p className="font-semibold">{p.descricao}</p>
                        <p>{formatCurrency(Number(p.valor_previsto))} · {cfg.label}</p>
                        <p>Vencimento: {format(parseISO(p.data_vencimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        {p.fornecedor && <p>Fornecedor: {p.fornecedor}</p>}
                        {p.etapa_orcamento && <p>Etapa: {p.etapa_orcamento}</p>}
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
