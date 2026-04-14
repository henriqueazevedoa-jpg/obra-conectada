import { EtapaFinanceiro } from '@/hooks/useGanttFinanceiro';
import { formatCurrency } from '@/data/mockData';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, AlertTriangle, Clock, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  etapaNome: string;
  financeiro: EtapaFinanceiro;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  pago: 'bg-success/10 text-success border-0',
  previsto: 'bg-primary/10 text-primary border-0',
  atrasado: 'bg-destructive/10 text-destructive border-0',
};

export default function GanttFinanceiroPanel({ etapaNome, financeiro, onClose }: Props) {
  const { totalPrevisto, totalPago, totalAberto, totalAtrasado, proximoVencimento, pagamentos } = financeiro;
  const percentPago = totalPrevisto > 0 ? Math.round((totalPago / totalPrevisto) * 100) : 0;

  return (
    <div className="border border-border rounded-lg bg-background shadow-md p-3 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
          {etapaNome}
        </h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="text-center p-2 rounded-md bg-muted">
          <p className="text-xs font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
          <p className="text-[9px] text-muted-foreground">Previsto</p>
        </div>
        <div className="text-center p-2 rounded-md bg-success/10">
          <p className="text-xs font-bold text-success">{formatCurrency(totalPago)}</p>
          <p className="text-[9px] text-muted-foreground">Pago ({percentPago}%)</p>
        </div>
        <div className="text-center p-2 rounded-md bg-primary/10">
          <p className="text-xs font-bold text-primary">{formatCurrency(totalAberto)}</p>
          <p className="text-[9px] text-muted-foreground">Em aberto</p>
        </div>
        {totalAtrasado > 0 ? (
          <div className="text-center p-2 rounded-md bg-destructive/10">
            <p className="text-xs font-bold text-destructive">{formatCurrency(totalAtrasado)}</p>
            <p className="text-[9px] text-muted-foreground">Atrasado</p>
          </div>
        ) : (
          <div className="text-center p-2 rounded-md bg-muted">
            <p className="text-xs font-bold text-foreground">
              {proximoVencimento ? format(parseISO(proximoVencimento), 'dd/MM') : '—'}
            </p>
            <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> Próx. venc.
            </p>
          </div>
        )}
      </div>

      {/* Pagamentos list */}
      {pagamentos.length > 0 && (
        <div className="space-y-1 max-h-[160px] overflow-y-auto">
          {pagamentos.map(p => (
            <div key={p.id} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/50 text-[10px]">
              <div className="min-w-0 flex-1">
                <span className="text-foreground truncate block">{p.descricao}</span>
                <span className="text-muted-foreground">
                  {p.data_vencimento ? format(parseISO(p.data_vencimento), 'dd/MM/yy') : ''}
                  {p.fornecedor ? ` · ${p.fornecedor}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <span className="font-mono font-medium text-foreground">{formatCurrency(Number(p.valor_previsto))}</span>
                <Badge variant="secondary" className={`${statusColors[p.status] || ''} text-[8px] px-1 py-0`}>
                  {p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Previsto'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
