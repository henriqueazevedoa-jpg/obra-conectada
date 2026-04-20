/**
 * DRETab — Demonstrativo de Resultado da Obra (Sprint 3)
 *
 * Melhorias:
 *   - Margem por etapa: tabela abaixo do DRE com orçado, realizado e desvio %
 *   - BDI line: quando BDI configurado no orçamento, exibe Receita Esperada (custo + BDI)
 *   - Custos indiretos: inclui custo_real_itens sem etapa + suporte a novas categorias
 *     (Taxas / Canteiro / Administração / Imprevisto)
 *
 * NOTA DE IMPLEMENTAÇÃO FUTURA:
 *   A fonte de receita atualmente usa o orçamento total como proxy para o valor do contrato.
 *   Quando o módulo de Contratos e Medições for implementado, migrar "receita" para o
 *   campo "valor_contrato" da tabela "contratos" vinculada à obra.
 */
import { useState, useEffect, useMemo } from 'react';
import type { PageKPI } from '@/components/layout/PageShell';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { useOrcamento } from '@/contexts/OrcamentoContext';

// ── Module-level cache ────────────────────────────────────────────
type DRECache = { pagamentos: PagamentoDRE[]; custosReais: CustoRealItem[] };
const dreCache = new Map<string, DRECache>();

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  Building2, Hammer, Package, Truck, Wrench, HelpCircle,
  TrendingUp, TrendingDown, DollarSign, BarChart3, Info,
  Wallet, Construction,
} from 'lucide-react';

// ── Configuração de categorias ─────────────────────────────────────────────────

const TIPO_CONFIG: Record<string, {
  label: string;
  labelPlural: string;
  icon: React.ElementType;
  color: string;
  dreGroup: 'direto' | 'indireto';
}> = {
  material:    { label: 'Material',     labelPlural: 'Materiais',     icon: Package,      color: 'hsl(239 84% 67%)',  dreGroup: 'direto'   },
  mao_de_obra: { label: 'Mão de Obra',  labelPlural: 'Mão de Obra',   icon: Hammer,       color: 'hsl(152 55% 38%)',  dreGroup: 'direto'   },
  servico:     { label: 'Serviço',      labelPlural: 'Serviços',      icon: Wrench,       color: 'hsl(270 60% 58%)',  dreGroup: 'direto'   },
  aluguel:     { label: 'Aluguel',      labelPlural: 'Aluguéis',      icon: Truck,        color: 'hsl(38 90% 48%)',   dreGroup: 'indireto' },
  outro:       { label: 'Outro',        labelPlural: 'Outros',        icon: HelpCircle,   color: 'hsl(220 12% 60%)',  dreGroup: 'indireto' },
};

// Categorias de custo indireto de custo_real_itens (sem etapa vinculada)
const INDIRETO_EXTRA_CONFIG: Record<string, {
  label: string; icon: React.ElementType; color: string;
}> = {
  taxa:       { label: 'Taxas e Impostos',  icon: Info,         color: 'hsl(38 90% 48%)'   },
  canteiro:   { label: 'Canteiro de Obras', icon: Construction, color: 'hsl(270 60% 58%)'  },
  admin:      { label: 'Administração',     icon: Building2,    color: 'hsl(152 55% 38%)'  },
  imprevisto: { label: 'Imprevistos',       icon: DollarSign,   color: 'hsl(0 72% 51%)'    },
  outro_ind:  { label: 'Outros indiretos',  icon: HelpCircle,   color: 'hsl(220 12% 60%)'  },
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface PagamentoDRE {
  valor_previsto: number;
  valor_pago: number | null;
  tipo_pagamento: string;
  status: string;
  data_vencimento: string;
  descricao: string;
  etapa_orcamento: string | null;
}

interface CustoRealItem {
  valor: number;
  etapa_id: string | null;
  etapa_nome: string | null;
  categoria: string | null;
}

interface TipoAgregado {
  tipo: string;
  pago: number;
  previsto: number;
  count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}
function pct(val: number, total: number) {
  return total > 0 ? Math.round((val / total) * 100) : 0;
}

// ── Custom Tooltip Pie ─────────────────────────────────────────────────────────

interface PieEntry { name: string; value: number; payload: { pct: number } }
function PieTooltip({ active, payload }: { active?: boolean; payload?: PieEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-bold mb-1">{d.name}</p>
      <p className="tabular-nums font-semibold">{fmt(d.value)}</p>
      <p className="text-muted-foreground">{d.payload.pct}% do total pago</p>
    </div>
  );
}

// ── DRE Line Item ──────────────────────────────────────────────────────────────

function DRELine({ label, value, sub, indent = 0, bold = false, highlight, icon: Icon, color }: {
  label: string; value: number; sub?: string; indent?: number; bold?: boolean;
  highlight?: 'positive' | 'negative' | 'neutral'; icon?: React.ElementType; color?: string;
}) {
  const textColor =
    highlight === 'positive' ? 'text-emerald-600' :
    highlight === 'negative' ? 'text-red-600' :
    highlight === 'neutral'  ? 'text-muted-foreground' : '';

  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-border/40 last:border-0', indent === 1 && 'pl-4', indent === 2 && 'pl-8', bold && 'bg-muted/30')}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <div className="flex items-center justify-center h-6 w-6 rounded-md shrink-0" style={{ backgroundColor: (color || '#000') + '20' }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
        )}
        <div className="min-w-0">
          <p className={cn('text-sm truncate', bold && 'font-semibold', !bold && 'text-muted-foreground')}>{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      <span className={cn('text-sm font-mono tabular-nums shrink-0 ml-4', bold && 'font-bold', textColor)}>
        {fmt(value)}
      </span>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface Props { obraId: string; isActive?: boolean; onKpisReady?: (kpis: PageKPI[]) => void; }

export default function DRETab({ obraId, isActive = true, onKpisReady }: Props) {
  const { getOrcamento } = useOrcamento();
  const [pagamentos, setPagamentos] = useState<PagamentoDRE[]>([]);
  const [custosReais, setCustosReais] = useState<CustoRealItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Portal target removed — lift-state-up via onKpisReady ─────────────────

  useEffect(() => {
    const cached = dreCache.get(obraId);
    if (cached) {
      setPagamentos(cached.pagamentos);
      setCustosReais(cached.custosReais);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      (supabase.from('pagamentos') as any)
        .select('valor_previsto, valor_pago, tipo_pagamento, status, data_vencimento, descricao, etapa_orcamento')
        .eq('obra_id', obraId)
        .neq('status', 'cancelado'),
      (supabase.from('custo_real_itens') as any)
        .select('valor, etapa_id, etapa_nome, categoria')
        .eq('obra_id', obraId)
        .neq('origem', 'pagamento_vinculado'),
    ]).then(([{ data: pags }, { data: reais }]) => {
      if (active) {
        const p = (pags || []) as PagamentoDRE[];
        const r = (reais || []) as CustoRealItem[];
        dreCache.set(obraId, { pagamentos: p, custosReais: r });
        setPagamentos(p);
        setCustosReais(r);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [obraId]);

  const orcamento = getOrcamento(obraId);
  const orcamentoTotal = useMemo(() =>
    (orcamento?.etapas || []).reduce((s, e) => s + (e.precoTotal || 0), 0),
    [orcamento]
  );

  // BDI: campo não existe ainda em OrcamentoObra — aguarda módulo de Contratos
  const bdi: number | null = null;

  // ── Agregar por tipo (pagamentos) ───────────────────────────────────────
  const porTipo = useMemo(() => {
    const map = new Map<string, TipoAgregado>();
    for (const tipo of Object.keys(TIPO_CONFIG)) map.set(tipo, { tipo, pago: 0, previsto: 0, count: 0 });

    for (const p of pagamentos) {
      const tipo = p.tipo_pagamento || 'outro';
      const entry = map.get(tipo) || { tipo, pago: 0, previsto: 0, count: 0 };
      const val = Number(p.valor_previsto) || 0;
      entry.previsto += val;
      if (p.status === 'pago') entry.pago += Number(p.valor_pago ?? p.valor_previsto) || val;
      entry.count++;
      map.set(tipo, entry);
    }
    return Array.from(map.values()).filter(e => e.previsto > 0 || e.pago > 0);
  }, [pagamentos]);

  const totalPago = useMemo(() => porTipo.reduce((s, t) => s + t.pago, 0), [porTipo]);
  const totalPrevisto = useMemo(() => porTipo.reduce((s, t) => s + t.previsto, 0), [porTipo]);

  const diretos = porTipo.filter(t => TIPO_CONFIG[t.tipo]?.dreGroup === 'direto');
  const indiretos = porTipo.filter(t => TIPO_CONFIG[t.tipo]?.dreGroup === 'indireto');

  const totalDireto = diretos.reduce((s, t) => s + t.pago, 0);
  const totalIndiretoBase = indiretos.reduce((s, t) => s + t.pago, 0);

  // Custos indiretos extras de custo_real_itens (sem etapa)
  const indiretosCustoReal = useMemo(() =>
    custosReais.filter(c => !c.etapa_id).reduce((s, c) => s + Number(c.valor), 0),
    [custosReais]
  );
  const totalIndireto = totalIndiretoBase + indiretosCustoReal;

  // Receita = orçamento total (proxy para contrato — ver NOTA acima)
  const receita = orcamentoTotal;
  const receitaComBdi = bdi != null ? orcamentoTotal * (1 + bdi / 100) : null;
  const resultadoBruto = receita - totalPago;
  const margemBruta = receita > 0 ? (resultadoBruto / receita) * 100 : 0;

  // ── Margem por etapa ────────────────────────────────────────────────────
  const margemEtapas = useMemo(() => {
    // Mapear custo real por etapa
    const custoMap = new Map<string, number>();
    for (const c of custosReais) {
      if (!c.etapa_id) continue;
      custoMap.set(c.etapa_id, (custoMap.get(c.etapa_id) || 0) + Number(c.valor));
    }
    // Etapas do orçamento
    return (orcamento?.etapas || []).map(cat => {
      const orcado = cat.precoTotal || 0;
      const realizado = custoMap.get(cat.id) || 0;
      const desvio = orcado > 0 ? ((realizado - orcado) / orcado) * 100 : null;
      return { id: cat.id, nome: cat.nome, orcado, realizado, desvio };
    }).filter(e => e.orcado > 0 || e.realizado > 0);
  }, [custosReais, orcamento]);

  const pieData = useMemo(() =>
    porTipo.map(t => ({
      name: TIPO_CONFIG[t.tipo]?.label || t.tipo,
      value: t.pago,
      color: TIPO_CONFIG[t.tipo]?.color || 'hsl(220 12% 60%)',
      pct: pct(t.pago, totalPago),
    })).filter(d => d.value > 0),
    [porTipo, totalPago]
  );

  const areaData = useMemo(() => {
    const mesMap = new Map<string, Record<string, number>>();
    for (const p of pagamentos) {
      if (p.status !== 'pago' || !p.data_vencimento) continue;
      const mes = format(parseISO(p.data_vencimento), 'yyyy-MM');
      const tipo = p.tipo_pagamento || 'outro';
      if (!mesMap.has(mes)) mesMap.set(mes, {});
      const m = mesMap.get(mes)!;
      m[tipo] = (m[tipo] || 0) + Number(p.valor_pago ?? p.valor_previsto);
    }
    return Array.from(mesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, tipos]) => {
        const [ano, m] = mes.split('-');
        const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return { mes: `${nomes[parseInt(m)-1]}/${ano.slice(2)}`, ...tipos };
      });
  }, [pagamentos]);

  const economiaPct = receita > 0 ? ((receita - totalPago) / receita) * 100 : 0;
  const pctObraPaga = receita > 0 ? (totalPago / receita) * 100 : 0;

  // ── KPI lift-state-up ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !onKpisReady || loading || (pagamentos.length === 0 && custosReais.length === 0)) return;
    onKpisReady([
      { id: 'orcado', label: 'Orçado total', value: fmt(receita),
        icon: <Building2 style={{ width: 14, height: 14, color: '#534AB7' }} />,
        tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7', main: true },
      { id: 'gasto', label: 'Gasto até agora', value: fmt(totalPago),
        icon: <Hammer style={{ width: 14, height: 14, color: 'var(--color-text-secondary)' }} /> },
      { id: 'economia', label: 'Economia / Estouro',
        value: `${resultadoBruto >= 0 ? '+' : ''}${economiaPct.toFixed(1)}%`,
        icon: resultadoBruto >= 0
          ? <TrendingUp style={{ width: 14, height: 14, color: '#3B6D11' }} />
          : <TrendingDown style={{ width: 14, height: 14, color: '#A32D2D' }} />,
        sublabel: resultadoBruto > 0 ? 'dentro do orçado' : resultadoBruto < 0 ? 'acima do orçado' : 'no limite',
        tint: resultadoBruto > 0 ? '#EAF3DE' : resultadoBruto < 0 ? '#FCEBEB' : undefined,
        valueColor: resultadoBruto > 0 ? '#3B6D11' : resultadoBruto < 0 ? '#A32D2D' : undefined,
        labelColor: resultadoBruto > 0 ? '#3B6D11' : resultadoBruto < 0 ? '#A32D2D' : undefined },
      { id: 'pctPaga', label: '% da obra paga', value: `${pctObraPaga.toFixed(0)}%`,
        icon: <BarChart3 style={{ width: 14, height: 14, color: '#1E5A8D' }} />,
        tint: '#E6F1FB',
        progress: Math.min(100, pctObraPaga) },
    ]);
  }, [isActive, loading, receita, totalPago, resultadoBruto, economiaPct, pctObraPaga, onKpisReady]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    );
  }

  if (pagamentos.length === 0 && custosReais.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-base font-semibold">Sem dados para DRE</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Cadastre o orçamento e os pagamentos da obra para visualizar o demonstrativo de resultado.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 py-4 px-4 h-full overflow-auto bg-[var(--color-background-primary)]">

      {receita > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Resultado financeiro</span>
          <span style={{
            fontSize: 11, padding: '2px 10px', borderRadius: 999, fontWeight: 500,
            border: '0.5px solid',
            background: resultadoBruto < 0 && (-resultadoBruto / receita) > 0.2
              ? '#FCEBEB' : resultadoBruto < 0 ? '#FAEEDA' : '#EAF3DE',
            color: resultadoBruto < 0 && (-resultadoBruto / receita) > 0.2
              ? '#A32D2D' : resultadoBruto < 0 ? '#854F0B' : '#3B6D11',
            borderColor: resultadoBruto < 0 && (-resultadoBruto / receita) > 0.2
              ? '#F7C1C1' : resultadoBruto < 0 ? '#FAC775' : '#C0DD97',
          }}>
            {resultadoBruto < 0 && (-resultadoBruto / receita) > 0.2
              ? `estouro: +${((-resultadoBruto / receita) * 100).toFixed(1)}% do orçado`
              : resultadoBruto < 0
              ? `atenção: +${((-resultadoBruto / receita) * 100).toFixed(1)}% do orçado`
              : 'dentro do orçado'
            }
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── DRE Analítico ─────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Demonstrativo de Resultado</p>
            <div className="space-y-0.5">
              {/* Receita */}
              <DRELine label="(+) Receita Total" value={receita} bold highlight="positive" icon={Building2} color="hsl(239 84% 67%)" />
              {receitaComBdi != null && (
                <DRELine label="(+) Receita com BDI" value={receitaComBdi} indent={1} icon={Info} color="hsl(239 84% 67%)"
                  sub={`BDI configurado: ${bdi}%`} />
              )}

              {/* Custos Diretos */}
              <DRELine label="(−) Custos Diretos" value={totalDireto} bold highlight="negative" icon={Hammer} color="hsl(0 72% 51%)" />
              {diretos.map(t => {
                const cfg = TIPO_CONFIG[t.tipo];
                return (
                  <DRELine key={t.tipo} label={cfg?.labelPlural || t.tipo} value={t.pago}
                    sub={`${t.count} pag. · ${pct(t.pago, totalPago)}% do custo total`}
                    indent={1} icon={cfg?.icon} color={cfg?.color} />
                );
              })}

              {/* Custos Indiretos */}
              {totalIndireto > 0 && (
                <>
                  <DRELine label="(−) Custos Indiretos" value={totalIndireto} bold indent={0} icon={Wallet} color="hsl(38 90% 48%)" />
                  {indiretos.filter(t => t.pago > 0).map(t => {
                    const cfg = TIPO_CONFIG[t.tipo];
                    return (
                      <DRELine key={t.tipo} label={cfg?.labelPlural || t.tipo} value={t.pago}
                        sub={`${t.count} pag.`} indent={1} icon={cfg?.icon} color={cfg?.color} />
                    );
                  })}
                  {indiretosCustoReal > 0 && (
                    <DRELine label="Lançamentos sem etapa" value={indiretosCustoReal}
                      sub="Custos indiretos manuais" indent={1} icon={Wallet} color="hsl(38 90% 48%)" />
                  )}
                </>
              )}

              {/* Resultado */}
              <div className="pt-1" />
              <DRELine label="(=) Resultado Bruto" value={resultadoBruto} bold
                highlight={resultadoBruto >= 0 ? 'positive' : 'negative'}
                icon={resultadoBruto >= 0 ? TrendingUp : TrendingDown}
                color={resultadoBruto >= 0 ? 'hsl(152 55% 38%)' : 'hsl(0 72% 51%)'} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--color-background-secondary)', borderRadius: 6, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Margem bruta</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                  background: margemBruta >= 0 ? '#EAF3DE' : '#FCEBEB',
                  color: margemBruta >= 0 ? '#3B6D11' : '#A32D2D',
                }}>
                  {margemBruta.toFixed(1)}%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Custo previsto total</span>
                <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalPrevisto)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Gráfico de Pizza ──────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-1">Composição dos Custos</p>
            <p className="text-[11px] text-muted-foreground mb-3">Por tipo de pagamento (realizados)</p>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" labelLine={false}
                    label={({ cx, cy, midAngle, outerRadius, name, pct: p }: { cx: number; cy: number; midAngle: number; outerRadius: number; name: string; pct: number }) => {
                      if (p < 5) return null;
                      const RADIAN = Math.PI / 180;
                      const r = outerRadius + 22;
                      const x = cx + r * Math.cos(-midAngle * RADIAN);
                      const y = cy + r * Math.sin(-midAngle * RADIAN);
                      return <text x={x} y={y} fontSize={10} textAnchor={x > cx ? 'start' : 'end'} fill="hsl(var(--foreground))">{name} {p}%</text>;
                    }}
                  >
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} opacity={0.85} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Sem pagamentos realizados
              </div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate text-muted-foreground">{d.name}</span>
                  <span className="font-semibold ml-auto">{d.pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Margem por Etapa ─────────────────────────────────────────── */}
      {margemEtapas.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-1">Margem por Etapa</p>
            <p className="text-[11px] text-muted-foreground mb-3">Orçado vs. Custo Real · Desvio percentual</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Etapa</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Orçado</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Realizado</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Desvio</th>
                    <th className="px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {margemEtapas.map(e => {
                    const pctReal = e.orcado > 0 ? Math.min(100, (e.realizado / e.orcado) * 100) : 0;
                    const desvioPos = e.desvio != null && e.desvio <= 0;
                    return (
                      <tr key={e.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 font-medium max-w-[180px] truncate">{e.nome}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(e.orcado)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{e.realizado > 0 ? fmt(e.realizado) : '—'}</td>
                        <td className={cn('px-3 py-2.5 text-right tabular-nums font-bold',
                          e.desvio == null ? 'text-muted-foreground' :
                          desvioPos ? 'text-emerald-600' : 'text-red-600'
                        )}>
                          {e.desvio != null ? `${e.desvio > 0 ? '+' : ''}${e.desvio.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 w-28">
                          <div className="flex items-center gap-2">
                            <Progress value={pctReal} className={cn('h-1.5 flex-1', pctReal > 100 && '[&>div]:bg-red-500')} />
                            <span className="text-[10px] tabular-nums w-8 text-right">{pctReal.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Gráfico de Área — Custos por mês ─────────────────────────── */}
      {areaData.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-1">Evolução de Custos por Tipo</p>
            <p className="text-[11px] text-muted-foreground mb-3">Pagamentos realizados acumulados por mês</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData} stackOffset="none">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={60} />
                <Tooltip formatter={(v: number, name: string) => [fmt(v), TIPO_CONFIG[name]?.label || name]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
                  <Area key={tipo} type="monotone" dataKey={tipo} name={cfg.label} stackId="1"
                    stroke={cfg.color} fill={cfg.color} fillOpacity={0.6} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
