import { useMemo, useState } from 'react';
import { useOrcamento, OrcamentoEtapa } from '@/contexts/OrcamentoContext';
import {
  AlertTriangle, CheckCircle2,
  TrendingUp, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown,
  Package, BarChart3, Lock, Loader2, Table2, BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HelpPopover } from '@/components/ui/HelpPopover';
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine,
  LineChart, Line,
} from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ObraSummary { id: string; nome: string; codigo?: string; }
interface OrcamentoDashboardProps {
  obra: ObraSummary;
  onEditWBS: () => void;
  onGoCotacao: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function getEtapaStats(etapa: OrcamentoEtapa) {
  const composicoes = etapa.composicoes || [];
  let totalInsumos = 0;
  let insumosSemPreco = 0;

  for (const comp of composicoes) {
    if (comp.usaInsumos && comp.insumos?.length) {
      for (const ins of comp.insumos) {
        totalInsumos++;
        if (!ins.precoUnitario || ins.precoUnitario === 0) insumosSemPreco++;
      }
    } else {
      totalInsumos++;
      if (!comp.precoUnitario || comp.precoUnitario === 0) insumosSemPreco++;
    }
  }

  const cotadoPct = totalInsumos > 0
    ? Math.round(((totalInsumos - insumosSemPreco) / totalInsumos) * 100)
    : 100;

  return { totalInsumos, insumosSemPreco, cotadoPct };
}

// ── Categoria heurística ─────────────────────────────────────────────────────

const CATEGORIAS: { label: string; keywords: string[] }[] = [
  {
    label: 'Mão de Obra',
    keywords: ['servico', 'serviço', 'mao', 'mão', 'operario', 'operário', 'pedreiro', 'pintor',
      'eletricista', 'encanador', 'af_', 'ajudante', 'oficial', 'montagem', 'instalação de mao'],
  },
  {
    label: 'Materiais',
    keywords: ['cimento', 'areia', 'brita', 'tijolo', 'bloco', 'argamassa', 'concreto', 'ferro',
      'aço', 'madeira', 'tinta', 'piso', 'revestimento', 'telha', 'drywall', 'gesso',
      'impermeabilizante', 'cal', 'cobre', 'aluminio', 'alvenaria'],
  },
  {
    label: 'Instalações',
    keywords: ['tubo', 'fio', 'cabo', 'eletric', 'hidr', 'esgoto', 'tomada', 'interruptor',
      'quadro', 'disjuntor', 'luz', 'lampada', 'lâmpada', 'registro', 'torneira', 'ramal',
      'conduíte', 'conduite', 'eletroduto'],
  },
  {
    label: 'Equipamentos',
    keywords: ['equipamento', 'ferramenta', 'andaime', 'betoneira', 'compressor', 'gerador',
      'grua', 'guindaste', 'locacao', 'locação', 'forma'],
  },
];

const CATEGORIA_COLORS: Record<string, string> = {
  'Mão de Obra': '#6366f1',
  'Materiais': '#10b981',
  'Instalações': '#0ea5e9',
  'Equipamentos': '#f59e0b',
  'Outros': '#94a3b8',
};

const CHART_PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function classificarItem(descricao: string): string {
  const lower = descricao.toLowerCase();
  for (const cat of CATEGORIAS) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.label;
  }
  return 'Outros';
}

// ── Sub-componente: Gráfico de rosca ─────────────────────────────────────────

type DistMode = 'etapa' | 'categoria';

function GraficoPizza({ etapas, mode }: { etapas: OrcamentoEtapa[]; mode: DistMode }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    if (mode === 'etapa') {
      return etapas
        .map((e) => ({
          name: e.nome || e.codigo,
          value: (e.composicoes || []).reduce((s, c) => s + (c.precoTotal || 0), 0),
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    // Modo categoria
    const acc: Record<string, number> = {};
    for (const etapa of etapas) {
      for (const comp of etapa.composicoes || []) {
        if (comp.usaInsumos && comp.insumos?.length) {
          for (const ins of comp.insumos) {
            const cat = classificarItem(ins.descricao || '');
            acc[cat] = (acc[cat] || 0) + (ins.precoTotal || 0);
          }
        } else {
          const cat = classificarItem(comp.descricao || '');
          acc[cat] = (acc[cat] || 0) + (comp.precoTotal || 0);
        }
      }
    }
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [etapas, mode]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhum dado de custo ainda.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const getColor = (name: string, idx: number) =>
    mode === 'categoria' ? (CATEGORIA_COLORS[name] ?? '#94a3b8') : CHART_PALETTE[idx % CHART_PALETTE.length];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-foreground mb-1">{item.name}</p>
        <p className="text-muted-foreground">{formatCurrency(item.value)}</p>
        <p className="text-muted-foreground">{((item.value / total) * 100).toFixed(1)}% do total</p>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Donut chart — altura fixa, sem legenda interna */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={getColor(entry.name, index)}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  className="cursor-pointer transition-opacity"
                />
              ))}
            </Pie>
            <RechartTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda custom em HTML — cresce com número de itens */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {data.map((entry, index) => (
          <div
            key={entry.name}
            className="flex items-center gap-1.5 cursor-pointer"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span
              className="shrink-0 rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: getColor(entry.name, index),
                opacity: activeIndex === null || activeIndex === index ? 1 : 0.4,
              }}
            />
            <span
              className="text-[11px] text-muted-foreground leading-none"
              style={{ opacity: activeIndex === null || activeIndex === index ? 1 : 0.5 }}
            >
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sub-componente: Curva ABC (melhorada) ──────────────────────────────────────────

type AbcSource = 'todos' | 'insumos' | 'composicoes';
type AbcView = 'chart' | 'table';

function CurvaABC({ etapas }: { etapas: OrcamentoEtapa[] }) {
  const [abcSource, setAbcSource] = useState<AbcSource>('todos');
  const [abcView, setAbcView] = useState<AbcView>('chart');

  const dados = useMemo(() => {
    const itens: { descricao: string; valor: number; fonte: AbcSource }[] = [];

    for (const etapa of etapas) {
      for (const comp of etapa.composicoes || []) {
        if (comp.usaInsumos && comp.insumos?.length) {
          for (const ins of comp.insumos) {
            if (ins.precoTotal > 0) {
              itens.push({ descricao: ins.descricao || ins.codigo, valor: ins.precoTotal, fonte: 'insumos' });
            }
          }
        } else if (comp.precoTotal > 0) {
          itens.push({ descricao: comp.descricao || comp.codigo, valor: comp.precoTotal, fonte: 'composicoes' });
        }
      }
    }

    const filtrados = abcSource === 'todos' ? itens : itens.filter(i => i.fonte === abcSource);
    filtrados.sort((a, b) => b.valor - a.valor);
    const total = filtrados.reduce((s, i) => s + i.valor, 0);

    let acumulado = 0;
    return filtrados.map((item, idx) => {
      acumulado += item.valor;
      const pct = total > 0 ? (acumulado / total) * 100 : 0;
      const classe = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
      return {
        rank: idx + 1,
        descricao: item.descricao,
        valor: item.valor,
        pctItem: total > 0 ? (item.valor / total) * 100 : 0,
        pctAcumulado: parseFloat(pct.toFixed(1)),
        classe,
        fonte: item.fonte,
      };
    });
  }, [etapas, abcSource]);

  const countA = dados.filter(d => d.classe === 'A').length;
  const countB = dados.filter(d => d.classe === 'B').length;
  const countC = dados.filter(d => d.classe === 'C').length;

  if (dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {abcSource !== 'todos'
          ? `Nenhum item com preço para o filtro selecionado.`
          : 'Nenhum item com preço para gerar a curva ABC.'}
      </div>
    );
  }

  const chartData = dados.slice(0, Math.min(dados.length, 25));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs max-w-[220px]">
        <p className="font-semibold text-foreground mb-1 truncate">#{d.rank} {d.descricao}</p>
        <p className="text-muted-foreground">{formatCurrency(d.valor)}</p>
        <p className="text-muted-foreground">Acumulado: <strong>{d.pctAcumulado}%</strong></p>
        <span className={cn('font-bold', d.classe === 'A' ? 'text-red-500' : d.classe === 'B' ? 'text-amber-500' : 'text-emerald-500')}>
          Classe {d.classe}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Controles: Filtro de fonte + Visão */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Filtro */}
        <div className="flex items-center gap-1 border rounded-md overflow-hidden">
          {(['todos', 'insumos', 'composicoes'] as AbcSource[]).map(src => (
            <button
              key={src}
              onClick={() => setAbcSource(src)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-medium transition-colors',
                abcSource === src ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted/50',
                src !== 'composicoes' && 'border-r'
              )}
            >
              {src === 'todos' ? 'Todos' : src === 'insumos' ? 'Insumos' : 'Composições'}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 border rounded-md overflow-hidden">
          <button
            onClick={() => setAbcView('chart')}
            className={cn('p-1.5 transition-colors', abcView === 'chart' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted/50')}
            title="Gráfico"
          >
            <BarChart2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setAbcView('table')}
            className={cn('p-1.5 transition-colors border-l', abcView === 'table' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted/50')}
            title="Tabela completa"
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Badges de classe */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
          A · {countA} itens · 80%
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          B · {countB} itens · 15%
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          C · {countC} itens · 5%
        </span>
        <span className="text-[10px] text-muted-foreground">
          {dados.length} itens totais
        </span>
      </div>

      {/* Vista: Gráfico */}
      {abcView === 'chart' && (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="rank" tick={false} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tickFormatter={formatCurrencyShort} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <RechartTooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="valor" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.classe === 'A' ? '#ef4444' : entry.classe === 'B' ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="pctAcumulado" stroke="#6366f1" strokeWidth={2} dot={false} />
                <ReferenceLine yAxisId="right" y={80} stroke="#6366f1" strokeDasharray="4 4" label={{ value: '80%', position: 'right', fontSize: 10, fill: '#6366f1' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] text-muted-foreground">Top {Math.min(5, countA)} itens Classe A (priorize a cotação):</div>
          <div className="space-y-1">
            {dados.slice(0, Math.min(5, countA)).map((item) => (
              <div key={item.rank} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                <span className="text-[10px] font-bold text-red-500 shrink-0 w-4">#{item.rank}</span>
                <span className="text-xs text-foreground truncate flex-1">{item.descricao}</span>
                <span className="text-xs font-semibold text-red-600 shrink-0">{formatCurrency(item.valor)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Vista: Tabela completa */}
      {abcView === 'table' && (
        <div className="rounded-md border overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="text-[11px] w-full">
              <thead className="sticky top-0">
                <tr className="bg-muted/80">
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground w-8">#</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Descrição</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">Valor</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">% Item</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">% Acum.</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground">Cl.</th>
                </tr>
              </thead>
              <tbody>
                {dados.map(item => (
                  <tr key={item.rank} className="border-t odd:bg-muted/10">
                    <td className="px-2 py-1.5 text-muted-foreground font-mono">{item.rank}</td>
                    <td className="px-2 py-1.5 text-foreground max-w-[180px] truncate" title={item.descricao}>{item.descricao}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium">{formatCurrency(item.valor)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{item.pctItem.toFixed(1)}%</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{item.pctAcumulado}%</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        'font-bold text-[10px]',
                        item.classe === 'A' ? 'text-red-600' :
                        item.classe === 'B' ? 'text-amber-600' : 'text-emerald-600'
                      )}>{item.classe}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

type GraphView = 'distribuicao' | 'abc';

export default function OrcamentoDashboard({ obra, onEditWBS, onGoCotacao }: OrcamentoDashboardProps) {
  const { getOrcamento, finalizarOrcamento } = useOrcamento();
  const etapas = getOrcamento(obra.id)?.etapas ?? [];

  const [expandedEtapas, setExpandedEtapas] = useState<Set<string>>(new Set());
  const [graphView, setGraphView] = useState<GraphView>('distribuicao');
  const [distMode, setDistMode] = useState<DistMode>('etapa');
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [finalizadoResult, setFinalizadoResult] = useState<{ total: number; novos: number } | null>(null);

  const toggleEtapa = (id: string) => {
    setExpandedEtapas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedEtapas(new Set(etapas.map((e) => e.id)));
  const collapseAll = () => setExpandedEtapas(new Set());
  const anyExpanded = expandedEtapas.size > 0;

  const handleFinalizar = async () => {
    const orc = getOrcamento(obra.id);
    if (!orc) return;
    setFinalizando(true);
    try {
      const result = await finalizarOrcamento(orc);
      setFinalizadoResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setFinalizando(false);
    }
  };

  const stats = useMemo(() => {
    let totalGeral = 0;
    let totalInsumos = 0;
    let insumosSemPreco = 0;
    let totalComposicoes = 0;

    for (const etapa of etapas) {
      for (const comp of etapa.composicoes || []) {
        totalComposicoes++;
        if (comp.usaInsumos && comp.insumos?.length) {
          for (const ins of comp.insumos) {
            totalInsumos++;
            totalGeral += ins.precoTotal || 0;
            if (!ins.precoUnitario || ins.precoUnitario === 0) insumosSemPreco++;
          }
        } else {
          totalInsumos++;
          totalGeral += comp.precoTotal || 0;
          if (!comp.precoUnitario || comp.precoUnitario === 0) insumosSemPreco++;
        }
      }
    }

    const cotadoPct = totalInsumos > 0
      ? Math.round(((totalInsumos - insumosSemPreco) / totalInsumos) * 100)
      : 100;

    return { totalGeral, totalInsumos, insumosSemPreco, totalComposicoes, cotadoPct };
  }, [etapas]);

  const kpis = [
    {
      label: 'Total Previsto',
      value: formatCurrency(stats.totalGeral),
      icon: TrendingUp,
      color: 'text-primary dark:text-primary/80',
      bg: 'bg-primary/8 dark:bg-indigo-950/40',
      border: 'border-primary/12 dark:border-indigo-900/60',
    },
    {
      label: 'Itens Cotados',
      value: `${stats.cotadoPct}%`,
      icon: CheckCircle2,
      color: stats.cotadoPct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      bg: stats.cotadoPct === 100 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-amber-50 dark:bg-amber-950/40',
      border: stats.cotadoPct === 100 ? 'border-emerald-100 dark:border-emerald-900/60' : 'border-amber-100 dark:border-amber-900/60',
    },
    {
      label: 'Sem Preço',
      value: stats.insumosSemPreco.toString(),
      icon: AlertTriangle,
      color: stats.insumosSemPreco > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
      bg: stats.insumosSemPreco > 0 ? 'bg-red-50 dark:bg-red-950/40' : 'bg-emerald-50 dark:bg-emerald-950/40',
      border: stats.insumosSemPreco > 0 ? 'border-red-100 dark:border-red-900/60' : 'border-emerald-100 dark:border-emerald-900/60',
    },
    {
      label: 'Composições',
      value: stats.totalComposicoes.toString(),
      icon: Package,
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-800/40',
      border: 'border-slate-100 dark:border-slate-700/60',
    },
  ];

  return (
    <>
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-5 max-w-screen-xl mx-auto w-full">

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className={cn('rounded-xl p-4 border flex items-start gap-3', kpi.bg, kpi.border)}>
                <div className={cn('mt-0.5 shrink-0', kpi.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className={cn('text-xl font-bold leading-none', kpi.color)}>{kpi.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Alerta / Sucesso ──────────────────────────────────────────────── */}
        {stats.insumosSemPreco > 0 ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-400">
                <strong>{stats.insumosSemPreco} {stats.insumosSemPreco === 1 ? 'item' : 'itens'}</strong> sem preço. Complete o orçamento ou envie links de cotação.
              </p>
            </div>
            <button onClick={onGoCotacao} className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline shrink-0">
              Cotar agora →
            </button>
          </div>
        ) : etapas.length > 0 ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800 dark:text-emerald-400">
                Todos os itens têm preço! Orçamento <strong>100% cotado</strong>.
              </p>
            </div>
            <button
              onClick={() => { setFinalizadoResult(null); setFinalizarOpen(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
            >
              <Lock className="h-3 w-3" />
              Finalizar orçamento
            </button>
          </div>
        ) : null}

        {/* ── Layout de duas colunas: Lista + Gráfico ──────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5 items-start">

          {/* ── Coluna esquerda: Lista de etapas ─────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Etapas do Orçamento
              </h2>
              {etapas.length > 0 && (
                <button
                  onClick={anyExpanded ? collapseAll : expandAll}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {anyExpanded
                    ? <><ChevronsDownUp className="h-3.5 w-3.5" /> Fechar todas</>
                    : <><ChevronsUpDown className="h-3.5 w-3.5" /> Abrir todas</>}
                </button>
              )}
            </div>

            {etapas.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="text-5xl select-none">📋</div>
                <div>
                  <p className="text-base font-semibold text-foreground mb-1">Nenhuma etapa criada</p>
                  <p className="text-sm text-muted-foreground mb-4">Comece o orçamento de uma das formas abaixo:</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={onEditWBS}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary transition-colors"
                  >
                    ️✏️ Criar etapas
                  </button>
                  <button
                    onClick={onEditWBS}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-300 text-violet-700 dark:text-violet-400 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                  >
                    ️🏗️ Usar modelos de etapa
                  </button>
                  <button
                    onClick={onEditWBS}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                  >
                    ️📊 Importar SINAPI
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {etapas.map((etapa, i) => {
                  const etapaStats = getEtapaStats(etapa);
                  const total = (etapa.composicoes || []).reduce((s, c) => s + (c.precoTotal || 0), 0);
                  const isExpanded = expandedEtapas.has(etapa.id);
                  const dotColor = etapaStats.cotadoPct === 100 ? 'bg-emerald-500' : etapaStats.cotadoPct > 50 ? 'bg-amber-400' : 'bg-red-500';

                  return (
                    <div key={etapa.id} className="rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-sm">
                      {/* Linha clicável da etapa */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => toggleEtapa(etapa.id)}
                      >
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', isExpanded ? 'rotate-0' : '-rotate-90')} />
                        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold truncate text-foreground">{etapa.nome || etapa.codigo}</span>
                            <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor)} />
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', etapaStats.cotadoPct === 100 ? 'bg-emerald-500' : 'bg-primary/80')}
                              style={{ width: `${etapaStats.cotadoPct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-sm font-bold text-foreground">{formatCurrency(total)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {(etapa.composicoes || []).length} comp. · {etapaStats.cotadoPct}% cotado
                          </div>
                        </div>
                      </button>

                      {/* Composições expandidas */}
                      {isExpanded && (
                        <div className="border-t border-border/50 bg-muted/10">
                          {(etapa.composicoes || []).length === 0 ? (
                            <div className="px-4 py-4 text-center text-xs text-muted-foreground">
                              Nenhuma composição nesta etapa.
                            </div>
                          ) : (
                            <div className="divide-y divide-border/40">
                              {(etapa.composicoes || []).map((comp) => {
                                const compSemPreco = !comp.precoUnitario || comp.precoUnitario === 0;
                                const insSemPreco = (comp.insumos || []).filter((i) => !i.precoUnitario).length;
                                const totalSemPreco = comp.usaInsumos ? insSemPreco : (compSemPreco ? 1 : 0);

                                return (
                                  <div key={comp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                                    <span className={cn('h-2 w-2 rounded-full shrink-0', totalSemPreco > 0 ? 'bg-red-400' : 'bg-emerald-500')} />
                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-12">{comp.codigo}</span>
                                    <span className="text-xs text-foreground flex-1 truncate">{comp.descricao || '—'}</span>
                                    {comp.usaInsumos && (
                                      <span className="text-[10px] text-muted-foreground shrink-0">{(comp.insumos || []).length} ins.</span>
                                    )}
                                    {totalSemPreco > 0 && (
                                      <span className="text-[10px] text-red-500 shrink-0 whitespace-nowrap">{totalSemPreco} sem preço</span>
                                    )}
                                    <span className="text-xs font-semibold text-foreground shrink-0 text-right w-24">
                                      {formatCurrency(comp.precoTotal || 0)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="px-4 py-2 border-t border-border/40 flex justify-end">
                            <button
                              onClick={onEditWBS}
                              className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                            >
                              Editar etapa <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Coluna direita: Gráficos (sticky) ────────────────────────── */}
          {etapas.length > 0 && stats.totalGeral > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-3 xl:sticky xl:top-4">

              {/* Toggle: Distribuição vs ABC */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Análise</h3>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setGraphView('distribuicao')}
                    className={cn('px-2.5 py-1 text-[11px] font-medium transition-colors', graphView === 'distribuicao' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted')}
                  >
                    Distribuição
                  </button>
                  <button
                    onClick={() => setGraphView('abc')}
                    className={cn('px-2.5 py-1 text-[11px] font-medium flex items-center gap-1 transition-colors', graphView === 'abc' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted')}
                  >
                    <BarChart3 className="h-3 w-3" /> Curva ABC
                  </button>
                </div>
              </div>

              {graphView === 'distribuicao' ? (
                <>
                  {/* Sub-toggle: por etapa ou por categoria */}
                  <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg">
                    <button
                      onClick={() => setDistMode('etapa')}
                      className={cn('flex-1 py-1 text-[11px] font-medium rounded-md transition-colors',
                        distMode === 'etapa' ? 'bg-white dark:bg-slate-800 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                    >
                      Por Etapa
                    </button>
                    <button
                      onClick={() => setDistMode('categoria')}
                      className={cn('flex-1 py-1 text-[11px] font-medium rounded-md transition-colors',
                        distMode === 'categoria' ? 'bg-white dark:bg-slate-800 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                    >
                      Por Categoria
                    </button>
                  </div>
                  {distMode === 'categoria' && (
                    <p className="text-[10px] text-muted-foreground">
                      Classificação estimada baseada nas descrições dos itens.
                    </p>
                  )}
                  <GraficoPizza etapas={etapas} mode={distMode} />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <p className="text-[11px] text-muted-foreground">Priorize a cotação dos itens Classe A</p>
                    <HelpPopover
                      title="Como usar a Curva ABC"
                      text="Classe A = top 80% do custo. Priorize cotar esses itens. Classe B = 15% do custo. Classe C = 5% restantes. Filtre por Insumos ou Composições para análises mais detalhadas."
                      side="left"
                    />
                  </div>
                  <CurvaABC etapas={etapas} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Dialog: Finalizar Orçamento ─────────────────────────────────── */}
    <Dialog open={finalizarOpen} onOpenChange={setFinalizarOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" />
            Finalizar Orçamento
          </DialogTitle>
          <DialogDescription>
            Isso consolida os preços atuais no histórico de composições da empresa para uso em obras futuras.
          </DialogDescription>
        </DialogHeader>

        {!finalizadoResult ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted/40 border p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total previsto</span>
                <span className="font-semibold">{formatCurrency(stats.totalGeral)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Composições</span>
                <span className="font-semibold">{stats.totalComposicoes}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Itens sem preço</span>
                <span className={cn('font-semibold', stats.insumosSemPreco > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                  {stats.insumosSemPreco}
                </span>
              </div>
            </div>
            {stats.insumosSemPreco > 0 && (
              <p className="text-xs text-amber-600 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Há itens sem preço. Você pode finalizar mesmo assim, mas esses itens não serão gravados no histórico.
              </p>
            )}
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div>
              <p className="font-semibold text-foreground">Orçamento finalizado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {finalizadoResult.novos > 0
                  ? `${finalizadoResult.novos} nova${finalizadoResult.novos !== 1 ? 's' : ''} composição${finalizadoResult.novos !== 1 ? 'ões' : ''} adicionada${finalizadoResult.novos !== 1 ? 's' : ''} ao catálogo.`
                  : 'Preços atualizados no catálogo da empresa.'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!finalizadoResult ? (
            <>
              <Button variant="outline" onClick={() => setFinalizarOpen(false)}>Cancelar</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={handleFinalizar}
                disabled={finalizando}
              >
                {finalizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {finalizando ? 'Finalizando...' : 'Confirmar e Finalizar'}
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={() => setFinalizarOpen(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>);
}
