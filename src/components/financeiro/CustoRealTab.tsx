/**
 * CustoRealTab — Sprint 2
 *
 * Duas fontes de dados:
 *   1. `pagamentos` com status = 'pago' (vinculados à obra)
 *   2. `custo_real_itens` (lançamentos manuais + origem automática)
 *
 * Merge por etapa_id. Entradas sem etapa → "Custos Indiretos".
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePortalTarget } from '@/hooks/usePortalTarget';
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
  ResponsiveContainer, Cell, Legend,
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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold text-foreground truncate max-w-[200px]">{label}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
          <span className="font-bold tabular-nums">{formatCurrencyShort(entry.value)}</span>
        </div>
      ))}
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
    if (!isNaN(q) && !isNaN(u)) set('valor', (q * u).toFixed(2));
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

interface Props { obraId: string; }

export default function CustoRealTab({ obraId }: Props) {
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

  // ── Portal target (must be before any early return — Rules of Hooks) ─────────
  const kpiPortalTarget = usePortalTarget('financeiro-kpi-portal');

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
      ...((pags || []) as any[]).map((p: any) => ({
        id: p.id,
        tipo: 'pagamento' as TipoLancamento,
        descricao: p.descricao,
        valor: Number(p.valor_pago ?? p.valor_previsto ?? 0),
        data: p.data_vencimento,
        fornecedor: p.fornecedor ?? null,
        categoria: null,
        etapa_id: p.etapa_id ?? null,
        etapa_nome: p.etapa_orcamento ?? null,
        origem: null,
      })),
      ...((itens || []) as any[]).map((i: any) => ({
        id: i.id,
        tipo: 'lancamento' as TipoLancamento,
        descricao: i.descricao,
        valor: Number(i.valor ?? 0),
        data: i.data,
        fornecedor: i.fornecedor ?? null,
        categoria: i.categoria ?? null,
        etapa_id: i.etapa_id ?? null,
        etapa_nome: i.etapa_nome ?? null,
        origem: i.origem,
      })),
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
      const orcado = (cat as any).precoTotal || 0;
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
  const chartData = useMemo(() =>
    etapas
      .filter(e => e.orcado > 0 || e.realizado > 0)
      .slice(0, 10)
      .map(e => ({
        name: e.nome.length > 18 ? e.nome.slice(0, 16) + '…' : e.nome,
        fullName: e.nome,
        Orçado: e.orcado,
        Realizado: e.realizado,
      })),
  [etapas]);

  const toggleEtapa = (id: string) => {
    setExpandedEtapas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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

  const desvioPct = totalOrcado > 0 ? (totalDesvio / totalOrcado) * 100 : 0;
  const kpiBar = (
    <div className="flex w-full overflow-x-auto border-b-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] shrink-0">
      <div className="px-[20px] py-[14px] min-w-[160px] border-r-[0.5px] border-[var(--color-border-tertiary)] bg-[#F3F2FD] flex flex-col justify-center">
        <p className="text-[10px] font-medium text-[#534AB7] tracking-wider uppercase">Orçado total</p>
        <p className="text-[22px] font-medium text-[#3C3489] tabular-nums leading-tight mt-1">{formatCurrency(totalOrcado)}</p>
      </div>
      <div className="px-[16px] py-[14px] border-r-[0.5px] border-[var(--color-border-tertiary)] flex flex-col justify-center min-w-[130px]">
        <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider">Realizado</p>
        <p className="text-[15px] font-medium text-[var(--color-text-primary)] tabular-nums mt-1">{formatCurrency(totalRealizado)}</p>
      </div>
      <div className="px-[16px] py-[14px] border-r-[0.5px] border-[var(--color-border-tertiary)] flex flex-col justify-center min-w-[120px]">
        <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider">Desvio</p>
        <p className={cn("text-[15px] font-medium tabular-nums mt-1", totalDesvio > 0 ? "text-[#A32D2D]" : totalDesvio < 0 ? "text-[#3B6D11]" : "text-[var(--color-text-primary)]")}>
          {totalDesvio > 0 ? '+' : ''}{desvioPct.toFixed(1)}%
        </p>
        <p className={cn("text-[10px] leading-tight mt-0.5", totalDesvio > 0 ? "text-[#A32D2D]" : totalDesvio < 0 ? "text-[#3B6D11]" : "text-[var(--color-text-secondary)]")}>
          {totalDesvio > 0 ? "acima do orçado" : totalDesvio < 0 ? "abaixo do orçado" : "dentro do orçado"}
        </p>
      </div>
      <div className="px-[16px] py-[14px] border-r-[0.5px] border-[var(--color-border-tertiary)] flex flex-col justify-center min-w-[130px]">
        <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider flex items-center gap-1"><Wallet className="h-[10px] w-[10px]" /> Indiretos</p>
        <p className="text-[15px] font-medium text-[var(--color-text-primary)] tabular-nums mt-1">{formatCurrency(totalIndiretos)}</p>
      </div>
      <div className="px-[16px] py-[14px] flex flex-col justify-center min-w-[150px]">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider">% executado</p>
          <span className="text-[12px] font-medium text-[var(--color-text-primary)] tabular-nums">{pctExecutado}%</span>
        </div>
        <div className="h-[3px] w-full bg-[var(--color-border-secondary)] rounded-full overflow-hidden mt-2">
          <div className="h-full rounded-full bg-[#534AB7] transition-all duration-500" style={{ width: `${pctExecutado}%` }} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {kpiPortalTarget && createPortal(kpiBar, kpiPortalTarget)}
      <div className="flex flex-col gap-6 p-4 animate-in fade-in duration-300 h-full overflow-auto bg-[var(--color-background-primary)]">
        {/* ── Gráfico ──────────────────────────────────────────────────────── */}
        {chartData.length > 0 && (
          <div className="order-2 mb-8">
            <p className="text-[12px] text-[var(--color-text-secondary)] mb-3">Distribuição por etapa</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} barGap={2} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyShort(v)} width={60} />
                <ReTooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Orçado" fill="#AFA9EC" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Realizado" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.Realizado > entry.Orçado ? '#A32D2D' : '#3C3489'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      {/* ── Tabela por Etapa ─────────────────────────────────────────────── */}
      <div className="order-1 space-y-1">
        <p className="text-sm font-semibold mb-2">Detalhamento por Etapa</p>

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
          <div className="rounded-lg border border-border overflow-hidden">
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
