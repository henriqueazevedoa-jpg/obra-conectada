/**
 * FinanceiroDashboard — Painel executivo financeiro
 *
 * Desktop: grid 5fr/3fr — calendário + vencimentos/alertas | gráfico inferior
 * Mobile:  stacked vertical com ordem de leitura:
 *          1. Alertas vencidos
 *          2. Próximos vencimentos
 *          3. Calendário
 *          4. Gráfico Orçado × Realizado
 *
 * KPIs emitidos via onKpisReady → PageShell L2 (carrossel mobile / flex-start desktop)
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameDay, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import {
  ChevronLeft, ChevronRight, DollarSign, AlertTriangle, CalendarDays,
  Clock, TrendingDown, CheckCircle2,
} from 'lucide-react';
import type { PageKPI } from '@/components/layout/PageShell';

// ── Module-level cache (sobrevive ao unmount/remount do componente) ─────────
type CachedData = { pagamentos: PagamentoDB[]; custos: CustoRealDB[]; marcos: MarcoDB[] };
const dataCache = new Map<string, CachedData>();

// ── types ──────────────────────────────────────────────────────────────────
interface PagamentoDB {
  id: string;
  descricao: string;
  valor_previsto: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  tipo_pagamento: string;
  fornecedor: string | null;
  etapa_id: string | null;
}

interface CustoRealDB {
  valor: number;
  data: string | null;
  etapa_id: string | null;
}

interface MarcoDB {
  id: string;
  nome: string;
  data_fim: string | null;
  tipo_tarefa: string;
}

interface CalendarDot {
  color: string;
  tip: string;
}

interface Props {
  obraId: string;
  isActive?: boolean;
  onKpisReady?: (kpis: PageKPI[]) => void;
}

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const fmtK = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmt(v);

const DOT_COLORS = {
  previsto: '#8B5CF6',
  pago: '#22C55E',
  vencido: '#EF4444',
  marco: '#3B82F6',
} as const;

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// ── Shared card style ─────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid var(--color-border-secondary)',
  borderRadius: 12,
  padding: '16px 20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

// ── component ──────────────────────────────────────────────────────────────
export default function FinanceiroDashboard({ obraId, isActive = true, onKpisReady }: Props) {
  const { getOrcamento } = useOrcamento();
  const [pagamentos, setPagamentos] = useState<PagamentoDB[]>([]);
  const [custos, setCustos] = useState<CustoRealDB[]>([]);
  const [marcos, setMarcos] = useState<MarcoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // ── Fetch data ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Usar cache se já carregou para esta obra
    const cached = dataCache.get(obraId);
    if (cached) {
      setPagamentos(cached.pagamentos);
      setCustos(cached.custos);
      setMarcos(cached.marcos);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      (supabase.from('pagamentos') as any)
        .select('id, descricao, valor_previsto, valor_pago, data_vencimento, data_pagamento, status, tipo_pagamento, fornecedor, etapa_id')
        .eq('obra_id', obraId)
        .neq('status', 'cancelado'),
      (supabase.from('custo_real_itens') as any)
        .select('valor, data, etapa_id')
        .eq('obra_id', obraId)
        .neq('origem', 'pagamento_vinculado'),
      (supabase.from('cronograma_tarefas') as any)
        .select('id, nome, data_fim, tipo_tarefa')
        .eq('obra_id', obraId)
        .eq('tipo_tarefa', 'MARCO'),
    ]).then(([{ data: pags }, { data: reais }, { data: mcs }]) => {
      if (active) {
        const p = (pags || []) as PagamentoDB[];
        const c = (reais || []) as CustoRealDB[];
        const m = (mcs || []) as MarcoDB[];
        // Salvar no cache
        dataCache.set(obraId, { pagamentos: p, custos: c, marcos: m });
        setPagamentos(p);
        setCustos(c);
        setMarcos(m);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [obraId]);

  // ── Orçamento ────────────────────────────────────────────────────────────
  const orcamento = getOrcamento(obraId);
  const etapas = useMemo(() => orcamento?.etapas || [], [orcamento]);
  const totalOrcado = useMemo(() => etapas.reduce((s, e) => s + (e.precoTotal || 0), 0), [etapas]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const { totalGasto, saldo, burnRate } = useMemo(() => {
    const _totalPago = pagamentos
      .filter(p => p.status === 'pago')
      .reduce((s, p) => s + Number(p.valor_pago ?? p.valor_previsto), 0);
    const _totalCusto = custos.reduce((s, c) => s + Number(c.valor), 0);
    const _totalGasto = _totalPago + _totalCusto;
    const _saldo = totalOrcado - _totalGasto;

    const mesMap = new Map<string, number>();
    for (const p of pagamentos) {
      if (p.status !== 'pago') continue;
      const pDate = p.data_pagamento || p.data_vencimento;
      const mes = format(parseISO(pDate), 'yyyy-MM');
      mesMap.set(mes, (mesMap.get(mes) || 0) + Number(p.valor_pago ?? p.valor_previsto));
    }
    for (const c of custos) {
      if (!c.data) continue;
      const mes = format(parseISO(c.data), 'yyyy-MM');
      mesMap.set(mes, (mesMap.get(mes) || 0) + Number(c.valor));
    }
    const sorted = Array.from(mesMap.entries()).sort(([a], [b]) => b.localeCompare(a)).slice(0, 3);
    const _burnRate = sorted.length > 0 ? sorted.reduce((s, [, v]) => s + v, 0) / sorted.length : 0;

    return { totalGasto: _totalGasto, saldo: _saldo, burnRate: _burnRate };
  }, [pagamentos, custos, totalOrcado]);

  // ── Push KPIs to parent ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !onKpisReady) return;
    onKpisReady([
      { id: 'orcado', label: 'Orçado total', value: fmt(totalOrcado),
        icon: <DollarSign style={{ width: 14, height: 14, color: '#534AB7' }} />,
        tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7', main: true },
      { id: 'gasto', label: 'Gasto real', value: fmt(totalGasto),
        icon: <TrendingDown style={{ width: 14, height: 14, color: totalGasto > totalOrcado ? '#A32D2D' : '#3B6D11' }} />,
        progress: totalOrcado > 0 ? Math.min(100, Math.round((totalGasto / totalOrcado) * 100)) : 0,
        valueColor: totalGasto > totalOrcado ? '#A32D2D' : '#3B6D11',
        tint: totalGasto > totalOrcado ? '#FCEBEB' : '#EAF3DE' },
      { id: 'saldo', label: 'Saldo disponível', value: fmt(saldo),
        icon: saldo >= 0
          ? <CheckCircle2 style={{ width: 14, height: 14, color: '#3B6D11' }} />
          : <AlertTriangle style={{ width: 14, height: 14, color: '#A32D2D' }} />,
        tint: saldo >= 0 ? '#EAF3DE' : '#FCEBEB',
        valueColor: saldo >= 0 ? '#3B6D11' : '#A32D2D',
        labelColor: saldo >= 0 ? '#3B6D11' : '#A32D2D' },
      { id: 'burn', label: 'Burn-rate/mês', value: fmtK(burnRate),
        icon: <Clock style={{ width: 14, height: 14, color: '#1E5A8D' }} />,
        tint: '#E6F1FB', valueColor: '#1E5A8D', labelColor: '#1E5A8D' },
    ]);
  }, [isActive, totalOrcado, totalGasto, saldo, burnRate, onKpisReady]);

  // ── Calendar data ────────────────────────────────────────────────────────
  const dotsMap = useMemo(() => {
    const map = new Map<string, CalendarDot[]>();
    const addDot = (dateStr: string, dot: CalendarDot) => {
      const key = dateStr.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(dot);
    };
    for (const p of pagamentos) {
      const dateStr = p.data_vencimento;
      if (p.status === 'pago') {
        addDot(p.data_pagamento || dateStr, { color: DOT_COLORS.pago, tip: `✓ ${p.descricao} (${fmt(Number(p.valor_pago ?? p.valor_previsto))})` });
      } else if (p.status === 'atrasado') {
        addDot(dateStr, { color: DOT_COLORS.vencido, tip: `⚠ ${p.descricao} — VENCIDO` });
      } else {
        addDot(dateStr, { color: DOT_COLORS.previsto, tip: `◎ ${p.descricao} (${fmt(Number(p.valor_previsto))})` });
      }
    }
    for (const m of marcos) {
      if (m.data_fim) addDot(m.data_fim, { color: DOT_COLORS.marco, tip: `🏁 Marco: ${m.nome}` });
    }
    return map;
  }, [pagamentos, marcos]);

  const calDays = useMemo(() => {
    const start = startOfMonth(calMonth);
    const end = endOfMonth(calMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDay = getDay(start);
    const blanks = Array.from({ length: firstDay }, (_, i) => ({ blank: true, date: null, idx: i }));
    return [
      ...blanks,
      ...days.map((d, i) => ({ blank: false, date: d, idx: firstDay + i })),
    ] as ({ blank: true; date: null; idx: number } | { blank: false; date: Date; idx: number })[];
  }, [calMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return dotsMap.get(format(selectedDay, 'yyyy-MM-dd')) || [];
  }, [selectedDay, dotsMap]);

  const hoje = startOfDay(new Date());
  const { proximos, vencidos } = useMemo(() => {
    const _proximos = pagamentos
      .filter(p => (p.status === 'previsto') && !isBefore(parseISO(p.data_vencimento), hoje))
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
      .slice(0, 5);
    const _vencidos = pagamentos
      .filter(p => p.status === 'atrasado')
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    return { proximos: _proximos, vencidos: _vencidos };
  }, [pagamentos, hoje]);

  const chartData = useMemo(() => {
    const realMap = new Map<string, number>();
    for (const p of pagamentos) {
      if (p.status !== 'pago' || !p.etapa_id) continue;
      realMap.set(p.etapa_id, (realMap.get(p.etapa_id) || 0) + Number(p.valor_pago ?? p.valor_previsto));
    }
    for (const c of custos) {
      if (!c.etapa_id) continue;
      realMap.set(c.etapa_id, (realMap.get(c.etapa_id) || 0) + Number(c.valor));
    }
    return etapas
      .map(e => ({
        name: e.nome.length > 16 ? e.nome.slice(0, 14) + '…' : e.nome,
        fullName: e.nome,
        Orçado: e.precoTotal || 0,
        Realizado: realMap.get(e.id) || 0,
        desvio: (realMap.get(e.id) || 0) - (e.precoTotal || 0),
      }))
      .filter(d => d.Orçado > 0 || d.Realizado > 0)
      .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
      .slice(0, 6);
  }, [etapas, pagamentos, custos]);

  const tipoIcons: Record<string, React.ElementType> = {
    material: DollarSign,
    mao_de_obra: Clock,
    servico: TrendingDown,
    aluguel: CalendarDays,
    outro: DollarSign,
  };

  if (loading) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 12, background: 'var(--color-background-secondary)', opacity: 0.5 }} className="animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Blocos reutilizáveis ──────────────────────────────────────────────────

  /** Alerta de vencidos */
  const VencidosBlock = vencidos.length > 0 ? (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <AlertTriangle style={{ width: 14, height: 14, color: '#DC2626' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#991B1B' }}>
          Vencidos ({vencidos.length})
        </span>
      </div>
      {vencidos.slice(0, 5).map(p => {
        const diasAtraso = differenceInDays(hoje, parseISO(p.data_vencimento));
        return (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 0', borderBottom: '0.5px solid #FECACA',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#991B1B' }}>{p.descricao}</p>
              {p.fornecedor && <p style={{ fontSize: 11, color: '#B91C1C' }}>{p.fornecedor}</p>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(Number(p.valor_previsto))}
              </p>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 6px',
                borderRadius: 10, background: '#FCA5A5', color: '#7F1D1D',
              }}>
                {diasAtraso}d atrás
              </span>
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  /** Próximos vencimentos */
  const ProximosBlock = (
    <div style={{ ...cardStyle, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <CalendarDays style={{ width: 14, height: 14, color: '#534AB7' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Próximos vencimentos
        </span>
      </div>
      {proximos.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 6 }}>
          <CheckCircle2 style={{ width: 24, height: 24, color: '#3B6D11' }} />
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Nenhum pagamento previsto
          </p>
        </div>
      ) : (
        proximos.map(p => {
          const diasAte = differenceInDays(parseISO(p.data_vencimento), hoje);
          const Icon = tipoIcons[p.tipo_pagamento] || DollarSign;
          const urgente = diasAte <= 3;
          const proximo = diasAte <= 7;
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0', borderBottom: '0.5px solid var(--color-border-tertiary)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 7,
                background: urgente ? '#FCEBEB' : '#F3F2FD',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon style={{ width: 13, height: 13, color: urgente ? '#A32D2D' : '#534AB7' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.descricao}
                </p>
                {p.fornecedor && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.fornecedor}</p>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(Number(p.valor_previsto))}
                </p>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px',
                  borderRadius: 10,
                  background: urgente ? '#FCEBEB' : proximo ? '#FAEEDA' : 'var(--color-background-secondary)',
                  color: urgente ? '#A32D2D' : proximo ? '#854F0B' : 'var(--color-text-secondary)',
                }}>
                  {diasAte === 0 ? 'hoje' : diasAte === 1 ? 'amanhã' : `em ${diasAte}d`}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  /** Calendário */
  const CalendarioBlock = (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setCalMonth(prev => subMonths(prev, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--color-text-secondary)' }}>
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
          {format(calMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setCalMonth(prev => addMonths(prev, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--color-text-secondary)' }}>
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 4 }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {calDays.map((cell, idx) => {
          if (cell.blank) return <div key={`b-${idx}`} />;
          const dayKey = format(cell.date, 'yyyy-MM-dd');
          const dots = dotsMap.get(dayKey) || [];
          const isToday = isSameDay(cell.date, new Date());
          const isSelected = selectedDay && isSameDay(cell.date, selectedDay);
          return (
            <button
              key={dayKey}
              onClick={() => setSelectedDay(prev => prev && isSameDay(prev, cell.date) ? null : cell.date)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '3px 0', minHeight: 32, borderRadius: 6, border: 'none',
                cursor: dots.length > 0 ? 'pointer' : 'default',
                background: isSelected ? '#F3F2FD' : isToday ? 'var(--color-background-secondary)' : 'transparent',
                outline: isToday ? '1px solid #AFA9EC' : 'none',
                transition: 'background 150ms',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              <span style={{
                fontSize: 11, fontWeight: isToday ? 700 : 400,
                color: isToday ? '#534AB7' : 'var(--color-text-primary)',
                lineHeight: 1,
              }}>
                {format(cell.date, 'd')}
              </span>
              {dots.length > 0 && (
                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                  {dots.slice(0, 3).map((dot, di) => (
                    <div key={di} style={{ width: 4, height: 4, borderRadius: '50%', background: dot.color }} />
                  ))}
                  {dots.length > 3 && (
                    <span style={{ fontSize: 7, color: 'var(--color-text-tertiary)', lineHeight: '4px' }}>+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda compacta */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { color: DOT_COLORS.previsto, label: 'Previsto' },
          { color: DOT_COLORS.pago, label: 'Pago' },
          { color: DOT_COLORS.vencido, label: 'Vencido' },
          { color: DOT_COLORS.marco, label: 'Marco' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {selectedDay && selectedDayEvents.length > 0 && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 8,
          background: 'var(--color-background-secondary)',
          borderLeft: '3px solid #534AB7',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
          </p>
          {selectedDayEvents.map((ev, i) => (
            <p key={i} style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{ev.tip}</p>
          ))}
        </div>
      )}
    </div>
  );

  /** Gráfico */
  const GraficoBlock = chartData.length > 0 ? (
    <div style={{ ...cardStyle, padding: '20px 20px 12px' }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
          Orçado × Realizado por etapa
        </p>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          Top etapas por desvio entre orçado e executado
        </p>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 38)}>
        <BarChart data={chartData} layout="vertical" barGap={2} margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border-tertiary)" />
          <XAxis type="number" tickFormatter={(v: number) => fmtK(v)}
                 tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" width={195}
                 tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                   const name = payload.value;
                   // Busca fullName no chartData pelo name truncado
                   const fullName = chartData.find(d => d.name === name)?.fullName ?? name;
                   // Word-wrap inteligente: quebrar por palavras
                   const words = fullName.split(' ');
                   const lines: string[] = [];
                   let current = '';
                   for (const w of words) {
                     const test = current ? `${current} ${w}` : w;
                     if (test.length <= 22) { current = test; }
                     else { if (current) lines.push(current); current = w; }
                   }
                   if (current) lines.push(current);
                   // Max 3 linhas; truncar a última se necessario
                   if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].slice(0, 19) + '…'; }
                   const lineH = 13;
                   const totalH = lines.length * lineH;
                   const startDy = -(totalH / 2) + 5;
                   return (
                     <text x={x} y={y} textAnchor="end" fill="var(--color-text-secondary)" style={{ cursor: 'default' }}>
                       <title>{fullName}</title>
                       {lines.map((line, i) => (
                         <tspan key={i} x={x} dy={i === 0 ? startDy : lineH} fontSize={10}>{line}</tspan>
                       ))}
                     </text>
                   );
                 }}
                 interval={0}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div style={{ background: '#fff', border: '1px solid var(--color-border-secondary)', borderRadius: 8, padding: '8px 12px', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                  <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text-primary)' }}>{d?.fullName ?? d?.name}</p>
                  {payload.map((p: any, i: number) => (
                    <p key={i} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {fmt(p.value)}</p>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Orçado" fill="#C4B5FD" radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="Realizado" radius={[0, 4, 4, 0]} barSize={10}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.desvio > 0 ? '#F87171' : '#34D399'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : null;

  return (
    <div style={{ padding: '12px 16px 24px', overflow: 'auto', height: '100%', background: 'var(--color-background-secondary)' }}
         className="animate-in fade-in duration-300">

      {/* ── Desktop: grid 5fr / 3fr ─────────────────────────────────── */}
      <div className="hidden sm:grid" style={{
        gridTemplateColumns: '5fr 3fr',
        gap: 16,
        alignItems: 'start',
      }}>
        {/* Esquerda: calendário */}
        {CalendarioBlock}

        {/* Direita: alertas + vencimentos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {VencidosBlock}
          {ProximosBlock}
        </div>
      </div>

      {/* ── Mobile: stacked vertical (alertas → vencimentos → calendário → gráfico) */}
      <div className="flex sm:hidden" style={{ flexDirection: 'column', gap: 12 }}>
        {VencidosBlock}
        {ProximosBlock}
        {CalendarioBlock}
      </div>

      {/* ── Gráfico — full width em ambos os breakpoints ─────────────── */}
      {GraficoBlock && (
        <div style={{ marginTop: 16 }}>
          {GraficoBlock}
        </div>
      )}
    </div>
  );
}
