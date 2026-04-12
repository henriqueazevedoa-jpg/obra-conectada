import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/data/mockData';
import {
  HeartPulse, TrendingDown, Clock, ShieldAlert,
} from 'lucide-react';

interface Props {
  totalPrevisto: number;
  totalRealizado: number;
  andamentoReal: number;
  andamentoPlanejado: number;
  etapasAtrasadas: number;
  materiaisBaixo: number;
  registrosPendentes: number;
  pagamentosAtrasados: number;
}

function getSaudeFinanceira(previsto: number, realizado: number) {
  if (previsto === 0) return { label: '—', color: 'text-muted-foreground', bg: 'bg-muted', icon: '⚪' };
  const pct = ((realizado - previsto) / previsto) * 100;
  if (pct > 10) return { label: 'Estourando', color: 'text-destructive', bg: 'bg-destructive/10', icon: '🔴' };
  if (pct > 5) return { label: 'Atenção', color: 'text-warning', bg: 'bg-warning/10', icon: '🟡' };
  return { label: 'Saudável', color: 'text-success', bg: 'bg-success/10', icon: '🟢' };
}

function getDesvioPrazo(real: number, planejado: number) {
  const diff = planejado - real;
  if (diff <= 0) return { label: 'No prazo', color: 'text-success', bg: 'bg-success/10', value: `${real}%` };
  return { label: `${diff}% atrasado`, color: 'text-destructive', bg: 'bg-destructive/10', value: `${diff}%` };
}

function getRisco(etapasAtrasadas: number, materiaisBaixo: number, pendentes: number, pagAtrasados: number) {
  const score = etapasAtrasadas * 3 + pagAtrasados * 3 + materiaisBaixo * 2 + pendentes;
  if (score >= 6) return { label: 'Alto', color: 'text-destructive', bg: 'bg-destructive/10', icon: '🔴' };
  if (score >= 3) return { label: 'Médio', color: 'text-warning', bg: 'bg-warning/10', icon: '🟡' };
  return { label: 'Baixo', color: 'text-success', bg: 'bg-success/10', icon: '🟢' };
}

export default function SmartCards({
  totalPrevisto, totalRealizado, andamentoReal, andamentoPlanejado,
  etapasAtrasadas, materiaisBaixo, registrosPendentes, pagamentosAtrasados,
}: Props) {
  const saude = getSaudeFinanceira(totalPrevisto, totalRealizado);
  const desvio = totalRealizado - totalPrevisto;
  const desvioPct = totalPrevisto > 0 ? ((desvio / totalPrevisto) * 100).toFixed(1) : '0';
  const prazo = getDesvioPrazo(andamentoReal, andamentoPlanejado);
  const risco = getRisco(etapasAtrasadas, materiaisBaixo, registrosPendentes, pagamentosAtrasados);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-print-section="kpis">
      {/* Saúde Financeira */}
      <Card className="shadow-card print:shadow-none print:border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg ${saude.bg} flex items-center justify-center`}>
              <HeartPulse className={`h-4 w-4 ${saude.color}`} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Saúde Financeira</p>
          </div>
          <p className={`text-lg font-bold ${saude.color}`}>{saude.icon} {saude.label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatCurrency(totalRealizado)} / {formatCurrency(totalPrevisto)}
          </p>
        </CardContent>
      </Card>

      {/* Desvio de Custo */}
      <Card className="shadow-card print:shadow-none print:border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg ${desvio > 0 ? 'bg-destructive/10' : 'bg-success/10'} flex items-center justify-center`}>
              <TrendingDown className={`h-4 w-4 ${desvio > 0 ? 'text-destructive' : 'text-success'}`} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Desvio de Custo</p>
          </div>
          <p className={`text-lg font-bold ${desvio > 0 ? 'text-destructive' : 'text-success'}`}>
            {desvio >= 0 ? '+' : ''}{formatCurrency(desvio)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {desvio >= 0 ? '+' : ''}{desvioPct}% do orçamento
          </p>
        </CardContent>
      </Card>

      {/* Desvio de Prazo */}
      <Card className="shadow-card print:shadow-none print:border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg ${prazo.bg} flex items-center justify-center`}>
              <Clock className={`h-4 w-4 ${prazo.color}`} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Desvio de Prazo</p>
          </div>
          <p className={`text-lg font-bold ${prazo.color}`}>{prazo.label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Planejado: {andamentoPlanejado}% · Real: {andamentoReal}%
          </p>
        </CardContent>
      </Card>

      {/* Risco */}
      <Card className="shadow-card print:shadow-none print:border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg ${risco.bg} flex items-center justify-center`}>
              <ShieldAlert className={`h-4 w-4 ${risco.color}`} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Risco da Obra</p>
          </div>
          <p className={`text-lg font-bold ${risco.color}`}>{risco.icon} {risco.label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {[
              etapasAtrasadas > 0 && `${etapasAtrasadas} atraso(s)`,
              pagamentosAtrasados > 0 && `${pagamentosAtrasados} pag.`,
              materiaisBaixo > 0 && `${materiaisBaixo} estoque`,
            ].filter(Boolean).join(' · ') || 'Tudo em dia'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
