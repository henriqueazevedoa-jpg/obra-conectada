import { useMemo, useState, useEffect, useRef } from 'react';
import { useOrcamento, OrcamentoEtapa } from '@/contexts/OrcamentoContext';
import {
  AlertTriangle, CheckCircle2, X,
  ChevronDown, ChevronRight,
  Package, Lock, Loader2, Table2, BarChart2,
  Lightbulb, Pencil, ChevronsUpDown, ChevronsDownUp,
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
import { PageKPI } from '@/components/layout/PageShell';
import { classificarCurvaABC, AbcSource } from '@/lib/curvaABC';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ObraSummary { id: string; nome: string; codigo?: string; }
interface OrcamentoDashboardProps {
  obra: ObraSummary;
  onEditWBS: () => void;
  onGoCotacao: () => void;
  /** Navega para Cotação com filtro pré-aplicado nos itens classe A */
  onGoCotacaoClasseA?: () => void;
  /** Emite KPIs para o PageShell do Central */
  onKpisReady?: (kpis: PageKPI[]) => void;
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

// ── Sub-componente: Distribuição compacta (donut + legenda) ──────────────────

function GraficoDistribuicao({ etapas }: { etapas: OrcamentoEtapa[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    return etapas
      .map((e) => ({
        name: e.nome || e.codigo || 'Etapa',
        value: (e.composicoes || []).reduce((s, c) => s + (c.precoTotal || 0), 0),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [etapas]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
        Nenhum dado de custo ainda.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                />
              ))}
            </Pie>
            <RechartTooltip
              formatter={(v: number, name: string) => [formatCurrency(v), name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
        {data.map((entry, i) => (
          <div
            key={entry.name}
            className="flex items-center gap-2 text-xs"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }}
            />
            <span className="flex-1 truncate text-foreground" title={entry.name}>
              {entry.name}
            </span>
            <span className="tabular-nums text-muted-foreground shrink-0">
              {formatCurrencyShort(entry.value)}
            </span>
            <span className="tabular-nums text-muted-foreground shrink-0 w-8 text-right">
              {((entry.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sub-componente: KPIs (4 cards) ──────────────────────────────────────────



// ── Sub-componente: Curva ABC em destaque ────────────────────────────────────

type AbcView = 'chart' | 'table';

interface CurvaABCProps {
  etapas: OrcamentoEtapa[];
  onGoCotacaoClasseA?: () => void;
}

function CurvaABC({ etapas, onGoCotacaoClasseA }: CurvaABCProps) {
  const [abcSource, setAbcSource] = useState<AbcSource>('todos');
  const [abcView, setAbcView] = useState<AbcView>('chart');

  const dados = useMemo(() => classificarCurvaABC(etapas, abcSource), [etapas, abcSource]);

  const countA = dados.filter(d => d.classe === 'A').length;
  const countB = dados.filter(d => d.classe === 'B').length;
  const countC = dados.filter(d => d.classe === 'C').length;
  const valorA = dados.filter(d => d.classe === 'A').reduce((s, d) => s + d.valor, 0);
  const totalValor = dados.reduce((s, d) => s + d.valor, 0);

  if (dados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
        <BarChart2 className="h-8 w-8 opacity-30" />
        <span>Nenhum item com preço para gerar a Curva ABC.</span>
        <span className="text-xs opacity-60">Preencha os preços na Planilha.</span>
      </div>
    );
  }

  const chartData = dados.slice(0, Math.min(dados.length, 30));

  const CustomTooltipChart = ({ active, payload }: any) => {
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
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Badges de classe */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
              A · {countA} it. · 80%
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              B · {countB} it. · 15%
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              C · {countC} it. · 5%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtro fonte */}
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
      </div>

      {/* Layout principal: chart + tabela lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
        {/* Gráfico ou Tabela completa */}
        <div>
          {abcView === 'chart' ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="rank" tick={false} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tickFormatter={formatCurrencyShort} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartTooltip content={<CustomTooltipChart />} />
                  <Bar yAxisId="left" dataKey="valor" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.classe === 'A' ? '#ef4444' : entry.classe === 'B' ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="pctAcumulado" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <ReferenceLine yAxisId="right" y={80} stroke="#6366f1" strokeDasharray="4 4" label={{ value: '80%', position: 'right', fontSize: 10, fill: '#6366f1' }} />
                  <ReferenceLine yAxisId="right" y={95} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '95%', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                <table className="text-[11px] w-full">
                  <thead className="sticky top-0">
                    <tr className="bg-muted/80">
                      <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground w-8">#</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Descrição</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">Valor</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground">% Acum.</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground">Cl.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map(item => (
                      <tr key={item.rank} className="border-t odd:bg-muted/10">
                        <td className="px-2 py-1.5 text-muted-foreground font-mono">{item.rank}</td>
                        <td className="px-2 py-1.5 text-foreground max-w-[180px] truncate" title={item.descricao}>{item.descricao}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-medium">{formatCurrencyShort(item.valor)}</td>
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

        {/* Tabela lateral: Top itens classe A */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Top Classe A</p>
            <HelpPopover
              title="Curva ABC"
              text="Classe A = top 80% do custo. São os itens críticos para cotar. Classe B = próximos 15%. Classe C = 5% restantes."
              side="left"
            />
          </div>
          {/* Resumo */}
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 px-3 py-2 text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{countA} itens classe A</span>
              <span className="font-semibold text-red-700 dark:text-red-400">{formatCurrencyShort(valorA)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">% do orçamento</span>
              <span className="font-semibold">{totalValor > 0 ? ((valorA / totalValor) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>

          {/* Lista top 6 */}
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {dados.slice(0, Math.min(6, countA)).map((item) => (
              <div key={item.rank} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                <span className="text-[10px] font-bold text-red-500 shrink-0 w-4">#{item.rank}</span>
                <span className="text-xs text-foreground truncate flex-1" title={item.descricao}>{item.descricao}</span>
                <span className="text-[10px] font-semibold text-red-600 shrink-0">{formatCurrencyShort(item.valor)}</span>
              </div>
            ))}
          </div>

          {/* Botão Cotar itens A */}
          {countA > 0 && onGoCotacaoClasseA && (
            <button
              onClick={onGoCotacaoClasseA}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Cotar itens A →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente: Accordion de etapas (BLOCO 2) ────────────────────────────

const SESSION_KEY = (obraId: string) => `lastra_orcamento_etapas_expandidas:${obraId}`;

interface EtapasAccordionProps {
  etapas: OrcamentoEtapa[];
  obraId: string;
  onEditWBS: () => void;
  /** Mapa key→classe para chips ABC nas composições */
  abcDados: Map<string, 'A' | 'B' | 'C'>;
}

function EtapasAccordion({ etapas, obraId, onEditWBS, abcDados }: EtapasAccordionProps) {
  // Inicializar expansão a partir de sessionStorage ou expandir 1ª etapa
  const [expandedEtapas, setExpandedEtapas] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY(obraId));
      if (raw) return new Set(JSON.parse(raw));
    } catch { /* ignore */ }
    return etapas.length > 0 ? new Set([etapas[0].id]) : new Set();
  });

  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());

  // Persistir expansão de etapas
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY(obraId), JSON.stringify(Array.from(expandedEtapas)));
    } catch { /* ignore */ }
  }, [expandedEtapas, obraId]);

  const toggleEtapa = (id: string) => {
    setExpandedEtapas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleComp = (id: string) => {
    setExpandedComps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allExpanded = etapas.length > 0 && etapas.every(e => expandedEtapas.has(e.id));
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedEtapas(new Set());
      setExpandedComps(new Set());
    } else {
      setExpandedEtapas(new Set(etapas.map(e => e.id)));
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          Etapas do Orçamento
        </h2>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {allExpanded
            ? <><ChevronsDownUp className="h-3.5 w-3.5" /> Recolher tudo</>
            : <><ChevronsUpDown className="h-3.5 w-3.5" /> Expandir tudo</>}
        </button>
      </div>

      {/* Lista de etapas */}
      <div className="divide-y divide-border">
        {etapas.map((etapa, i) => {
          const composicoes = etapa.composicoes || [];
          const etapaStats = getEtapaStats(etapa);
          const total = composicoes.reduce((s, c) => s + (c.precoTotal || 0), 0);
          const pct = etapaStats.cotadoPct;
          const isEtapaOpen = expandedEtapas.has(etapa.id);
          const borderColor = pct === 100 ? '#10b981' : pct > 60 ? '#f59e0b' : '#ef4444';

          return (
            <div key={etapa.id}>
              {/* ── Linha da Etapa (Nível 0) ───────────────────────────── */}
              <div
                className={cn(
                  'group relative flex items-center gap-3 px-4 py-3 cursor-pointer select-none',
                  'hover:bg-muted/40 transition-colors',
                  isEtapaOpen && 'bg-muted/20',
                )}
                onClick={() => toggleEtapa(etapa.id)}
                role="button"
                aria-expanded={isEtapaOpen}
              >
                {/* Barra colorida esquerda */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-colors"
                  style={{ background: borderColor }}
                />

                {/* Chevron */}
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
                    isEtapaOpen && 'rotate-90',
                  )}
                />

                {/* Número */}
                <span className="shrink-0 h-5 w-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </span>

                {/* Nome + mini barra de progresso */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {etapa.nome || etapa.codigo || 'Sem nome'}
                    </span>
                    {etapaStats.insumosSemPreco > 0 && (
                      <span className="text-[10px] text-red-500 shrink-0">
                        {etapaStats.insumosSemPreco} sem preço
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-[3px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden w-40 max-w-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: borderColor }}
                    />
                  </div>
                </div>

                {/* Meta à direita */}
                <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                  <span>{composicoes.length} composições</span>
                  <span className="font-medium" style={{ color: borderColor }}>{pct}% cotado</span>
                  <span className="font-bold text-foreground tabular-nums">{formatCurrencyShort(total)}</span>
                </div>

                {/* Botão editar (lápis) — stopPropagation para não togglear */}
                <button
                  onClick={e => { e.stopPropagation(); onEditWBS(); }}
                  className="shrink-0 p-1.5 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Editar na Planilha"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* ── Composições (Nível 1) ──────────────────────────────── */}
              {isEtapaOpen && (
                <div className="bg-muted/5 divide-y divide-border/50">
                  {composicoes.map(comp => {
                    const isCompOpen = expandedComps.has(comp.id);
                    const hasInsumos = comp.usaInsumos && comp.insumos && comp.insumos.length > 0;
                    const abcClasse = abcDados.get(comp.id);

                    return (
                      <div key={comp.id}>
                        {/* Linha da composição */}
                        <div
                          className={cn(
                            'flex items-center gap-2 pl-[44px] pr-4 py-2.5',
                            hasInsumos && 'cursor-pointer hover:bg-muted/30 transition-colors',
                            isCompOpen && 'bg-muted/20',
                          )}
                          onClick={() => hasInsumos && toggleComp(comp.id)}
                          role={hasInsumos ? 'button' : undefined}
                          aria-expanded={hasInsumos ? isCompOpen : undefined}
                        >
                          {/* Chevron só se tiver insumos */}
                          <span className="w-4 shrink-0 flex items-center">
                            {hasInsumos ? (
                              <ChevronRight
                                className={cn(
                                  'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                                  isCompOpen && 'rotate-90',
                                )}
                              />
                            ) : (
                              <span className="inline-block w-3.5" />
                            )}
                          </span>

                          {/* Nome composição */}
                          <span className="flex-1 text-xs text-foreground truncate" title={comp.descricao || comp.codigo}>
                            {comp.descricao || comp.codigo || 'Composição'}
                          </span>

                          {/* Chip ABC */}
                          {abcClasse && (
                            <span className={cn(
                              'shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                              abcClasse === 'A' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                              abcClasse === 'B' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                            )}>
                              {abcClasse}
                            </span>
                          )}

                          {/* Qtd / Preço / Total */}
                          <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground tabular-nums">
                            {comp.quantidade != null && (
                              <span>{comp.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {comp.unidade}</span>
                            )}
                            {comp.precoUnitario ? (
                              <span>{formatCurrency(comp.precoUnitario)}/{comp.unidade}</span>
                            ) : (
                              <span className="text-red-400">sem preço</span>
                            )}
                            <span className="font-medium text-foreground">{formatCurrencyShort(comp.precoTotal || 0)}</span>
                          </div>
                        </div>

                        {/* ── Insumos (Nível 2) ──────────────────────────── */}
                        {isCompOpen && hasInsumos && (
                          <div className="bg-muted/5 divide-y divide-border/30">
                            {comp.insumos!.map(ins => {
                              const semPreco = !ins.precoUnitario || ins.precoUnitario === 0;
                              return (
                                <div
                                  key={ins.id}
                                  className="flex items-center gap-2 pl-[68px] pr-4 py-2"
                                >
                                  <span className="w-4 shrink-0 flex items-center justify-center">
                                    {semPreco && (
                                      <AlertTriangle className="h-3 w-3 text-red-500" />
                                    )}
                                  </span>

                                  <span
                                    className="flex-1 text-[11px] text-muted-foreground truncate"
                                    title={ins.descricao || ins.codigo}
                                  >
                                    {ins.descricao || ins.codigo || 'Insumo'}
                                  </span>

                                  <div className="hidden sm:flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground tabular-nums">
                                    {ins.quantidade != null && (
                                      <span>{ins.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {ins.unidade}</span>
                                    )}
                                    {ins.precoUnitario ? (
                                      <span>R$ {ins.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    ) : (
                                      <span className="text-red-400 font-medium">sem preço</span>
                                    )}
                                    <span className="font-medium text-foreground">{formatCurrencyShort(ins.precoTotal || 0)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

const DICA_KEY = 'lastra_orcamento_dica_vista';


export default function OrcamentoDashboard({ obra, onEditWBS, onGoCotacao, onGoCotacaoClasseA, onKpisReady }: OrcamentoDashboardProps) {
  const { getOrcamento, finalizarOrcamento } = useOrcamento();
  const etapas = getOrcamento(obra.id)?.etapas ?? [];

  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [finalizadoResult, setFinalizadoResult] = useState<{ total: number; novos: number } | null>(null);
  const [dicaDismissed, setDicaDismissed] = useState(() => {
    try { return localStorage.getItem(DICA_KEY) === '1'; } catch { return false; }
  });

  const handleDismissDica = () => {
    setDicaDismissed(true);
    try { localStorage.setItem(DICA_KEY, '1'); } catch { /* ignore */ }
  };

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

  // Mapa comp.id → classe ABC para chips no accordion do BLOCO 2
  const abcDadosBloco2 = useMemo((): Map<string, 'A' | 'B' | 'C'> => {
    const abc = classificarCurvaABC(etapas);
    const m = new Map<string, 'A' | 'B' | 'C'>();
    for (const item of abc) {
      // key pode ser "compId::insId" (insumo) ou "compId" (composição simples)
      // Para o accordion queremos mapear pelo compId
      const compId = item.key.includes('::') ? item.key.split('::')[0] : item.key;
      // Mantém a pior classe se o compId já foi visto (A > B > C)
      const existing = m.get(compId);
      const rank = { A: 0, B: 1, C: 2 };
      if (!existing || rank[item.classe] < rank[existing]) {
        m.set(compId, item.classe);
      }
    }
    return m;
  }, [etapas]);

  const prevKpisRef = useRef<string>('');

  // ── Emitir KPIs para o PageShell — com estabilização via ref ──────────────
  useEffect(() => {
    if (!onKpisReady) return;
    const nextKpis: PageKPI[] = [
      {
        id: 'total',
        label: 'Total Previsto',
        value: formatCurrency(stats.totalGeral),
        tint: 'rgba(83,74,183,0.08)',
        valueColor: '#534AB7',
        labelColor: '#7c75be',
      },
      {
        id: 'cotado',
        label: '% Cotado',
        value: `${stats.cotadoPct}%`,
        tint: stats.cotadoPct === 100 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
        valueColor: stats.cotadoPct === 100 ? '#059669' : '#d97706',
        labelColor: stats.cotadoPct === 100 ? '#10b981' : '#f59e0b',
      },
      {
        id: 'sem_preco',
        label: 'Sem Preço',
        value: stats.insumosSemPreco.toString(),
        tint: stats.insumosSemPreco > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
        valueColor: stats.insumosSemPreco > 0 ? '#dc2626' : '#059669',
        labelColor: stats.insumosSemPreco > 0 ? '#ef4444' : '#10b981',
      },
      {
        id: 'composicoes',
        label: 'Composições',
        value: stats.totalComposicoes.toString(),
        tint: 'rgba(100,116,139,0.08)',
        valueColor: '#475569',
        labelColor: '#94a3b8',
      },
    ];
    // Só emitir se os valores mudaram de fato
    const sig = JSON.stringify(nextKpis.map(k => [k.id, k.value]));
    if (sig === prevKpisRef.current) return;
    prevKpisRef.current = sig;
    onKpisReady(nextKpis);
  }, [stats, onKpisReady]);

  return (
    <>
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-4 max-w-screen-xl mx-auto w-full">

        {/* ── Banner dica — dismissível ─────────────────────────────── */}
        {!dicaDismissed && etapas.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 animate-in fade-in duration-300">
            <Lightbulb className="h-4 w-4 text-violet-500 shrink-0" />
            <p className="text-xs text-violet-800 dark:text-violet-300 flex-1 leading-relaxed">
              💡 Use <strong>🔍</strong> para buscar no SINAPI · <strong>📋</strong> para criar listas de cotação · Selecione itens em lote para cotar em grupo
            </p>
            <button onClick={handleDismissDica} className="shrink-0 text-violet-400 hover:text-violet-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Linha 2: Curva ABC (60%) + Distribuição (40%) ────────── */}
        {etapas.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Curva ABC */}
            <div className="lg:w-[60%] rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Curva ABC do Orçamento</h2>
                <span className="text-[11px] text-muted-foreground hidden sm:block">— priorize os itens Classe A</span>
              </div>
              <CurvaABC etapas={etapas} onGoCotacaoClasseA={onGoCotacaoClasseA} />
            </div>

            {/* Distribuição de Custos */}
            {stats.totalGeral > 0 && (
              <div className="lg:w-[40%] rounded-xl border bg-card p-4 shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-3">Distribuição por Etapa</h3>
                <GraficoDistribuicao etapas={etapas} />
              </div>
            )}
          </div>
        )}

        {/* ── Linha 3: Etapas (colapsado, scroll interno) ──────────── */}
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                ✏️ Criar etapas
              </button>
              <button
                onClick={onEditWBS}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-300 text-violet-700 dark:text-violet-400 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
              >
                🏗️ Usar modelos de etapa
              </button>
              <a
                href="/calculadora"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                🧮 Já tem uma estimativa?
              </a>
            </div>
          </div>
        ) : (
          <div className="pb-8">
            <EtapasAccordion
              etapas={etapas}
              obraId={obra.id}
              onEditWBS={onEditWBS}
              abcDados={abcDadosBloco2}
            />
          </div>
        )}

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
