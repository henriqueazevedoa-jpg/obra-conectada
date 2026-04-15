import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/data/mockData';
import {
  HeartPulse, TrendingDown, Clock, Activity, Wallet, TrendingUp, CheckCircle2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface SmartCardsProps {
  totalPrevisto: number;
  totalRealizado: number;
  previstoAcumulado: number;
  andamentoReal: number;
  andamentoPlanejado: number;
  etapasAtrasadas: number;
  materiaisBaixo: number;
  registrosPendentes: number;
  pagamentosAtrasados: number;
  /**
   * (andamentoReal / andamentoPlanejado) × 100.
   * undefined quando não há planejamento de datas definido.
   */
  produtividade?: number;
  /**
   * Percentual de registros de diário aprovados (0–100).
   * undefined quando não há diários cadastrados.
   */
  indiceQualidade?: number;
  /** Número total de diários — exibido no tooltip de qualidade */
  totalDiarios?: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

interface Status {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

function ok(): Status  { return { label: 'Saudável',    color: 'text-success',     bg: 'bg-success/10',     dot: 'bg-success'     }; }
function warn(): Status { return { label: 'Atenção',     color: 'text-warning',     bg: 'bg-warning/10',     dot: 'bg-warning'     }; }
function bad(): Status  { return { label: 'Alerta',      color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' }; }
function none(): Status { return { label: '—',           color: 'text-muted-foreground', bg: 'bg-muted',   dot: 'bg-muted-foreground/40' }; }

function getSaudeFinanceira(previstoAcum: number, realizado: number): Status & { tooltip: string } {
  if (previstoAcum === 0) return { ...none(), tooltip: 'Nenhuma etapa com cronograma definido ainda.' };
  const pct = ((realizado - previstoAcum) / previstoAcum) * 100;
  if (pct > 10) return { ...bad(),  label: 'Estourando', tooltip: `Os custos já superaram ${pct.toFixed(1)}% acima do planejado para esta etapa.` };
  if (pct > 5)  return { ...warn(), label: 'Atenção',    tooltip: `Custos ${pct.toFixed(1)}% acima do planejado acumulado. Monitorar de perto.` };
  return               { ...ok(),   label: 'Saudável',   tooltip: 'Custos dentro do esperado para o avanço atual da obra.' };
}

function getDesvioPrazo(real: number, planejado: number): Status & { detail: string } {
  if (planejado === 0) return { ...none(), detail: 'Sem datas planejadas' };
  const diff = planejado - real;
  if (diff <= 0)  return { ...ok(),   label: 'No prazo',           detail: `Real ${real}% · Planejado ${planejado}%`  };
  if (diff <= 10) return { ...warn(), label: `${diff}% de atraso`, detail: `Real ${real}% · Planejado ${planejado}%`  };
  return               { ...bad(),   label: `${diff}% de atraso`, detail: `Real ${real}% · Planejado ${planejado}%`  };
}

function getSituacao(
  etapasAtrasadas: number, materiaisBaixo: number,
  pendentes: number, pagAtrasados: number,
): Status & { detail: string } {
  const score = etapasAtrasadas * 3 + pagAtrasados * 3 + materiaisBaixo * 2 + pendentes;
  const parts = [
    etapasAtrasadas > 0 && `${etapasAtrasadas} etapa(s)`,
    pagAtrasados    > 0 && `${pagAtrasados} pagamento(s)`,
    materiaisBaixo  > 0 && `${materiaisBaixo} material(is)`,
  ].filter(Boolean).join(', ');
  if (score >= 6) return { ...bad(),  label: 'Requer ação', detail: parts || 'Múltiplos alertas' };
  if (score >= 3) return { ...warn(), label: 'Atenção',     detail: parts || 'Itens para verificar' };
  return               { ...ok(),   label: 'Estável',      detail: 'Tudo em dia' };
}

function getProdutividade(pct?: number): Status & { detail: string; tooltip: string } {
  if (pct === undefined)
    return { ...none(), detail: 'Sem planejamento', tooltip: 'Defina datas previstas nas etapas do cronograma para calcular a produtividade.' };
  if (pct >= 95)
    return { ...ok(),   label: 'Boa',     detail: `${pct.toFixed(0)}% do planejado`, tooltip: 'Avanço físico compatível ou superior ao cronograma planejado.' };
  if (pct >= 75)
    return { ...warn(), label: 'Regular', detail: `${pct.toFixed(0)}% do planejado`, tooltip: 'O avanço físico está abaixo do cronograma. Verifique impedimentos.' };
  return   { ...bad(),  label: 'Baixa',   detail: `${pct.toFixed(0)}% do planejado`, tooltip: 'Avanço físico muito abaixo do planejado. Ação imediata recomendada.' };
}

function getIndiceQualidade(pct?: number, totalDiarios?: number): Status & { detail: string; tooltip: string } {
  const t = totalDiarios ?? 0;
  const ctx = t > 0 ? ` (${t} registro${t > 1 ? 's' : ''})` : '';
  if (pct === undefined)
    return { ...none(), detail: 'Sem diários',  tooltip: 'Registre diários de obra para acompanhar o índice de qualidade.' };
  if (pct >= 80)
    return { ...ok(),   label: 'Bom',     detail: `${pct.toFixed(0)}% aprovados${ctx}`, tooltip: 'A maioria dos registros de diário foi aprovada pelo responsável.' };
  if (pct >= 50)
    return { ...warn(), label: 'Regular', detail: `${pct.toFixed(0)}% aprovados${ctx}`, tooltip: 'Vários diários ainda pendentes de aprovação. Regularizar as assinaturas.' };
  return   { ...bad(),  label: 'Crítico', detail: `${pct.toFixed(0)}% aprovados${ctx}`, tooltip: 'A maior parte dos diários não foi aprovada. Necessário regularizar.' };
}

// ── sub-component ──────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtext: React.ReactNode;
  bg: string;
  tooltip: string;
  'aria-label'?: string;
}

function KpiCard({ icon, label, value, subtext, bg, tooltip, 'aria-label': ariaLabel }: KpiCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          className="shadow-card print:shadow-none print:border cursor-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          tabIndex={0}
          aria-label={ariaLabel ?? label}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`h-7 w-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium leading-tight truncate">{label}</p>
            </div>
            <div className="text-base font-bold text-foreground leading-tight">{value}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{subtext}</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-center text-xs leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// ── main ───────────────────────────────────────────────────────────────────

export default function SmartCards({
  totalPrevisto, totalRealizado, previstoAcumulado, andamentoReal, andamentoPlanejado,
  etapasAtrasadas, materiaisBaixo, registrosPendentes, pagamentosAtrasados,
  produtividade, indiceQualidade, totalDiarios,
}: SmartCardsProps) {

  const saude    = getSaudeFinanceira(previstoAcumulado, totalRealizado);
  const desvio   = totalRealizado - previstoAcumulado;
  const desvioPct = previstoAcumulado > 0 ? ((desvio / previstoAcumulado) * 100) : 0;
  const prazo    = getDesvioPrazo(andamentoReal, andamentoPlanejado);
  const situacao = getSituacao(etapasAtrasadas, materiaisBaixo, registrosPendentes, pagamentosAtrasados);
  const prod     = getProdutividade(produtividade);
  const qual     = getIndiceQualidade(indiceQualidade, totalDiarios);
  const restante = totalPrevisto - totalRealizado;

  return (
    <TooltipProvider delayDuration={300}>
      {/* 2 cols mobile · 4 cols tablet · 7 cols desktop */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 print:grid-cols-4"
        data-print-section="kpis"
        role="region"
        aria-label="Indicadores da obra"
      >

        {/* 1 — Saúde Financeira */}
        <KpiCard
          icon={<HeartPulse className={`h-3.5 w-3.5 ${saude.color}`} />}
          label="Saúde Financeira"
          bg={saude.bg}
          value={<span className={saude.color}>{saude.label}</span>}
          subtext={`${formatCurrency(totalRealizado)} / ${formatCurrency(previstoAcumulado)}`}
          tooltip={saude.tooltip}
          aria-label={`Saúde financeira: ${saude.label}`}
        />

        {/* 2 — Desvio de Custo */}
        <KpiCard
          icon={<TrendingDown className={`h-3.5 w-3.5 ${desvio > 0 ? 'text-destructive' : 'text-success'}`} />}
          label="Desvio de Custo"
          bg={desvio > 0 ? 'bg-destructive/10' : 'bg-success/10'}
          value={
            <span className={desvio > 0 ? 'text-destructive' : 'text-success'}>
              {desvio >= 0 ? '+' : ''}{formatCurrency(desvio)}
            </span>
          }
          subtext={`${desvio >= 0 ? '+' : ''}${desvioPct.toFixed(1)}% do planejado`}
          tooltip={
            desvio > 0
              ? `Custo real está ${desvioPct.toFixed(1)}% acima do previsto acumulado até esta etapa.`
              : desvio < 0
              ? `Custo real está ${Math.abs(desvioPct).toFixed(1)}% abaixo do previsto acumulado. Boa gestão!`
              : 'Custo real alinhado ao previsto para a execução atual.'
          }
          aria-label={`Desvio de custo: ${desvio >= 0 ? '+' : ''}${desvioPct.toFixed(1)}%`}
        />

        {/* 3 — Orçamento Restante */}
        <KpiCard
          icon={<Wallet className={`h-3.5 w-3.5 ${restante >= 0 ? 'text-primary' : 'text-destructive'}`} />}
          label="Orçamento Restante"
          bg={restante >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}
          value={
            <span className={restante >= 0 ? 'text-primary' : 'text-destructive'}>
              {formatCurrency(restante)}
            </span>
          }
          subtext={`de ${formatCurrency(totalPrevisto)} total`}
          tooltip={
            restante >= 0
              ? `Saldo disponível para concluir a obra: ${formatCurrency(restante)}.`
              : `Orçamento extrapolado em ${formatCurrency(Math.abs(restante))}. Revisão necessária.`
          }
          aria-label={`Orçamento restante: ${formatCurrency(restante)}`}
        />

        {/* 4 — Desvio de Prazo */}
        <KpiCard
          icon={<Clock className={`h-3.5 w-3.5 ${prazo.color}`} />}
          label="Desvio de Prazo"
          bg={prazo.bg}
          value={<span className={prazo.color}>{prazo.label}</span>}
          subtext={prazo.detail}
          tooltip={
            andamentoPlanejado === 0
              ? 'Defina datas previstas nas etapas para calcular o desvio de prazo.'
              : andamentoReal >= andamentoPlanejado
              ? 'O avanço físico real está igual ou acima do planejado para hoje.'
              : `Planejado ${andamentoPlanejado}% concluídos até hoje, mas apenas ${andamentoReal}% foram executados.`
          }
          aria-label={`Desvio de prazo: ${prazo.label}`}
        />

        {/* 5 — Situação da Obra */}
        <KpiCard
          icon={<Activity className={`h-3.5 w-3.5 ${situacao.color}`} />}
          label="Situação Geral"
          bg={situacao.bg}
          value={<span className={situacao.color}>{situacao.label}</span>}
          subtext={situacao.detail}
          tooltip={`Composto por: ${
            [
              etapasAtrasadas > 0 && `${etapasAtrasadas} etapa(s) atrasada(s)`,
              pagamentosAtrasados > 0 && `${pagamentosAtrasados} pagamento(s) em atraso`,
              materiaisBaixo > 0 && `${materiaisBaixo} material(is) com estoque baixo`,
              registrosPendentes > 0 && `${registrosPendentes} diário(s) pendente(s)`,
            ].filter(Boolean).join(', ') || 'nenhum item crítico'
          }.`}
          aria-label={`Situação da obra: ${situacao.label}`}
        />

        {/* 6 — Produtividade */}
        <KpiCard
          icon={<TrendingUp className={`h-3.5 w-3.5 ${prod.color}`} />}
          label="Produtividade"
          bg={prod.bg}
          value={<span className={prod.color}>{prod.label}</span>}
          subtext={prod.detail}
          tooltip={prod.tooltip}
          aria-label={`Produtividade: ${prod.label}`}
        />

        {/* 7 — Índice de Qualidade */}
        <KpiCard
          icon={<CheckCircle2 className={`h-3.5 w-3.5 ${qual.color}`} />}
          label="Índice de Qualidade"
          bg={qual.bg}
          value={<span className={qual.color}>{qual.label}</span>}
          subtext={qual.detail}
          tooltip={qual.tooltip}
          aria-label={`Índice de qualidade: ${qual.label}`}
        />

      </div>
    </TooltipProvider>
  );
}
