import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMonths, format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ShoppingCart, Plus, Pencil, Trash2, CalendarDays, CheckCircle2,
  Package, X, CreditCard, ChevronDown, ChevronUp, Link2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ItemPedido {
  tempId: string;
  nome: string;
  quantidade: string;
  unidade: string;
  preco_unitario: string;
}

interface Pedido {
  id: string;
  obra_id: string;
  descricao: string;
  fornecedor: string | null;
  fornecedor_id: string | null;
  etapa_id: string | null;
  itens: ItemPedido[];
  valor_estimado: number | null;
  data_entrega_prevista: string | null;
  agenda_evento_id: string | null;
  status: string;
  data_recebimento: string | null;
  recebimento_id: string | null;
  pagamento_grupo_id: string | null;
  observacoes: string | null;
  created_at: string;
}

interface Recebimento {
  id: string;
  status: string;
  tipo: string;
  fornecedor: string | null;
  data_recebimento: string;
  numero_documento: string | null;
  valor_total: number | null;
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Enviado', recebido: 'Recebido',
  parcial: 'Parcial', cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground border-0',
  enviado: 'bg-primary/10 text-primary border-0',
  recebido: 'bg-emerald-500/10 text-emerald-600 border-0',
  parcial: 'bg-amber-500/10 text-amber-600 border-0',
  cancelado: 'bg-muted text-muted-foreground/50 border-0',
};

const formaLabels: Record<string, string> = {
  boleto: 'Boleto', pix: 'PIX', cartao: 'Cartão',
  transferencia: 'Transferência', dinheiro: 'Dinheiro', outro: 'Outro',
};

function makeItem(): ItemPedido {
  return { tempId: crypto.randomUUID(), nome: '', quantidade: '', unidade: 'un', preco_unitario: '' };
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  obraId: string;
  isActive?: boolean;
  onKpiChange?: () => void;
  pedidoInicial?: {
    itens: ItemPedido[];
    fornecedor?: string;
    lista_compra_id?: string;
  } | null;
  onPedidoCriado?: (pedidoId: string) => void;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function PedidosTab({ obraId, isActive = true, onKpiChange, pedidoInicial, onPedidoCriado }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras } = useObras();
  const { getOrcamento } = useOrcamento();
  const { user } = useAuth();
  const obra = obras.find(o => o.id === obraId);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('_all');

  // Recebimentos disponíveis para vincular
  const [recebimentosDisponiveis, setRecebimentosDisponiveis] = useState<Recebimento[]>([]);
  const [vinculoDialogId, setVinculoDialogId] = useState<string | null>(null);
  const [vinculoRecebimentoId, setVinculoRecebimentoId] = useState('');
  const [vinculoAtualizarEstoque, setVinculoAtualizarEstoque] = useState(false);
  const [vinculando, setVinculando] = useState(false);

  // Form
  const [form, setForm] = useState({
    descricao: '', fornecedor: '', etapa_id: '',
    data_entrega_prevista: '', observacoes: '',
    criar_evento_agenda: true,
  });
  const [itens, setItens] = useState<ItemPedido[]>([makeItem()]);

  // Pagamento
  const [gerarPagamento, setGerarPagamento] = useState(false);
  const [formaPag, setFormaPag] = useState('pix');
  const [numParcelas, setNumParcelas] = useState(1);
  const [parcelaTipo, setParcelaTipo] = useState<'mensal' | 'custom'>('mensal');
  const [primeiraParcela, setPrimeiraParcela] = useState('');
  const [parcelas, setParcelas] = useState<{ numero: number; data: string }[]>([]);

  const orcamento = obra ? getOrcamento(obra.id) : undefined;
  const categorias = orcamento?.etapas || [];

  // Sincronizar parcelas custom quando muda numParcelas
  useEffect(() => {
    if (parcelaTipo === 'custom') {
      setParcelas(prev => {
        const next = [...prev];
        while (next.length < numParcelas) next.push({ numero: next.length + 1, data: '' });
        return next.slice(0, numParcelas);
      });
    }
  }, [numParcelas, parcelaTipo]);

  // Fetch pedidos
  const fetchPedidos = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('material_pedidos')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });
    setPedidos((data || []) as Pedido[]);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { if (isActive) fetchPedidos(); }, [fetchPedidos, isActive]);

  // Abrir form via URL ?novo=1 ou por pedidoInicial
  useEffect(() => {
    if (searchParams.get('novo') === '1' && isActive) {
      resetForm(); setDialogOpen(true);
      setSearchParams(prev => { prev.delete('novo'); return prev; }, { replace: true });
    }
  }, [searchParams, isActive]);

  useEffect(() => {
    if (pedidoInicial && isActive) {
      setItens(pedidoInicial.itens.length > 0 ? pedidoInicial.itens : [makeItem()]);
      if (pedidoInicial.fornecedor) {
        setForm(f => ({ ...f, fornecedor: pedidoInicial.fornecedor! }));
      }
      setDialogOpen(true);
    }
  }, [pedidoInicial, isActive]);

  // Fetch recebimentos para vínculo
  const fetchRecebimentosDisponiveis = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('material_recebimentos')
      .select('id, status, tipo, fornecedor, data_recebimento, numero_documento, valor_total')
      .eq('obra_id', obraId)
      .in('status', ['pendente', 'conferido'])
      .order('data_recebimento', { ascending: false });
    setRecebimentosDisponiveis((data || []) as Recebimento[]);
  }, [obraId]);

  const totalItens = useMemo(() =>
    itens.reduce((s, i) => s + (parseFloat(i.quantidade) || 0) * (parseFloat(i.preco_unitario) || 0), 0),
    [itens]
  );

  function resetForm() {
    setEditingId(null);
    setForm({ descricao: '', fornecedor: '', etapa_id: '', data_entrega_prevista: '', observacoes: '', criar_evento_agenda: true });
    setItens([makeItem()]);
    setGerarPagamento(false);
    setFormaPag('pix');
    setNumParcelas(1);
    setParcelaTipo('mensal');
    setPrimeiraParcela('');
    setParcelas([]);
  }

  function openEdit(p: Pedido) {
    setEditingId(p.id);
    setForm({
      descricao: p.descricao,
      fornecedor: p.fornecedor || '',
      etapa_id: p.etapa_id || '',
      data_entrega_prevista: p.data_entrega_prevista || '',
      observacoes: p.observacoes || '',
      criar_evento_agenda: false,
    });
    setItens(p.itens?.length ? p.itens.map(i => ({ ...i, tempId: crypto.randomUUID() })) : [makeItem()]);
    setGerarPagamento(false);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (saving) return;
    if (!form.descricao.trim()) {
      toast({ title: 'Informe a descrição do pedido.', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const validItens = itens.filter(i => i.nome.trim());
      const valorEstimado = totalItens > 0 ? totalItens : null;

      let agendaEventoId: string | null = null;

      // Criar evento na Agenda se data prevista informada
      if (!editingId && form.data_entrega_prevista && form.criar_evento_agenda) {
        const { data: ev } = await (supabase as any).from('obra_agenda').insert({
          obra_id: obraId,
          titulo: `Entrega: ${form.descricao}`,
          tipo: 'entrega_material',
          data_programada: form.data_entrega_prevista,
          status: 'programado',
          prioridade: 'media',
          origem: 'pedido',
          alerta_ativo: false,
        }).select('id').single();
        agendaEventoId = ev?.id || null;
      }

      const payload: any = {
        obra_id: obraId,
        company_id: obra?.company_id,
        descricao: form.descricao.trim(),
        fornecedor: form.fornecedor.trim() || null,
        etapa_id: form.etapa_id || null,
        itens: validItens,
        valor_estimado: valorEstimado,
        data_entrega_prevista: form.data_entrega_prevista || null,
        observacoes: form.observacoes.trim() || null,
        criado_por: user?.id || null,
        ...(agendaEventoId ? { agenda_evento_id: agendaEventoId } : {}),
        updated_at: new Date().toISOString(),
      };

      let pedidoId: string;
      if (editingId) {
        await (supabase as any).from('material_pedidos').update(payload).eq('id', editingId);
        pedidoId = editingId;
        toast({ title: 'Pedido atualizado!' });
      } else {
        const { data: np } = await (supabase as any).from('material_pedidos').insert({ ...payload, status: 'rascunho' }).select('id').single();
        pedidoId = np?.id;
        toast({ title: 'Pedido criado!' });
        
        // Atualiza a lista_compra se o pedido veio dela
        if (pedidoInicial?.lista_compra_id && pedidoId) {
            await (supabase as any)
              .from('lista_compra')
              .update({
                status: 'pedido_gerado',
                pedido_id: pedidoId,
                updated_at: new Date().toISOString()
              })
              .eq('id', pedidoInicial.lista_compra_id);
        }
        
        if (onPedidoCriado && pedidoId) {
            onPedidoCriado(pedidoId);
        }
      }

      // Gerar pagamentos parcelados
      if (!editingId && gerarPagamento && pedidoId && valorEstimado) {
        const grupoId = crypto.randomUUID();
        const valorParcela = valorEstimado / numParcelas;
        const pagamentosPayload: any[] = [];

        for (let k = 0; k < numParcelas; k++) {
          let dataVenc: string;
          if (parcelaTipo === 'mensal' && primeiraParcela) {
            dataVenc = format(addMonths(parseISO(primeiraParcela), k), 'yyyy-MM-dd');
          } else {
            dataVenc = parcelas[k]?.data || '';
          }
          pagamentosPayload.push({
            obra_id: obraId,
            company_id: obra?.company_id,
            descricao: `${form.descricao} — ${k + 1}/${numParcelas}`,
            tipo_pagamento: 'material',
            valor_previsto: valorParcela,
            data_vencimento: dataVenc || null,
            forma_pagamento: formaPag,
            fornecedor: form.fornecedor.trim() || null,
            etapa_id: form.etapa_id || null,
            status: 'previsto',
            numero_parcela: k + 1,
            total_parcelas: numParcelas,
            grupo_parcelas_id: grupoId,
            pedido_id: pedidoId,
            data_compra: new Date().toISOString().slice(0, 10),
          });
        }
        await (supabase as any).from('pagamentos').insert(pagamentosPayload);
        // Atualizar pedido com grupo de pagamento
        await (supabase as any).from('material_pedidos').update({ pagamento_grupo_id: grupoId, status: 'enviado' }).eq('id', pedidoId);
      }

      setDialogOpen(false);
      fetchPedidos();
      onKpiChange?.();
    } finally { setSaving(false); }
  }

  async function handleVincular() {
    if (!vinculoDialogId || !vinculoRecebimentoId || vinculando) return;
    setVinculando(true);
    try {
      const rec = recebimentosDisponiveis.find(r => r.id === vinculoRecebimentoId);
      const pedido = pedidos.find(p => p.id === vinculoDialogId);
      if (!rec || !pedido) return;

      // Atualizar pedido
      await (supabase as any).from('material_pedidos').update({
        status: 'recebido',
        data_recebimento: rec.data_recebimento,
        recebimento_id: rec.id,
        updated_at: new Date().toISOString(),
      }).eq('id', vinculoDialogId);

      // Atualizar recebimento
      await (supabase as any).from('material_recebimentos').update({
        status: 'vinculado',
        pedido_id: vinculoDialogId,
        atualizar_estoque: vinculoAtualizarEstoque,
        updated_at: new Date().toISOString(),
      }).eq('id', rec.id);

      // Atualizar estoque se toggle ativo
      if (vinculoAtualizarEstoque && pedido.itens?.length) {
        for (const item of pedido.itens.filter(i => i.nome.trim())) {
          // Buscar ou criar material
          const { data: existingMat } = await (supabase as any)
            .from('materiais')
            .select('id')
            .eq('obra_id', obraId)
            .ilike('nome', item.nome.trim())
            .limit(1);

          let materialId: string;
          if (existingMat?.length) {
            materialId = existingMat[0].id;
          } else {
            const { data: newMat } = await (supabase as any).from('materiais').insert({
              obra_id: obraId,
              company_id: obra?.company_id,
              nome: item.nome.trim(),
              unidade: item.unidade || 'un',
              categoria: 'Outros',
              estoque_atual: 0,
              estoque_minimo: 0,
            }).select('id').single();
            materialId = newMat?.id;
          }

          if (materialId) {
            await (supabase as any).from('movimentacoes').insert({
              obra_id: obraId,
              material_id: materialId,
              company_id: obra?.company_id,
              material_nome: item.nome.trim(),
              tipo: 'entrada',
              data: rec.data_recebimento,
              quantidade: parseFloat(item.quantidade) || 0,
              origem_destino: pedido.fornecedor || 'Pedido',
              responsavel: 'Pedido automático',
              observacoes: `Vínculo com pedido: ${pedido.descricao}`,
            });
          }
        }
      }

      toast({ title: 'Pedido vinculado ao recebimento!' });
      setVinculoDialogId(null);
      setVinculoRecebimentoId('');
      setVinculoAtualizarEstoque(false);
      fetchPedidos();
      onKpiChange?.();
    } finally { setVinculando(false); }
  }

  async function handleDelete(id: string) {
    await (supabase as any).from('material_pedidos').delete().eq('id', id);
    toast({ title: 'Pedido excluído.' });
    fetchPedidos();
    onKpiChange?.();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await (supabase as any).from('material_pedidos').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    fetchPedidos();
    onKpiChange?.();
  }

  const filtered = pedidos.filter(p => filterStatus === '_all' || p.status === filterStatus);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Toolbar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger style={{ width: 140, height: 32, fontSize: 12 }}><SelectValue placeholder="Todos status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Novo Pedido
        </Button>
      </div>

      {/* ── Lista ─── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-muted/40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Criar Primeiro Pedido
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className={cn(p.status === 'cancelado' && 'opacity-60')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm">{p.descricao}</span>
                      <Badge variant="secondary" className={statusColors[p.status]}>{statusLabels[p.status]}</Badge>
                      {p.agenda_evento_id && (
                        <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-500 gap-1">
                          <CalendarDays className="h-2.5 w-2.5" /> Agenda
                        </Badge>
                      )}
                      {p.pagamento_grupo_id && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 gap-1">
                          <CreditCard className="h-2.5 w-2.5" /> Pago
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 ml-6 text-xs text-muted-foreground">
                      {p.fornecedor && <span>Fornecedor: {p.fornecedor}</span>}
                      {p.valor_estimado && <span className="font-medium text-foreground">{fmt(p.valor_estimado)}</span>}
                      {p.data_entrega_prevista && <span>Entrega prevista: {format(parseISO(p.data_entrega_prevista), 'dd/MM/yyyy')}</span>}
                      {p.data_recebimento && <span className="text-emerald-600">Recebido: {format(parseISO(p.data_recebimento), 'dd/MM/yyyy')}</span>}
                      {p.itens?.length > 0 && <span>{p.itens.filter(i => i.nome).length} item(s)</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!['recebido', 'cancelado'].includes(p.status) && (
                      <>
                        <button
                          onClick={async () => { await fetchRecebimentosDisponiveis(); setVinculoDialogId(p.id); setVinculoRecebimentoId(''); }}
                          className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600" title="Vincular recebimento"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-accent" title="Editar">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md hover:bg-red-500/10" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Dialog Criar/Editar ─── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Pedido' : 'Novo Pedido de Material'}</DialogTitle>
            <DialogDescription>Registre os itens e condições do pedido.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Cimento CP-II — Lote 03/2026" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Nome do fornecedor" />
              </div>
              <div className="space-y-1.5">
                <Label>Etapa do orçamento</Label>
                <Select value={form.etapa_id} onValueChange={v => setForm(f => ({ ...f, etapa_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sem etapa</SelectItem>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data de entrega */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de entrega prevista</Label>
                <Input type="date" value={form.data_entrega_prevista} onChange={e => setForm(f => ({ ...f, data_entrega_prevista: e.target.value }))} />
              </div>
              {form.data_entrega_prevista && !editingId && (
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2">
                    <Switch id="agenda-sw" checked={form.criar_evento_agenda} onCheckedChange={v => setForm(f => ({ ...f, criar_evento_agenda: v }))} />
                    <Label htmlFor="agenda-sw" className="text-xs cursor-pointer">Criar evento na Agenda</Label>
                  </div>
                </div>
              )}
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens do pedido</Label>
                {totalItens > 0 && <span className="text-sm font-semibold text-primary">{fmt(totalItens)}</span>}
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-12 gap-0 bg-muted/50 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-5">Material</span>
                  <span className="col-span-2 text-center">Qtd</span>
                  <span className="col-span-2 text-center">Un.</span>
                  <span className="col-span-2 text-center">R$ unit.</span>
                  <span className="col-span-1" />
                </div>
                {itens.map((item, idx) => (
                  <div key={item.tempId} className="grid grid-cols-12 gap-1 items-center px-3 py-1.5 border-t border-border/50">
                    <div className="col-span-5">
                      <Input className="h-7 text-xs" value={item.nome} onChange={e => setItens(prev => prev.map(i => i.tempId === item.tempId ? { ...i, nome: e.target.value } : i))} placeholder="Nome do material" />
                    </div>
                    <div className="col-span-2">
                      <Input className="h-7 text-xs text-center" type="number" min="0" value={item.quantidade} onChange={e => setItens(prev => prev.map(i => i.tempId === item.tempId ? { ...i, quantidade: e.target.value } : i))} placeholder="0" />
                    </div>
                    <div className="col-span-2">
                      <Select value={item.unidade} onValueChange={v => setItens(prev => prev.map(i => i.tempId === item.tempId ? { ...i, unidade: v } : i))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['un', 'kg', 'm', 'm²', 'm³', 'saco', 'barra', 'rolo', 'l', 't', 'cx'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input className="h-7 text-xs text-center" type="number" min="0" value={item.preco_unitario} onChange={e => setItens(prev => prev.map(i => i.tempId === item.tempId ? { ...i, preco_unitario: e.target.value } : i))} placeholder="0,00" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {itens.length > 1 && (
                        <button onClick={() => setItens(prev => prev.filter(i => i.tempId !== item.tempId))} className="p-1 rounded hover:bg-red-500/10">
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setItens(prev => [...prev, makeItem()])}>
                <Plus className="h-3 w-3" /> Adicionar item
              </Button>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
            </div>

            {/* Seção Pagamento */}
            {!editingId && (
              <div className="rounded-xl border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
                  onClick={() => setGerarPagamento(!gerarPagamento)}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span>Gerar pagamento</span>
                  </div>
                  {gerarPagamento ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {gerarPagamento && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Forma de pagamento</Label>
                        <Select value={formaPag} onValueChange={setFormaPag}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(formaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Número de parcelas</Label>
                        <Input type="number" min={1} max={24} className="h-8 text-xs" value={numParcelas}
                          onChange={e => setNumParcelas(Math.max(1, parseInt(e.target.value) || 1))} />
                      </div>
                    </div>

                    {numParcelas > 1 && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setParcelaTipo('mensal')}
                            className={cn('px-3 py-1 text-xs rounded-lg border transition-colors', parcelaTipo === 'mensal' ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground')}
                          >Mensal</button>
                          <button
                            onClick={() => { setParcelaTipo('custom'); setParcelas(Array.from({ length: numParcelas }, (_, i) => ({ numero: i + 1, data: '' }))); }}
                            className={cn('px-3 py-1 text-xs rounded-lg border transition-colors', parcelaTipo === 'custom' ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground')}
                          >Datas personalizadas</button>
                        </div>

                        {parcelaTipo === 'mensal' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Data da 1ª parcela</Label>
                            <Input type="date" className="h-8 text-xs" value={primeiraParcela} onChange={e => setPrimeiraParcela(e.target.value)} />
                            {primeiraParcela && (
                              <p className="text-[11px] text-muted-foreground">
                                Parcelas: {Array.from({ length: numParcelas }, (_, k) =>
                                  format(addMonths(parseISO(primeiraParcela), k), 'dd/MM/yyyy')
                                ).join(', ')}
                              </p>
                            )}
                          </div>
                        )}

                        {parcelaTipo === 'custom' && (
                          <div className="space-y-1">
                            {parcelas.map((parc, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-16 shrink-0">Parcela {parc.numero}</span>
                                <Input type="date" className="h-7 text-xs" value={parc.data}
                                  onChange={e => setParcelas(prev => prev.map((p, i) => i === idx ? { ...p, data: e.target.value } : p))} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {numParcelas === 1 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Data de vencimento</Label>
                        <Input type="date" className="h-8 text-xs" value={primeiraParcela} onChange={e => setPrimeiraParcela(e.target.value)} />
                      </div>
                    )}

                    {totalItens > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Valor por parcela: <span className="font-semibold text-foreground">{fmt(totalItens / numParcelas)}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar pedido'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Vínculo com Recebimento ─── */}
      <Dialog open={!!vinculoDialogId} onOpenChange={v => { if (!v) { setVinculoDialogId(null); setVinculoRecebimentoId(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular a Recebimento</DialogTitle>
            <DialogDescription>Selecione o recebimento que corresponde a este pedido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {recebimentosDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum recebimento pendente de conferência.</p>
            ) : (
              <div className="space-y-2">
                {recebimentosDisponiveis.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setVinculoRecebimentoId(r.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-colors text-sm',
                      vinculoRecebimentoId === r.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{r.fornecedor || 'Fornecedor não informado'}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.tipo} · Recebido: {format(parseISO(r.data_recebimento), 'dd/MM/yyyy')}
                          {r.numero_documento && ` · Nº ${r.numero_documento}`}
                          {r.valor_total && ` · ${fmt(r.valor_total)}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {vinculoRecebimentoId && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <Switch id="estoque-sw" checked={vinculoAtualizarEstoque} onCheckedChange={setVinculoAtualizarEstoque} />
                <Label htmlFor="estoque-sw" className="text-sm cursor-pointer">
                  Atualizar estoque automaticamente com os itens do pedido
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVinculoDialogId(null); setVinculoRecebimentoId(''); }}>Cancelar</Button>
            <Button onClick={handleVincular} disabled={!vinculoRecebimentoId || vinculando}>
              {vinculando ? 'Vinculando...' : 'Vincular e marcar como recebido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
