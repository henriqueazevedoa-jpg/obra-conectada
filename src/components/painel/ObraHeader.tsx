import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/data/mockData';
import { Building2, MapPin, User, CalendarDays } from 'lucide-react';

interface Props {
  obra: {
    nome: string;
    codigo: string;
    cliente: string;
    endereco: string;
    status: string;
    dataInicio: string;
    dataPrevisaoTermino: string;
    responsavel: string;
  };
}

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

const statusColors: Record<string, string> = {
  planejamento: 'bg-muted text-muted-foreground',
  em_andamento: 'bg-success/10 text-success',
  pausada: 'bg-warning/10 text-warning',
  concluida: 'bg-primary/10 text-primary',
};

export default function ObraHeader({ obra }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-border bg-card" data-print-section="identificacao">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-foreground truncate">{obra.nome}</h2>
            <Badge variant="secondary" className={`${statusColors[obra.status] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>
              {statusLabels[obra.status] || obra.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-0.5">
            {obra.cliente && (
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{obra.cliente}</span>
            )}
            {obra.endereco && (
              <span className="flex items-center gap-1 hidden sm:flex"><MapPin className="h-3 w-3" />{obra.endereco}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          <span>{formatDate(obra.dataInicio)} → {formatDate(obra.dataPrevisaoTermino)}</span>
        </div>
      </div>
    </div>
  );
}
