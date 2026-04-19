/**
 * FluxoCaixaTab — Sprint 3
 *
 * Melhorias:
 *   - Linha de projeção (tracejada) baseada na média dos últimos 3 meses
 *   - Alerta de saldo negativo projetado (fundo âmbar na tabela + badge)
 *   - Toggle para incluir/excluir custos indiretos (custo_real_itens sem etapa)
 *   - Coluna "Indiretos" na tabela quando toggle ativo
 */
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePortalTarget } from '@/hooks/usePortalTarget';
import {
  format, parseISO, startOfMonth, eachMonthOfInterval,
  addMonths, subMonths, isBefore, addDays, startOfDay
} from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PagamentoFluxo {
  valor_previsto: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
}

interface IndiretoFluxo {
  valor: number;
  data: string | null;
}

interface MesFluxo {
  mes: string;
  mesKey: string;
  previsto: number;
  realizado: number;
  indireto: number;
  projecao?: number;        // projeção por média (meses futuros)
  saldo: number;
  saldoAcumulado: number;
  isFuturo: boolean;
  projecaoNegativa: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function mesLabel(isoMonth: string) {
  const [ano, mes] = isoMonth.split('-');
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${nomes[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs space-y-1.5 min-w-[200px]">
      <p className="font-bold text-foreground">{label}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
          <span className="font-bold tabular-nums">{fmtShort(entry.value)}</span>
        </div>
      ))}
      {payload.some(e => e.name === 'Projeção') && (
        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50 italic">
          Estimativa baseada na média dos últimos 3 meses — não considera compromissos futuros cadastrados.
        </p>
      )}
    </div>
  );
}

// ── KPI Chip ───────────────────────────────────────────────────────────────────

function KpiChip({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div className={cn('flex items-center justify-center h-8 w-8 rounded-lg shrink-0', color + '/15')}>
            <Icon className={cn('h-4 w-4', color)} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn('text-base font-bold tabular-nums leading-tight', color)}>{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface Props { obraId: string; }

export default function FluxoCaixaTab({ obraId }: Props) {
  const [pagamentos, setPagamentos] = useState<PagamentoFluxo[]>([]);
  const [indiretos, setIndiretos] = useState<IndiretoFluxo[]>([]);
  const [loading, setLoading] = useState(true);
  const [incluirIndiretos, setIncluirIndiretos] = useState(false);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabela'>('grafico');
  type PeriodKey = '7d' | '30d' | '90d' | 'tudo';
  const [period, setPeriod] = useState<PeriodKey>('tudo');

  const hoje = new Date();
  const [windowStart, setWindowStart] = useState(() => subMonths(startOfMonth(hoje), 5));

  // ── Portal target (must be before any early return — Rules of Hooks) ─────────
  const kpiPortalTarget = usePortalTarget('financeiro-kpi-portal');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      (supabase.from('pagamentos') as any)
        .select('valor_previsto, valor_pago, data_vencimento, data_pagamento, status')
        .eq('obra_id', obraId)
        .neq('status', 'cancelado'),
      (supabase.from('custo_real_itens') as any)
        .select('valor, data')
        .eq('obra_id', obraId)
        .is('etapa_id', null)     // sem etapa = indireto
        .neq('origem', 'pagamento_vinculado'),
    ]).then(([{ data: pags }, { data: itens }]) => {
      if (active) {
        setPagamentos((pags || []) as PagamentoFluxo[]);
        setIndiretos((itens || []) as IndiretoFluxo[]);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [obraId]);

  // ── Série mensal ──────────────────────────────────────────────────────────
  const { meses, totalPrevisto, totalRealizado, mesesDeficit, alertaMeses } = useMemo(() => {
    if (pagamentos.length === 0) return { meses: [], totalPrevisto: 0, totalRealizado: 0, mesesDeficit: 0, alertaMeses: [] };

    const mesAtual = format(startOfMonth(hoje), 'yyyy-MM');
    const windowEnd = addMonths(windowStart, 11);
    const months = eachMonthOfInterval({ start: windowStart, end: windowEnd });

    // Mapas de pagamentos
    const prevMap = new Map<string, number>();
    const realMap = new Map<string, number>();
    for (const p of pagamentos) {
      const val = Number(p.valor_previsto) || 0;
      const mesPrev = format(parseISO(p.data_vencimento), 'yyyy-MM');
      prevMap.set(mesPrev, (prevMap.get(mesPrev) || 0) + val);
      if (p.status === 'pago' && p.data_pagamento) {
        const mesReal = format(parseISO(p.data_pagamento), 'yyyy-MM');
        const valPago = Number(p.valor_pago ?? p.valor_previsto) || 0;
        realMap.set(mesReal, (realMap.get(mesReal) || 0) + valPago);
      }
    }

    // Mapa de indiretos
    const indMap = new Map<string, number>();
    if (incluirIndiretos) {
      for (const i of indiretos) {
        if (!i.data) continue;
        const mesInd = format(parseISO(i.data), 'yyyy-MM');
        indMap.set(mesInd, (indMap.get(mesInd) || 0) + Number(i.valor));
      }
    }

    // Calcular projeção: média dos últimos 3 meses realizados
    const realMeses = Array.from(realMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3)
      .map(([, v]) => v);
    const mediaMensal = realMeses.length > 0 ? realMeses.reduce((s, v) => s + v, 0) / realMeses.length : 0;

    let saldoAcum = 0;
    let totalPrev = 0, totalReal = 0, deficit = 0;
    const alertaMeses: string[] = [];

    const serie: MesFluxo[] = months.map(monthDate => {
      const key = format(monthDate, 'yyyy-MM');
      const isFuturo = key > mesAtual;
      const previsto = prevMap.get(key) || 0;
      const realizado = isFuturo ? 0 : (realMap.get(key) || 0);
      const indireto = incluirIndiretos ? (indMap.get(key) || 0) : 0;
      const projecao = isFuturo && mediaMensal > 0 ? mediaMensal : undefined;

      // Saldo: para meses futuros, usa projeção + previsto
      const efetivo = isFuturo ? (projecao || 0) : (realizado + indireto);
      const saldo = efetivo - previsto;
      saldoAcum += saldo;

      totalPrev += previsto;
      totalReal += realizado + indireto;
      if (saldo < 0) deficit++;

      const projecaoNegativa = isFuturo && saldoAcum < 0;
      if (projecaoNegativa && projecao) alertaMeses.push(mesLabel(key));

      return { mes: mesLabel(key), mesKey: key, previsto, realizado, indireto, projecao, saldo, saldoAcumulado: saldoAcum, isFuturo, projecaoNegativa };
    });

    return { meses: serie, totalPrevisto: totalPrev, totalRealizado: totalReal, mesesDeficit: deficit, alertaMeses };
  }, [pagamentos, indiretos, windowStart, incluirIndiretos]);

  const saldoGlobal = totalRealizado - totalPrevisto;

  const handlePrev = () => setWindowStart(prev => subMonths(prev, 6));
  const handleNext = () => setWindowStart(prev => addMonths(prev, 6));

  // ── Compute KPIs ──────────────────────────────────────
  const { kpiAPagar30, kpiSemanaCt, kpiSemanaVal, kpiSemanaDataPrimeiro, kpiMesSeguinte, kpiPagoMes } = useMemo(() => {
    let _kpiAPagar30 = 0;
    let _kpiSemanaCt = 0;
    let _kpiSemanaVal = 0;
    let _kpiSemanaDataPrimeiro: Date | null = null;
    let _kpiMesSeguinte = 0;
    let _kpiPagoMes = 0;

    const hojeStart = startOfDay(hoje);
    const add7 = addDays(hojeStart, 7);
    const add30 = addDays(hojeStart, 30);
    
    const currentMonthStr = format(hojeStart, 'yyyy-MM');
    const nextMonthStr = format(addMonths(hojeStart, 1), 'yyyy-MM');

    for (const p of pagamentos) {
      const vDate = parseISO(p.data_vencimento);
      const vMonth = format(vDate, 'yyyy-MM');
      const valPrev = Number(p.valor_previsto) || 0;
      
      if (p.status === 'previsto' || p.status === 'atrasado') {
        if (isBefore(vDate, add30)) _kpiAPagar30 += valPrev;
        
        if (isBefore(vDate, add7) && !isBefore(vDate, hojeStart)) {
          _kpiSemanaCt++;
          _kpiSemanaVal += valPrev;
          if (!_kpiSemanaDataPrimeiro || isBefore(vDate, _kpiSemanaDataPrimeiro)) {
            _kpiSemanaDataPrimeiro = vDate;
          }
        }
        if (vMonth === nextMonthStr) _kpiMesSeguinte += valPrev;
      } else if (p.status === 'pago') {
        const pMonth = p.data_pagamento ? format(parseISO(p.data_pagamento), 'yyyy-MM') : null;
        if (pMonth === currentMonthStr) {
          _kpiPagoMes += Number(p.valor_pago ?? valPrev);
        }
      }
    }
    return { 
      kpiAPagar30: _kpiAPagar30, kpiSemanaCt: _kpiSemanaCt, kpiSemanaVal: _kpiSemanaVal, 
      kpiSemanaDataPrimeiro: _kpiSemanaDataPrimeiro, kpiMesSeguinte: _kpiMesSeguinte, kpiPagoMes: _kpiPagoMes 
    };
  }, [pagamentos, hoje]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    );
  }

  if (pagamentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-base font-semibold">Sem dados de fluxo</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Cadastre pagamentos para visualizar o fluxo de caixa mensal da obra.
        </p>
      </div>
    );
  }

  const kpiBar = (
    <div className="flex w-full overflow-x-auto border-b-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] shrink-0">
      <div className="px-[20px] py-[14px] min-w-[160px] border-r-[0.5px] border-[var(--color-border-tertiary)] bg-[#FFFBF0] flex flex-col justify-center">
        <p className="text-[10px] font-medium text-[#854F0B] tracking-wider uppercase">A pagar (30d)</p>
        <p className="text-[22px] font-medium text-[#633806] tabular-nums leading-tight mt-1">{fmt(kpiAPagar30)}</p>
      </div>
      <div className="px-[16px] py-[14px] border-r-[0.5px] border-[var(--color-border-tertiary)] flex flex-col justify-center min-w-[140px]">
        <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider flex items-center justify-between">
           Esta semana
           {kpiSemanaCt > 0 && <span className="bg-[#FFF0F0] text-[#A32D2D] px-1 py-[2px] rounded text-[8px] font-bold">{kpiSemanaCt} pgtos</span>}
        </p>
        <p className={cn("text-[15px] font-medium tabular-nums mt-1", kpiSemanaCt > 0 ? "text-[#A32D2D]" : "text-[var(--color-text-primary)]")}>{fmt(kpiSemanaVal)}</p>
        {kpiSemanaCt > 0 && kpiSemanaDataPrimeiro && (
          <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 leading-tight">vence {format(kpiSemanaDataPrimeiro, 'dd/MM')}</p>
        )}
      </div>
      <div className="px-[16px] py-[14px] border-r-[0.5px] border-[var(--color-border-tertiary)] flex flex-col justify-center min-w-[130px]">
        <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider">Mês seguinte</p>
        <p className={cn("text-[15px] font-medium tabular-nums mt-1", kpiMesSeguinte > 0 ? "text-[#854F0B]" : "text-[var(--color-text-primary)]")}>{fmt(kpiMesSeguinte)}</p>
      </div>
      <div className="px-[16px] py-[14px] border-r-[0.5px] border-[var(--color-border-tertiary)] flex flex-col justify-center min-w-[130px]">
        <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider">Pago este mês</p>
        <p className={cn("text-[15px] font-medium tabular-nums mt-1", kpiPagoMes > 0 ? "text-[#3B6D11]" : "text-[var(--color-text-primary)]")}>{fmt(kpiPagoMes)}</p>
      </div>
    </div>
  );

  return (
    <>
      {kpiPortalTarget && createPortal(kpiBar, kpiPortalTarget)}
      <div className="flex flex-col gap-5 p-4 animate-in fade-in duration-300 h-full overflow-auto bg-[var(--color-background-primary)]">

        {/* ── Alerta de saldo negativo projetado ───────────────────────── */}
        {alertaMeses.length > 0 && (
          <div className="flex items-center justify-between gap-4 rounded border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-2.5 text-[13px]">
            <div className="flex items-start gap-2 max-w-2xl">
              <AlertTriangle className="h-4 w-4 text-[#854F0B] mt-0.5 shrink-0" />
              <p className="text-[#854F0B]">
                <strong className="font-semibold">Saldo projetado negativo em {alertaMeses.join(', ')}</strong> — Revise os pagamentos ou registre novas entradas.
              </p>
            </div>
            <Button variant="link" className="text-[#854F0B] h-auto p-0 font-semibold" onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'dre');
              window.history.pushState({}, '', url);
              window.dispatchEvent(new Event('popstate'));
            }}>
              Cadastrar entrada →
            </Button>
          </div>
        )}

        {/* ── Gráfico / Controles ────────────────────────────────────────── */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-[var(--color-border-secondary)] mb-4">
            <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">Fluxo mensal</h3>
            
            <div className="flex items-center gap-2">
              {/* Seletor de período */}
              <div className="flex items-center rounded overflow-hidden border border-[var(--color-border-tertiary)]">
                {(['7d', '30d', '90d', 'tudo'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium transition-colors',
                      period === p
                        ? 'bg-[#FFFBF0] border-[#FAC775] text-[#854F0B] border-x border-[#FAC775]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                    )}
                  >
                    {p === 'tudo' ? 'Tudo' : p.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="w-[1px] h-4 bg-[var(--color-border-secondary)]" />

              {/* Toggle Gráfico / Tabela */}
              <div className="flex items-center rounded overflow-hidden border border-[var(--color-border-tertiary)]">
                {(['grafico', 'tabela'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium transition-colors capitalize',
                      viewMode === v
                        ? 'bg-[#E6F1FB] text-[#185FA5] border-x border-[#B5D4F4]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                    )}
                  >
                    {v === 'grafico' ? 'Gráfico' : 'Tabela'}
                  </button>
                ))}
              </div>

              <div className="w-[1px] h-4 bg-[var(--color-border-secondary)]" />
              <div className="flex items-center gap-1.5">
                <Switch id="toggle-indiretos" checked={incluirIndiretos} onCheckedChange={setIncluirIndiretos} className="scale-75 origin-right" />
                <Label htmlFor="toggle-indiretos" className="text-[12px] text-[var(--color-text-secondary)] whitespace-nowrap cursor-pointer">Indiretos</Label>
              </div>
            </div>
          </div>

          {viewMode === 'grafico' ? (
            <ResponsiveContainer width="100%" height={130}>
              <ComposedChart data={meses} barGap={2} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={62} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                <Bar dataKey="previsto" name="Previsto" fill="hsl(var(--primary) / 0.25)" stroke="hsl(var(--primary) / 0.5)" strokeWidth={1} radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(152 55% 38% / 0.7)" stroke="hsl(152 55% 38%)" strokeWidth={1} radius={[4, 4, 0, 0]} />
                {incluirIndiretos && (
                  <Bar dataKey="indireto" name="Indiretos" fill="hsl(38 90% 48% / 0.5)" stroke="hsl(38 90% 48%)" strokeWidth={1} radius={[4, 4, 0, 0]} />
                )}
                <Line dataKey="saldoAcumulado" name="Saldo Acum." type="monotone" stroke="hsl(38 90% 48%)" strokeWidth={2} dot={{ fill: 'hsl(38 90% 48%)', r: 3 }} activeDot={{ r: 5 }} />
                <Line dataKey="projecao" name="Projeção" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : null}

          <p className="text-[10px] text-[var(--color-text-secondary)] mt-2">
            * Linha tracejada (Projeção) = estimativa baseada na média mensal, não considera pagamentos específicos.
          </p>
        </div>

        {viewMode === 'tabela' && (
        <div>
          <h3 className="text-[14px] font-medium text-[var(--color-text-primary)] mb-3">Detalhamento dos meses</h3>
          <div className="bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] rounded p-4 max-h-[400px] overflow-auto">
            <div className="grid grid-cols-[90px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)] gap-2 border-b border-[var(--color-border-tertiary)] text-[11px] font-medium text-[var(--color-text-secondary)] tracking-wider uppercase pb-2">
              <span>Mês</span>
              <span className="text-right">Previsto</span>
              <span className="text-right">Realizado {incluirIndiretos && <span className="text-[9px] font-normal leading-none">(Custo + Indir)</span>}</span>
              <span className="text-right">Saldo (Mês)</span>
              <span className="text-right">Acumulado</span>
            </div>
            
            <div className="space-y-1 mt-2">
              {meses.map(m => {
                const negativ = m.saldo < 0;
                const acumNegativ = m.saldoAcumulado < 0;
                const isMesAtual = m.mesKey === format(hoje, 'yyyy-MM');
                const comDados = m.previsto > 0 || m.realizado > 0 || m.projecao != null;

                return (
                  <div key={m.mesKey} className={cn('grid grid-cols-[90px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)] gap-2 py-2 items-center text-[13px] border-b border-[var(--color-border-tertiary)] hover:bg-[var(--color-background-primary)] transition-colors', m.projecaoNegativa && 'bg-amber-50/40 dark:bg-amber-950/10', !comDados && 'opacity-50')}>
                    <span className="font-medium text-[var(--color-text-primary)] flex items-center gap-1">
                      {isMesAtual && <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD] shrink-0" />}
                      <span className="text-[10px] font-normal mr-0 text-[var(--color-text-secondary)]">{m.isFuturo && '(proj)'}</span>
                      {m.mes}
                    </span>
                    <span className="text-right tabular-nums text-[var(--color-text-secondary)]">{fmt(m.previsto)}</span>
                    <span className={cn("text-right tabular-nums", m.isFuturo ? "text-[var(--color-text-primary)] opacity-80 italic" : "text-[var(--color-text-primary)]")}>
                      {m.isFuturo && m.projecao ? <span className="text-[var(--color-text-secondary)] mr-1">~</span> : ''}
                      {fmt(m.isFuturo ? (m.projecao || 0) : m.realizado + m.indireto)}
                    </span>
                    <span className={cn('text-right font-medium tabular-nums', negativ ? 'text-[#A32D2D]' : m.saldo > 0 ? 'text-[#3B6D11]' : 'text-[var(--color-text-secondary)]')}>{m.saldo !== 0 ? (m.saldo > 0 ? '+' : '') + fmt(m.saldo) : '—'}</span>
                    <span className={cn('text-right font-medium tabular-nums', acumNegativ ? 'text-[#A32D2D]' : 'text-[#3B6D11]')}>{fmt(m.saldoAcumulado)}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="grid grid-cols-[90px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)] gap-2 py-3 mt-2 border-t-2 border-[var(--color-border-primary)] font-bold text-[13px]">
              <span className="text-[var(--color-text-primary)]">Total</span>
              <span className="text-right tabular-nums text-[var(--color-text-primary)]">{fmt(totalPrevisto)}</span>
              <span className="text-right tabular-nums text-[#3B6D11]">{fmt(totalRealizado)}</span>
              <span className={cn('text-right tabular-nums', saldoGlobal < 0 ? 'text-[#A32D2D]' : 'text-[#3B6D11]')}>{(saldoGlobal > 0 ? '+' : '') + fmt(saldoGlobal)}</span>
              <span className="text-right text-[var(--color-text-secondary)]">—</span>
            </div>
            
          </div>
        </div>
        )}
      </div>
    </>
  );
}
