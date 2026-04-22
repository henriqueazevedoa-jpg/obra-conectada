import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/untyped';
import type { ContratoComMetricas, ContratoMedicao, ContratoMedicaoItem, ModalidadeMedicao } from '@/types/contrato';
import { ChevronRight, ChevronLeft, Plus, Trash2, SendHorizonal, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ─── Types for local item state ───────────────────────────────────────────────

interface EtapaRow {
  id: string;
  nome: string;
  codigo: string;
  preco_total: number;
  pct_anterior: number;  // from previous medicoes
  pct_periodo: string;   // user input
}

interface ComposicaoRow {
  id: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  quantidade_contrato: number;
  qtd_anterior: number;
  qtd_periodo: string; // user input
}

interface LivreRow {
  key: string; // local key for React
  descricao: string;
  unidade: string;
  quantidade: string;
  preco_unitario: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MedicaoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoComMetricas | null;
  /** Called after a successful save so the parent can refresh */
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MedicaoDrawer({ open, onOpenChange, contrato, onSaved }: MedicaoDrawerProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Step 1 fields ──────────────────────────────────────────────────────────
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [numeroMedicao, setNumeroMedicao] = useState(1);
  const [acumuladoAnteriorPct, setAcumuladoAnteriorPct] = useState(0);
  const [acumuladoAnteriorValor, setAcumuladoAnteriorValor] = useState(0);

  // ── Step 2 — modalidade-specific rows ─────────────────────────────────────
  const [etapas, setEtapas] = useState<EtapaRow[]>([]);
  const [composicoes, setComposicoes] = useState<ComposicaoRow[]>([]);
  const [livreRows, setLivreRows] = useState<LivreRow[]>([{ key: '0', descricao: '', unidade: 'un', quantidade: '', preco_unitario: '' }]);

  // ── Load initial data on open ──────────────────────────────────────────────
  const loadDados = useCallback(async () => {
    if (!contrato) return;
    setLoading(true);
    const modalidade = contrato.modalidade_medicao as ModalidadeMedicao;

    // Next numero_medicao
    const { data: maxData } = await (supabase as any)
      .from('contratos_medicoes')
      .select('numero_medicao')
      .eq('contrato_id', contrato.id)
      .order('numero_medicao', { ascending: false })
      .limit(1);
    const nextNum = maxData && maxData.length > 0 ? (maxData[0].numero_medicao + 1) : 1;
    setNumeroMedicao(nextNum);

    // Acumulado anterior (sum valor_periodo from approved/paid)
    const { data: medAnts } = await (supabase as any)
      .from('contratos_medicoes')
      .select('valor_periodo, percentual_acumulado')
      .eq('contrato_id', contrato.id)
      .in('status', ['aprovado', 'pago'])
      .order('numero_medicao', { ascending: false })
      .limit(1);

    const prevValor = contrato.total_medido;
    const prevPct = valorContrato > 0
      ? (prevValor / valorContrato) * 100
      : 0;
    setAcumuladoAnteriorPct(prevPct);
    setAcumuladoAnteriorValor(prevValor);

    // Load etapas para modalidade 'percentual'
    if (modalidade === 'percentual') {
      const { data: ets } = await (supabase as any)
        .from('orcamento_categorias')
        .select('id, codigo, nome, preco_total')
        .eq('obra_id', contrato.obra_id)
        .order('codigo');

      // Fetch medição IDs anteriores aprovadas/pagas (com guard de array vazio)
      const { data: medIds } = await (supabase as any)
        .from('contratos_medicoes')
        .select('id')
        .eq('contrato_id', contrato.id)
        .in('status', ['aprovado', 'pago']);

      const ids = (medIds || []).map((m: any) => m.id);

      let itenAnts: any[] = [];
      if (ids.length > 0) {
        const { data } = await (supabase as any)
          .from('contratos_medicao_itens')
          .select('descricao, percentual_acumulado')
          .in('medicao_id', ids);
        itenAnts = data || [];
      }

      const pctMap: Record<string, number> = {};
      itenAnts.forEach((row: any) => {
        pctMap[row.descricao] = Number(row.percentual_acumulado || 0);
      });

      setEtapas((ets || []).map((e: any) => ({
        id: e.id,
        nome: e.nome,
        codigo: e.codigo,
        preco_total: Number(e.preco_total),
        pct_anterior: pctMap[e.nome] ?? 0,
        pct_periodo: '',
      })));
    }

    // Load composições para modalidade 'quantidade'
    if (modalidade === 'quantidade') {
      const { data: comps } = await (supabase as any)
        .from('orcamento_composicoes')
        .select('id, descricao, unidade, preco_unitario, quantidade')
        .in('etapa_id',
          (await (supabase as any)
            .from('orcamento_categorias')
            .select('id')
            .eq('obra_id', contrato.obra_id)
          ).data?.map((e: any) => e.id) ?? []
        );

      // Fetch medição IDs anteriores aprovadas/pagas (com guard de array vazio)
      const { data: medIds2 } = await (supabase as any)
        .from('contratos_medicoes')
        .select('id')
        .eq('contrato_id', contrato.id)
        .in('status', ['aprovado', 'pago']);

      const ids2 = (medIds2 || []).map((m: any) => m.id);

      let itenAnts2: any[] = [];
      if (ids2.length > 0) {
        const { data } = await (supabase as any)
          .from('contratos_medicao_itens')
          .select('descricao, quantidade_acumulada')
          .in('medicao_id', ids2);
        itenAnts2 = data || [];
      }

      const qtdMap: Record<string, number> = {};
      (itenAnts2 || []).forEach((row: any) => {
        qtdMap[row.descricao] = Number(row.quantidade_acumulada || 0);
      });

      setComposicoes((comps || []).map((c: any) => ({
        id: c.id,
        descricao: c.descricao,
        unidade: c.unidade ?? 'un',
        preco_unitario: Number(c.preco_unitario ?? 0),
        quantidade_contrato: Number(c.quantidade ?? 0),
        qtd_anterior: qtdMap[c.descricao] ?? 0,
        qtd_periodo: '',
      })));
    }

    setLoading(false);
  }, [contrato]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setDataInicio('');
      setDataFim('');
      setDataEmissao('');
      setObservacoes('');
      setLivreRows([{ key: '0', descricao: '', unidade: 'un', quantidade: '', preco_unitario: '' }]);
      loadDados();
    }
  }, [open, loadDados]);

  // ── Calculations ───────────────────────────────────────────────────────────

  const modalidade = contrato?.modalidade_medicao as ModalidadeMedicao | undefined;
  const valorContrato = Number(contrato?.valor_atual ?? 0);

  const valorPeriodo = useMemo(() => {
    if (!contrato) return 0;
    if (modalidade === 'percentual') {
      return etapas.reduce((acc, e) => {
        const pct = Math.min(
          Math.max(0, Number(e.pct_periodo) || 0),
          100 - e.pct_anterior
        );
        return acc + (e.preco_total * pct) / 100;
      }, 0);
    }
    if (modalidade === 'quantidade') {
      return composicoes.reduce((acc, c) => {
        const qtd = Number(c.qtd_periodo) || 0;
        return acc + qtd * c.preco_unitario;
      }, 0);
    }
    if (modalidade === 'livre') {
      return livreRows.reduce((acc, r) => {
        const qtd = Number(r.quantidade) || 0;
        const p = Number(r.preco_unitario) || 0;
        return acc + qtd * p;
      }, 0);
    }
    return 0;
  }, [modalidade, etapas, composicoes, livreRows, contrato]);

  const valorAcumuladoTotal = acumuladoAnteriorValor + valorPeriodo;
  const pctAcumulado = valorContrato > 0 ? Math.min(100, (valorAcumuladoTotal / valorContrato) * 100) : 0;
  const pctPeriodo = valorContrato > 0 ? (valorPeriodo / valorContrato) * 100 : 0;

  // ── Save helpers ───────────────────────────────────────────────────────────

  const buildItens = (): Omit<ContratoMedicaoItem, 'id' | 'medicao_id'>[] => {
    if (modalidade === 'percentual') {
      return etapas
        .filter(e => Number(e.pct_periodo) > 0)
        .map(e => {
          const pct = Math.min(Number(e.pct_periodo), 100 - e.pct_anterior);
          return {
            descricao: e.nome,
            unidade: '%',
            percentual_anterior: e.pct_anterior,
            percentual_periodo: pct,
            percentual_acumulado: e.pct_anterior + pct,
            valor_periodo: (e.preco_total * pct) / 100,
          };
        });
    }
    if (modalidade === 'quantidade') {
      return composicoes
        .filter(c => Number(c.qtd_periodo) > 0)
        .map(c => {
          const qtd = Number(c.qtd_periodo);
          return {
            descricao: c.descricao,
            unidade: c.unidade,
            preco_unitario: c.preco_unitario,
            quantidade_contrato: c.quantidade_contrato,
            quantidade_periodo: qtd,
            quantidade_acumulada: c.qtd_anterior + qtd,
            valor_periodo: qtd * c.preco_unitario,
          };
        });
    }
    // livre
    return livreRows
      .filter(r => r.descricao.trim() && Number(r.quantidade) > 0)
      .map(r => ({
        descricao: r.descricao,
        unidade: r.unidade,
        quantidade_periodo: Number(r.quantidade),
        preco_unitario: Number(r.preco_unitario),
        valor_periodo: Number(r.quantidade) * Number(r.preco_unitario),
      }));
  };

  const handleSave = async (emitir = false) => {
    if (!contrato) return;
    setSaving(true);
    try {
      const itens = buildItens();

      const medicaoPayload = {
        obra_id: contrato.obra_id,
        contrato_id: contrato.id,
        numero_medicao: numeroMedicao,
        data_referencia: dataInicio || new Date().toISOString().slice(0, 10),
        data_emissao: emitir ? (dataEmissao || new Date().toISOString().slice(0, 10)) : (dataEmissao || null),
        status: emitir ? 'emitido' : 'rascunho',
        percentual_acumulado_anterior: acumuladoAnteriorPct,
        percentual_periodo: pctPeriodo,
        percentual_acumulado: acumuladoAnteriorPct + pctPeriodo,
        valor_periodo: valorPeriodo,
        valor_acumulado: valorAcumuladoTotal,
        observacoes: observacoes || null,
      };

      const { data: medicaoData, error: medicaoErr } = await (supabase as any)
        .from('contratos_medicoes')
        .insert(medicaoPayload)
        .select('id')
        .single();

      if (medicaoErr) throw medicaoErr;

      if (itens.length > 0) {
        const itenPayload = itens.map(it => ({ ...it, medicao_id: medicaoData.id }));
        const { error: itenErr } = await (supabase as any)
          .from('contratos_medicao_itens')
          .insert(itenPayload);
        if (itenErr) throw itenErr;
      }

      toast({
        title: emitir ? 'Medição emitida' : 'Rascunho salvo',
        description: `Medição nº ${numeroMedicao} ${emitir ? 'emitida' : 'salva como rascunho'} com sucesso.`,
      });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (!contrato) return null;

  const canGoStep2 = dataInicio.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-[560px] w-full p-0 overflow-hidden border-l border-border/60">

        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase tracking-widest">{contrato.numero}</span>
            <span className="text-xs text-muted-foreground/40">—</span>
            <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0 h-4">
              {contrato.modalidade_medicao}
            </Badge>
          </div>
          <SheetTitle>Nova Medição #{numeroMedicao}</SheetTitle>
          <SheetDescription>
            {contrato.contratado} · {fmt(valorContrato)}
          </SheetDescription>

          {/* Stepper */}
          <div className="flex items-center gap-0 mt-3">
            {[{ n: 1, label: 'Período' }, { n: 2, label: 'Itens' }].map(({ n, label }, idx) => (
              <div key={n} className="flex items-center">
                <div className="flex flex-col items-center gap-0.5">
                  <div className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    step === n ? 'bg-primary text-white' : step > n ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {n}
                  </div>
                  <span className={cn('text-[10px] font-medium', step === n ? 'text-primary' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </div>
                {idx < 1 && (
                  <div className={cn('w-16 h-0.5 mx-1 mb-4 rounded', step > 1 ? 'bg-primary/40' : 'bg-muted')} />
                )}
              </div>
            ))}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-6">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/40 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dataInicio">Início do Período *</Label>
                      <Input
                        id="dataInicio"
                        type="date"
                        value={dataInicio}
                        onChange={e => setDataInicio(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dataFim">Fim do Período</Label>
                      <Input
                        id="dataFim"
                        type="date"
                        value={dataFim}
                        onChange={e => setDataFim(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dataEmissao">Data de Emissão (opcional)</Label>
                    <Input
                      id="dataEmissao"
                      type="date"
                      value={dataEmissao}
                      onChange={e => setDataEmissao(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">Deixar em branco → preenchida automaticamente ao emitir.</p>
                  </div>

                  <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acumulado anterior</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold">{fmt(acumuladoAnteriorValor)}</p>
                        <p className="text-xs text-muted-foreground">{acumuladoAnteriorPct.toFixed(1)}% do contrato medido até agora</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">Medição #{numeroMedicao}</Badge>
                    </div>
                    <Progress value={acumuladoAnteriorPct} className="h-1.5" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="obs">Observações</Label>
                    <Textarea
                      id="obs"
                      value={observacoes}
                      onChange={e => setObservacoes(e.target.value)}
                      placeholder="Notas sobre esta medição..."
                      className="resize-none h-20"
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 2 — PERCENTUAL ── */}
              {step === 2 && modalidade === 'percentual' && (
                <div className="p-6 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    Informe o percentual executado no período para cada etapa.
                  </p>
                  {etapas.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma etapa encontrada no orçamento desta obra.
                    </div>
                  )}
                  {etapas.map((e, i) => {
                    const maxPct = 100 - e.pct_anterior;
                    const pctVal = Math.min(Number(e.pct_periodo) || 0, maxPct);
                    const valorEtapa = (e.preco_total * pctVal) / 100;
                    return (
                      <div key={e.id} className={cn(
                        'border border-border/40 rounded-xl p-4 space-y-2',
                        pctVal > 0 ? 'bg-primary/5 border-primary/20' : 'bg-card'
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{e.codigo}</p>
                            <p className="text-sm font-semibold text-foreground truncate">{e.nome}</p>
                            <p className="text-[11px] text-muted-foreground">{fmt(e.preco_total)} · Anterior: {e.pct_anterior.toFixed(1)}%</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={maxPct}
                                step={0.5}
                                value={e.pct_periodo}
                                onChange={ev => {
                                  const newEtapas = [...etapas];
                                  newEtapas[i] = { ...e, pct_periodo: ev.target.value };
                                  setEtapas(newEtapas);
                                }}
                                className="w-20 text-right h-8 text-sm"
                                placeholder="0"
                              />
                              <span className="text-sm font-medium text-muted-foreground">%</span>
                            </div>
                            {pctVal > 0 && (
                              <p className="text-[10px] text-primary font-semibold">+{fmt(valorEtapa)}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <Progress value={e.pct_anterior + pctVal} className="h-1" />
                          <div className="flex justify-between text-[9px] text-muted-foreground">
                            <span>Acumulado: {(e.pct_anterior + pctVal).toFixed(1)}%</span>
                            <span>Restante: {(maxPct - pctVal).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── STEP 2 — QUANTIDADE ── */}
              {step === 2 && modalidade === 'quantidade' && (
                <div className="p-6 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    Informe a quantidade executada no período para cada composição.
                  </p>
                  {composicoes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma composição encontrada no orçamento desta obra.
                    </div>
                  )}
                  {composicoes.map((c, i) => {
                    const qtdVal = Number(c.qtd_periodo) || 0;
                    const valor = qtdVal * c.preco_unitario;
                    return (
                      <div key={c.id} className={cn(
                        'border border-border/40 rounded-xl p-4 space-y-2',
                        qtdVal > 0 ? 'bg-primary/5 border-primary/20' : 'bg-card'
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{c.descricao}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {fmt(c.preco_unitario)}/{c.unidade} · Contrato: {c.quantidade_contrato} {c.unidade} · Anterior: {c.qtd_anterior} {c.unidade}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={c.qtd_periodo}
                                onChange={ev => {
                                  const newComps = [...composicoes];
                                  newComps[i] = { ...c, qtd_periodo: ev.target.value };
                                  setComposicoes(newComps);
                                }}
                                className="w-24 text-right h-8 text-sm"
                                placeholder="0"
                              />
                              <span className="text-xs text-muted-foreground font-medium">{c.unidade}</span>
                            </div>
                            {qtdVal > 0 && (
                              <p className="text-[10px] text-primary font-semibold">+{fmt(valor)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── STEP 2 — LIVRE ── */}
              {step === 2 && modalidade === 'livre' && (
                <div className="p-6 space-y-4">
                  <p className="text-xs text-muted-foreground font-medium">
                    Adicione os itens a serem faturados nesta medição.
                  </p>
                  <div className="space-y-3">
                    {livreRows.map((r, i) => (
                      <div key={r.key} className="border border-border/40 rounded-xl p-3 space-y-3 bg-card">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Descrição do item"
                            value={r.descricao}
                            onChange={ev => {
                              const rows = [...livreRows];
                              rows[i] = { ...r, descricao: ev.target.value };
                              setLivreRows(rows);
                            }}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setLivreRows(livreRows.filter((_, j) => j !== i))}
                            disabled={livreRows.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Unidade</Label>
                            <Input
                              value={r.unidade}
                              onChange={ev => {
                                const rows = [...livreRows];
                                rows[i] = { ...r, unidade: ev.target.value };
                                setLivreRows(rows);
                              }}
                              className="h-8 text-sm"
                              placeholder="un"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Quantidade</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={r.quantidade}
                              onChange={ev => {
                                const rows = [...livreRows];
                                rows[i] = { ...r, quantidade: ev.target.value };
                                setLivreRows(rows);
                              }}
                              className="h-8 text-sm text-right"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Preço Unit. (R$)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={r.preco_unitario}
                              onChange={ev => {
                                const rows = [...livreRows];
                                rows[i] = { ...r, preco_unitario: ev.target.value };
                                setLivreRows(rows);
                              }}
                              className="h-8 text-sm text-right"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        {Number(r.quantidade) > 0 && Number(r.preco_unitario) > 0 && (
                          <p className="text-[10px] text-primary font-semibold text-right">
                            {fmt(Number(r.quantidade) * Number(r.preco_unitario))}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed"
                    onClick={() => setLivreRows([...livreRows, { key: String(Date.now()), descricao: '', unidade: 'un', quantidade: '', preco_unitario: '' }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar Item
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── STICKY FOOTER ── */}
        <div className="shrink-0 border-t border-border/60 bg-card">
          {/* Summary bar */}
          <div className="px-5 py-3 bg-muted/30 border-b border-border/40">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor Período</p>
                <p className="font-bold text-sm text-primary">{fmt(valorPeriodo)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acumulado Total</p>
                <p className="font-bold text-sm">{fmt(valorAcumuladoTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">% do Contrato</p>
                <p className="font-bold text-sm">{pctAcumulado.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={pctAcumulado} className="h-1 mt-2" />
          </div>

          {/* Action buttons */}
          <div className="px-5 py-4 flex gap-3">
            {step === 1 ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => setStep(2)}
                  disabled={!canGoStep2}
                >
                  Próximo <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Rascunho'}
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => handleSave(true)}
                  disabled={saving || valorPeriodo <= 0}
                >
                  <SendHorizonal className="h-4 w-4" /> {saving ? 'Emitindo...' : 'Emitir'}
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
