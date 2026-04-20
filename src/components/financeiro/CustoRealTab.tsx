/**
 * CustoRealTab — Sprint 2
 *
 * Duas fontes de dados:
 *   1. `pagamentos` com status = 'pago' (vinculados à obra)
 *   2. `custo_real_itens` (lançamentos manuais + origem automática)
 *
 * Merge por etapa_id. Entradas sem etapa → "Custos Indiretos".
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { PageKPI } from '@/components/layout/PageShell';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useCompany } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Cell, Legend,
} from 'recharts';
import {
  ChevronDown, ChevronRight, DollarSign, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, Plus, Loader2, Receipt, Wallet,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type TipoLancamento = 'pagamento' | 'lancamento';

interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string | null;
  fornecedor: string | null;
  categoria: string | null;
  etapa_id: string | null;
  etapa_nome: string | null;
  origem: string | null;
}

interface EtapaFinanceiro {
  id: string | null;          // null = sem etapa (indireto)
  nome: string;
  orcado: number;
  realizado: number;
  desvio: number;
  desvioPercent: number;
  lancamentos: Lancamento[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function formatCurrencyShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

const CATEGORIAS_LANCAMENTO = [
  'Material', 'Mão de Obra', 'Serviço', 'Equipamento', 'Taxas e Licenças',
  'Despesas de Canteiro', 'Administração', 'Imprevisto', 'Outro',
];

// ── Tooltip do gráfico ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload?: { fullName: string; Orçado: number; Realizado: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const orcado   = payload.find(p => p.name === 'Orçado')?.value   ?? 0;
  const realizado = payload.find(p => p.name === 'Realizado')?.value ?? 0;
  const desvio   = realizado - orcado;
  const fullName  = payload[0]?.payload?.fullName || label;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs min-w-[200px] space-y-2">
      <p className="font-semibold text-foreground truncate max-w-[220px]">{fullName}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: '#AFA9EC' }} className="font-medium">Orçado</span>
          <span className="font-bold tabular-nums">{formatCurrencyShort(orcado)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: realizado > orcado ? '#A32D2D' : '#534AB7' }} className="font-medium">Realizado</span>
          <span className="font-bold tabular-nums">{formatCurrencyShort(realizado)}</span>
        </div>
      </div>
      {orcado > 0 && (
        <div className="pt-1 border-t border-border/50">
          <div className="flex justify-between gap-4">
            <span className={desvio > 0 ? 'text-[#A32D2D] font-medium' : 'text-emerald-600 font-medium'}>Desvio</span>
            <span className={`font-bold tabular-nums ${desvio > 0 ? 'text-[#A32D2D]' : 'text-emerald-600'}`}>
              {desvio > 0 ? '+' : ''}{Math.round((desvio / orcado) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ChartCard: gráfico de distribuição por etapa com largura medida por ref ──

interface ChartEntry {
  name: string;
  fullName: string;
  Orçado: number;
  Realizado: number;
}

function ChartCard({ data }: { data: ChartEntry[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--color-border-secondary)',
      borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm font-semibold">Distribuição por etapa</p>
      </div>
      <div ref={wrapperRef} style={{ padding: '4px 16px 12px' }}>
        {width > 0 && (
          <BarChart data={data} width={width - 32} height={160} barGap={3} barCategoryGap="28%" margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyShort(v)} width={60} />
            <ReTooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: 4 }} />
            <Bar dataKey="Orçado" fill="#AFA9EC" radius={[4, 4, 0, 0]} minPointSize={3} />
            <Bar dataKey="Realizado" radius={[4, 4, 0, 0]} minPointSize={3}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.Realizado > entry.Orçado ? '#A32D2D' : '#534AB7'} />
              ))}
            </Bar>
          </BarChart>
        )}
      </div>
    </div>
  );
}

// ── Modal Registrar Custo ──────────────────────────────────────────────────────

interface RegistrarCustoModalProps {
  open: boolean;
  onClose: () => void;
  obraId: string;
  companyId: string;
  etapas: { id: string; nome: string }[];
  onSaved: () => void;
}

function RegistrarCustoModal({ open, onClose, obraId, companyId, etapas, onSaved }: RegistrarCustoModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    descricao: '',
    categoria: '',
    etapa_id: '',
    quantidade: '',
    valor_unitario: '',
    valor: '',
    fornecedor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    observacoes: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  // Auto-calcular valor total quando quantidade × unitário mudam
  useEffect(() => {
    const q = parseFloat(form.quantidade);
    const u = parseFloat(form.valor_unitario);
    if (!isNaN(q) && !isNaN(u)) {
      setForm(prev => ({ ...prev, valor: (q * u).toFixed(2) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.quantidade, form.valor_unitario]);

  const handleSave = async () => {
    if (!form.descricao.trim() || !form.valor) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha descrição e valor total.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from('custo_real_itens') as any).insert({
      obra_id: obraId,
      company_id: companyId,
      descricao: form.descricao.trim(),
      categoria: form.categoria || null,
      etapa_id: form.etapa_id || null,
      quantidade: form.quantidade ? parseFloat(form.quantidade) : null,
      valor_unitario: form.valor_unitario ? parseFloat(form.valor_unitario) : null,
      valor: parseFloat(form.valor),
      fornecedor: form.fornecedor || null,
      data: form.data || null,
      observacoes: form.observacoes || null,
      origem: 'manual',
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao registrar custo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Custo registrado', description: form.descricao });
      onSaved();
      onClose();
      setForm({ descricao: '', categoria: '', etapa_id: '', quantidade: '', valor_unitario: '', valor: '', fornecedor: '', data: format(new Date(), 'yyyy-MM-dd'), observacoes: '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Registrar Custo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Descrição */}
          <div className="space-y-1">
            <Label className="text-xs">Descrição *</Label>
            <Input value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Compra de cimento CP-II" className="h-8 text-sm" />
          </div>

          {/* Categoria + Etapa */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={form.categoria} onValueChange={v => set('categoria', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_LANCAMENTO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etapa (opcional)</Label>
              <Select value={form.etapa_id} onValueChange={v => set('etapa_id', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sem etapa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem etapa (custo indireto)</SelectItem>
                  {etapas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Qtd + V.Unit + V.Total */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" min="0" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} placeholder="—" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor unit. (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.valor_unitario} onChange={e => set('valor_unitario', e.target.value)} placeholder="—" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor total * (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" className="h-8 text-sm font-semibold" />
            </div>
          </div>

          {/* Fornecedor + Data */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Fornecedor</Label>
              <Input value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)} placeholder="Nome do fornecedor" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.data} onChange={e => set('data', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Notas adicionais…" className="text-sm min-h-[60px] resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props { obraId: string; isActive?: boolean; onKpisReady?: (kpis: PageKPI[]) => void; }

export default function CustoRealTab({ obraId, isActive = true, onKpisReady }: Props) {
  const { getOrcamento } = useOrcamento();
  const { company } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();

  // Listen for external "registrar custo" trigger from global header
  useEffect(() => {
    if (searchParams.get('registrar') === '1') {
      setModalOpen(true);
      setSearchParams(prev => { prev.delete('registrar'); return prev; }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEtapas, setExpandedEtapas] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // ── Portal target removed — lift-state-up via onKpisReady ─────────────────

  // ── Buscar as duas fontes ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: pags }, { data: itens }] = await Promise.all([
      (supabase.from('pagamentos') as any)
        .select('id, descricao, valor_pago, valor_previsto, data_vencimento, etapa_id, etapa_orcamento, fornecedor')
        .eq('obra_id', obraId)
        .eq('status', 'pago'),
      (supabase.from('custo_real_itens') as any)
        .select('id, descricao, valor, data, fornecedor, categoria, etapa_id, etapa_nome, origem, pagamento_id')
        .eq('obra_id', obraId)
        // Não mostrar os gerados automaticamente como "pagamento_vinculado" duplicado — esses já aparecem via pagamentos
        .neq('origem', 'pagamento_vinculado'),
    ]);

    const normalized: Lancamento[] = [
      ...((pags || []) as unknown[]).map((p) => {
        const row = p as { id: string; descricao: string; valor_pago?: number; valor_previsto?: number; data_vencimento?: string; etapa_id?: string; etapa_orcamento?: string; fornecedor?: string };
        return {
          id: row.id,
          tipo: 'pagamento' as TipoLancamento,
          descricao: row.descricao,
          valor: Number(row.valor_pago ?? row.valor_previsto ?? 0),
          data: row.data_vencimento,
          fornecedor: row.fornecedor ?? null,
          categoria: null,
          etapa_id: row.etapa_id ?? null,
          etapa_nome: row.etapa_orcamento ?? null,
          origem: null,
        };
      }),
      ...((itens || []) as unknown[]).map((i) => {
        const row = i as { id: string; descricao: string; valor?: number; data?: string; fornecedor?: string; categoria?: string; etapa_id?: string; etapa_nome?: string; origem?: string };
        return {
          id: row.id,
          tipo: 'lancamento' as TipoLancamento,
          descricao: row.descricao,
          valor: Number(row.valor ?? 0),
          data: row.data,
          fornecedor: row.fornecedor ?? null,
          categoria: row.categoria ?? null,
          etapa_id: row.etapa_id ?? null,
          etapa_nome: row.etapa_nome ?? null,
          origem: row.origem ?? null,
        };
      }),
    ];

    setLancamentos(normalized);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { fetchData(); }, [fetchData, refresh]);

  // ── Orçamento por etapa ──────────────────────────────────────────────────────
  const orcamento = getOrcamento(obraId);
  const categoriasOrc = useMemo(() => orcamento?.etapas || [], [orcamento]);

  // ── Build etapas ─────────────────────────────────────────────────────────────
  const { etapas, etapasOrcamento } = useMemo(() => {
    // Map etapas do orçamento por ID e por nome (fallback para pagamentos sem FK)
    const orcById = new Map(categoriasOrc.map(c => [c.id, c]));

    // Agrupar lancamentos por etapa_id (null → indireto)
    const porEtapa = new Map<string | null, Lancamento[]>();
    porEtapa.set(null, []);

    for (const l of lancamentos) {
      const key = l.etapa_id ?? null;
      if (!porEtapa.has(key)) porEtapa.set(key, []);
      porEtapa.get(key)!.push(l);
    }

    const resultado: EtapaFinanceiro[] = [];

    // Base nas etapas do orçamento
    for (const cat of categoriasOrc) {
      const pags = porEtapa.get(cat.id) || [];
      const realizado = pags.reduce((s, l) => s + l.valor, 0);
      const orcado = (cat as { precoTotal?: number }).precoTotal ?? 0;
      const desvio = realizado - orcado;
      const desvioPercent = orcado > 0 ? Math.round((desvio / orcado) * 100) : 0;
      resultado.push({ id: cat.id, nome: cat.nome, orcado, realizado, desvio, desvioPercent, lancamentos: pags });
      porEtapa.delete(cat.id);
    }

    // Etapas sem cadastro no orçamento (FK não encontrada)
    for (const [etapaId, pags] of porEtapa) {
      if (etapaId === null) continue; // indiretos tratados depois
      const realizado = pags.reduce((s, l) => s + l.valor, 0);
      const nomeEtapa = pags[0]?.etapa_nome || `Etapa (${etapaId?.slice(0, 8)})`;
      resultado.push({ id: etapaId, nome: nomeEtapa, orcado: 0, realizado, desvio: realizado, desvioPercent: 100, lancamentos: pags });
    }

    resultado.sort((a, b) => b.realizado - a.realizado);

    // Indiretos (sem etapa)
    const indiretos = porEtapa.get(null) || [];

    return {
      etapas: resultado,
      etapasOrcamento: categoriasOrc.map(c => ({ id: c.id, nome: c.nome })),
    };
  }, [lancamentos, categoriasOrc]);

  // Indiretos separados
  const indiretos = useMemo(
    () => lancamentos.filter(l => !l.etapa_id),
    [lancamentos]
  );
  const totalIndiretos = useMemo(() => indiretos.reduce((s, l) => s + l.valor, 0), [indiretos]);

  // ── KPIs globais ─────────────────────────────────────────────────────────────
  const totalOrcado = useMemo(() => etapas.reduce((s, e) => s + e.orcado, 0), [etapas]);
  const totalRealizado = useMemo(() => etapas.reduce((s, e) => s + e.realizado, 0) + totalIndiretos, [etapas, totalIndiretos]);
  const totalDesvio = totalRealizado - totalOrcado;
  const pctExecutado = totalOrcado > 0 ? Math.min(100, Math.round((totalRealizado / totalOrcado) * 100)) : 0;

  // ── Chart data ────────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    // Incluir etapas com orcado>0 OU realizado>0 para o gráfico sempre refletir a realidade
    const comDados = etapas.filter(e => e.orcado > 0 || e.realizado > 0);
    // Se nenhuma etapa tem dados do orçamento (categoriasOrc vazio), usar lançamentos agrupados por etapa_nome
    if (comDados.length === 0 && lancamentos.length > 0) {
      const porNome = new Map<string, number>();
      for (const l of lancamentos) {
        if (!l.etapa_id && !l.etapa_nome) continue;
        const key = l.etapa_nome || l.etapa_id || 'Sem etapa';
        porNome.set(key, (porNome.get(key) || 0) + l.valor);
      }
      return Array.from(porNome.entries())
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([nome, realizado]) => ({
          name: nome.length > 18 ? nome.slice(0, 16) + '…' : nome,
          fullName: nome,
          Orçado: 0,
          Realizado: realizado,
        }));
    }
    return comDados
      .slice(0, 10)
      .map(e => ({
        name: e.nome.length > 18 ? e.nome.slice(0, 16) + '…' : e.nome,
        fullName: e.nome,
        Orçado: e.orcado,
        Realizado: e.realizado,
      }));
  }, [etapas, lancamentos]);

  const toggleEtapa = (id: string) => {
    setExpandedEtapas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── KPI lift-state-up ──────────────────────────────────────────────────────
  // IMPORTANTE: deve ficar ANTES de qualquer early return para não violar Rules of Hooks
  useEffect(() => {
    if (!isActive || !onKpisReady || loading) return;
    const desvioPctVal = totalOrcado > 0 ? (totalDesvio / totalOrcado) * 100 : 0;
    onKpisReady([
      { id: 'orcado', label: 'Orçado total', value: formatCurrency(totalOrcado),
        icon: <DollarSign style={{ width: 14, height: 14, color: '#534AB7' }} />,
        tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7', main: true },
      { id: 'realizado', label: 'Realizado', value: formatCurrency(totalRealizado),
        icon: <Receipt style={{ width: 14, height: 14, color: totalRealizado > 0 ? '#3B6D11' : '#888' }} />,
        tint: totalRealizado > 0 ? '#EAF3DE' : undefined,
        valueColor: totalRealizado > 0 ? '#3B6D11' : undefined },
      { id: 'desvio', label: 'Desvio', value: `${totalDesvio > 0 ? '+' : ''}${desvioPctVal.toFixed(1)}%`,
        icon: totalDesvio > 0
          ? <AlertTriangle style={{ width: 14, height: 14, color: '#A32D2D' }} />
          : totalDesvio < 0
          ? <CheckCircle2 style={{ width: 14, height: 14, color: '#3B6D11' }} />
          : <Minus style={{ width: 14, height: 14, color: '#888' }} />,
        sublabel: totalDesvio > 0 ? 'acima do orçado' : totalDesvio < 0 ? 'abaixo do orçado' : 'dentro do orçado',
        tint: totalDesvio > 0 ? '#FCEBEB' : totalDesvio < 0 ? '#EAF3DE' : undefined,
        valueColor: totalDesvio > 0 ? '#A32D2D' : totalDesvio < 0 ? '#3B6D11' : undefined,
        labelColor: totalDesvio > 0 ? '#A32D2D' : totalDesvio < 0 ? '#3B6D11' : undefined },
      { id: 'indiretos', label: 'Indiretos', value: formatCurrency(totalIndiretos),
        icon: <Wallet style={{ width: 14, height: 14, color: totalIndiretos > 0 ? '#854F0B' : '#888' }} />,
        tint: totalIndiretos > 0 ? '#FAEEDA' : undefined,
        valueColor: totalIndiretos > 0 ? '#854F0B' : undefined },
      { id: 'pct', label: '% executado', value: `${pctExecutado}%`,
        icon: <TrendingUp style={{ width: 14, height: 14, color: '#1E5A8D' }} />,
        tint: '#E6F1FB',
        progress: pctExecutado },
    ]);
  }, [isActive, loading, totalOrcado, totalRealizado, totalDesvio, totalIndiretos, pctExecutado, onKpisReady]);

  // ── Empty state ───────────────────────────────────────────────────────────────
  
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
        <div className="h-64 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    );
  }


  return (
    <>
      <div className="flex flex-col gap-6 p-4 animate-in fade-in duration-300 h-full overflow-auto bg-[var(--color-background-secondary)]">
        {/* ── Tabela por Etapa ─────────────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 12,
        overflow: 'clip',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-sm font-semibold">Detalhamento por Etapa</p>
        </div>

        {etapas.length === 0 && indiretos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <DollarSign className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-base font-semibold text-foreground">Sem custos registrados</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Marque pagamentos como pagos ou registre custos manualmente para ver a análise de custo real.
            </p>
            <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Registrar primeiro custo
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[1fr_110px_110px_90px_70px_28px] gap-2 px-3 py-2 bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Etapa</span>
              <span className="text-right">Orçado</span>
              <span className="text-right">Realizado</span>
              <span className="text-right">Desvio</span>
              <span className="text-right">%</span>
              <span />
            </div>

            {/* Linhas das etapas */}
            {etapas.map(etapa => {
              const key = etapa.id ?? etapa.nome;
              const expanded = expandedEtapas.has(key);
              const semOrcamento = etapa.orcado === 0;
              const acima = etapa.desvio > 0;
              const abaixo = etapa.desvio < 0 && !semOrcamento;

              return (
                <div key={key} className="border-b border-border/60 last:border-0">
                  <button
                    onClick={() => toggleEtapa(key)}
                    className="w-full grid grid-cols-[1fr_110px_110px_90px_70px_28px] gap-2 px-3 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors items-center"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {etapa.lancamentos.length > 0
                        ? expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <span className="w-3.5 shrink-0" />
                      }
                      <span className="font-medium truncate">{etapa.nome}</span>
                      {semOrcamento && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-500/40 shrink-0">sem orç.</Badge>
                      )}
                    </div>
                    <span className="text-right text-xs tabular-nums text-muted-foreground">
                      {etapa.orcado > 0 ? formatCurrencyShort(etapa.orcado) : '—'}
                    </span>
                    <span className="text-right text-xs font-medium tabular-nums">
                      {formatCurrencyShort(etapa.realizado)}
                    </span>
                    <span className={cn('text-right text-xs tabular-nums font-medium', acima ? 'text-red-600' : abaixo ? 'text-emerald-600' : 'text-muted-foreground')}>
                      {etapa.desvio !== 0 ? (etapa.desvio > 0 ? '+' : '') + formatCurrencyShort(etapa.desvio) : '—'}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      {etapa.orcado > 0 ? (
                        <>
                          {acima && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                          {abaixo && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                          <span className={cn('text-[11px] font-bold tabular-nums', acima ? 'text-red-600' : abaixo ? 'text-emerald-600' : 'text-foreground')}>
                            {Math.abs(etapa.desvioPercent)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex justify-center">
                      {etapa.lancamentos.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">{etapa.lancamentos.length}</Badge>
                      )}
                    </div>
                  </button>

                  {/* Accordion — lançamentos desta etapa */}
                  {expanded && etapa.lancamentos.length > 0 && (
                    <div className="bg-muted/20 border-t border-border/40">
                      {etapa.lancamentos.map(l => (
                        <div key={l.id} className="grid grid-cols-[1fr_auto] gap-2 px-6 py-2 border-b border-border/30 last:border-0 text-xs">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{l.descricao}</p>
                              {/* Badge diferenciando tipo */}
                              {l.tipo === 'pagamento' ? (
                                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                                  Pagamento
                                </Badge>
                              ) : (
                                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
                                  Lançamento
                                </Badge>
                              )}
                              {l.categoria && (
                                <span className="text-muted-foreground">{l.categoria}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground mt-0.5 flex-wrap">
                              {l.fornecedor && <span className="truncate max-w-[140px]">{l.fornecedor}</span>}
                              {l.fornecedor && l.data && <span>·</span>}
                              {l.data && <span>{format(parseISO(l.data), 'dd/MM/yy')}</span>}
                            </div>
                          </div>
                          <span className="font-semibold tabular-nums text-right shrink-0 self-center">
                            {formatCurrency(l.valor)}
                          </span>
                        </div>
                      ))}
                      {/* Subtotal */}
                      <div className="flex justify-between px-6 py-2 bg-muted/40">
                        <span className="text-xs text-muted-foreground font-medium">Subtotal ({etapa.lancamentos.length} lançamentos)</span>
                        <span className="text-xs font-bold tabular-nums">{formatCurrency(etapa.realizado)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Linha Custos Indiretos */}
            {indiretos.length > 0 && (
              <div className="border-t border-border/60">
                <button
                  onClick={() => toggleEtapa('__indiretos__')}
                  className="w-full grid grid-cols-[1fr_110px_110px_90px_70px_28px] gap-2 px-3 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors items-center bg-amber-50/30 dark:bg-amber-950/10"
                >
                  <div className="flex items-center gap-2">
                    {expandedEtapas.has('__indiretos__')
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    }
                    <Wallet className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="font-medium text-amber-700">Custos Indiretos</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-500/40">sem etapa</Badge>
                  </div>
                  <span className="text-right text-xs tabular-nums text-muted-foreground">—</span>
                  <span className="text-right text-xs font-medium tabular-nums text-amber-700">{formatCurrencyShort(totalIndiretos)}</span>
                  <span className="text-right text-xs text-muted-foreground">—</span>
                  <span className="text-right text-xs text-muted-foreground">—</span>
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">{indiretos.length}</Badge>
                  </div>
                </button>

                {expandedEtapas.has('__indiretos__') && (
                  <div className="bg-muted/20 border-t border-border/40">
                    {indiretos.map(l => (
                      <div key={l.id} className="grid grid-cols-[1fr_auto] gap-2 px-6 py-2 border-b border-border/30 last:border-0 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{l.descricao}</p>
                            {l.tipo === 'pagamento' ? (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Pagamento</Badge>
                            ) : (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">Lançamento</Badge>
                            )}
                            {l.categoria && <span className="text-muted-foreground">{l.categoria}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                            {l.fornecedor && <span className="truncate max-w-[140px]">{l.fornecedor}</span>}
                            {l.data && <><span>·</span><span>{format(parseISO(l.data), 'dd/MM/yy')}</span></>}
                          </div>
                        </div>
                        <span className="font-semibold tabular-nums text-right shrink-0 self-center">{formatCurrency(l.valor)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-6 py-2 bg-muted/40">
                      <span className="text-xs text-muted-foreground font-medium">Subtotal indiretos</span>
                      <span className="text-xs font-bold tabular-nums">{formatCurrency(totalIndiretos)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Total geral */}
            <div className="grid grid-cols-[1fr_110px_110px_90px_70px_28px] gap-2 px-3 py-2.5 bg-muted/60 border-t-2 border-border text-sm font-bold">
              <span>Total</span>
              <span className="text-right tabular-nums">{formatCurrencyShort(totalOrcado)}</span>
              <span className="text-right tabular-nums text-emerald-700">{formatCurrencyShort(totalRealizado)}</span>
              <span className={cn('text-right tabular-nums', totalDesvio > 0 ? 'text-red-600' : totalDesvio < 0 ? 'text-emerald-600' : '')}>
                {totalDesvio !== 0 ? (totalDesvio > 0 ? '+' : '') + formatCurrencyShort(totalDesvio) : '—'}
              </span>
              <span className="text-right tabular-nums">{pctExecutado}%</span>
              <span />
            </div>
          </div>
        )}

        {/* ── Gráfico por Etapa ─────────────────────────────────────────── */}
        {chartData.length > 0 && (
          <ChartCard data={chartData} />
        )}

      </div>

      {/* ── Modal Registrar Custo ─────────────────────────────────────────── */}
      <RegistrarCustoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        obraId={obraId}
        companyId={company?.id || ''}
        etapas={etapasOrcamento}
        onSaved={() => setRefresh(r => r + 1)}
      />
    </div>
    </>
  );
}
