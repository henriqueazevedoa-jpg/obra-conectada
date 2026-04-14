import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/data/mockData';
import {
  HeartPulse, TrendingDown, Clock, Activity, Wallet,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  totalPrevisto: number;
  totalRealizado: number;
  previstoAcumulado: number;
  andamentoReal: number;
  andamentoPlanejado: number;
  etapasAtrasadas: number;
  materiaisBaixo: number;
  registrosPendentes: number;
  pagamentosAtrasados: number;
}

function getSaudeFinanceira(previstoAcum: number, realizado: number) {
  if (previstoAcum === 0) return { label: '—', color: 'text-muted-foreground', bg: 'bg-muted', icon: '⚪' };
  const pct = ((realizado - previstoAcum) / previstoAcum) * 100;
  if (pct > 10) return { label: 'Estourando', color: 'text-destructive', bg: 'bg-destructive/10', icon: '🔴' };
  if (pct > 5) return { label: 'Atenção', color: 'text-warning', bg: 'bg-warning/10', icon: '🟡' };
  return { label: 'Saudável', color: 'text-success', bg: 'bg-success/10', icon: '🟢' };
}

function getDesvioPrazo(real: number, planejado: number) {
  const diff = planejado - real;
  if (diff <= 0) return { label: 'No prazo', color: 'text-success', bg: 'bg-success/10', value: `${real}%` };
  return { label: `${diff}% atrasado`, color: 'text-destructive', bg: 'bg-destructive/10', value: `${diff}%` };
}

function getSituacao(etapasAtrasadas: number, materiaisBaixo: number, pendentes: number, pagAtrasados: number) {
  const score = etapasAtrasadas * 3 + pagAtrasados * 3 + materiaisBaixo * 2 + pendentes;
  if (score >= 6) return { label: 'Requer ação', color: 'text-destructive', bg: 'bg-destructive/10', icon: '🔴' };
  if (score >= 3) return { label: 'Atenção', color: 'text-warning', bg: 'bg-warning/10', icon: '🟡' };
  return { label: 'Estável', color: 'text-success', bg: 'bg-success/10', icon: '🟢' };
}

export default function SmartCards({
  totalPrevisto, totalRealizado, previstoAcumulado, andamentoReal, andamentoPlanejado,
  etapasAtrasadas, materiaisBaixo, registrosPendentes, pagamentosAtrasados,
}: Props) {
  const saude = getSaudeFinanceira(previstoAcumulado, totalRealizado);
  const desvio = totalRealizado - previstoAcumulado;
  const desvioPct = previstoAcumulado > 0 ? ((desvio / previstoAcumulado) * 100).toFixed(1) : '0';
  const prazo = getDesvioPrazo(andamentoReal, andamentoPlanejado);
  const situacao = getSituacao(etapasAtrasadas, materiaisBaixo, registrosPendentes, pagamentosAtrasados);
  const orcamentoRestante = totalPrevisto - totalRealizado;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-print-section="kpis">
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
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalRealizado)} / {formatCurrency(previstoAcumulado)}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">Baseado na execução atual da obra</p>
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
            <p className="text-xs text-muted-foreground mt-1">
              {desvio >= 0 ? '+' : ''}{desvioPct}% do planejado
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">Comparação com custo planejado até a etapa atual</p>
          </CardContent>
        </Card>

        {/* Orçamento Restante */}
        <Card className="shadow-card print:shadow-none print:border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-8 w-8 rounded-lg ${orcamentoRestante >= 0 ? 'bg-primary/10' : 'bg-destructive/10'} flex items-center justify-center`}>
                <Wallet className={`h-4 w-4 ${orcamentoRestante >= 0 ? 'text-primary' : 'text-destructive'}`} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Orçamento Restante</p>
            </div>
            <p className={`text-lg font-bold ${orcamentoRestante >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(orcamentoRestante)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              de {formatCurrency(totalPrevisto)} total
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">Valor disponível para concluir a obra</p>
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
            <p className="text-xs text-muted-foreground mt-1">
              Planejado: {andamentoPlanejado}% · Real: {andamentoReal}%
            </p>
          </CardContent>
        </Card>

        {/* Situação da Obra */}
        <Card className="shadow-card print:shadow-none print:border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-8 w-8 rounded-lg ${situacao.bg} flex items-center justify-center`}>
                <Activity className={`h-4 w-4 ${situacao.color}`} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Situação da Obra</p>
            </div>
            <p className={`text-lg font-bold ${situacao.color}`}>{situacao.icon} {situacao.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {[
                etapasAtrasadas > 0 && `${etapasAtrasadas} atraso(s)`,
                pagamentosAtrasados > 0 && `${pagamentosAtrasados} pag.`,
                materiaisBaixo > 0 && `${materiaisBaixo} estoque`,
              ].filter(Boolean).join(' · ') || 'Tudo em dia'}
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
