import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useIADocumentos } from '@/hooks/useIADocumentos';
import type { DocTipo } from '@/hooks/useIADocumentos';
import IAInputButton from '@/components/ia/IAInputButton';
import NfReviewDrawer from '@/components/ia/NfReviewDrawer';
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
  PackagePlus, Plus, Eye, CheckCircle2, XCircle,
  Image, FileText, Package, X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ItemRec {
  tempId: string;
  nome: string;
  quantidade: string;
  unidade: string;
  preco_unitario: string;
}

interface Recebimento {
  id: string;
  obra_id: string;
  origem: string;
  link_id: string | null;
  nome_responsavel: string | null;
  tipo: string;
  numero_documento: string | null;
  data_documento: string | null;
  data_recebimento: string;
  foto_urls: string[];
  fornecedor: string | null;
  itens: ItemRec[];
  valor_total: number | null;
  status: string;
  pedido_id: string | null;
  observacao_interna: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente', conferido: 'Conferido',
  vinculado: 'Vinculado', rejeitado: 'Rejeitado',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-amber-500/10 text-amber-600 border-0',
  conferido: 'bg-primary/10 text-primary border-0',
  vinculado: 'bg-emerald-500/10 text-emerald-600 border-0',
  rejeitado: 'bg-muted text-muted-foreground/50 border-0',
};

const tipoLabels: Record<string, string> = {
  nota_fiscal: 'Nota Fiscal', romaneio: 'Romaneio',
  recibo: 'Recibo', outro: 'Outro',
};

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function makeItem(): ItemRec {
  return { tempId: crypto.randomUUID(), nome: '', quantidade: '', unidade: 'un', preco_unitario: '' };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  obraId: string;
  isActive?: boolean;
  onCountChange?: (count: number) => void;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function RecebimentosTab({ obraId, isActive = true, onCountChange }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras } = useObras();
  const { user } = useAuth();
  const { getMateriaisByObra, registrarMovimentacao } = useEstoque();
  const obra = obras.find(o => o.id === obraId);
  const materiais = getMateriaisByObra(obraId);

  // IA de documentos (movido do EstoqueQuickView)
  const { state: iaState, resultado, startProcessing, confirmarRecebimento, reset: iaReset, isProcessing } =
    useIADocumentos(obraId);
  const [iaReviewOpen, setIaReviewOpen] = useState(false);

  const handleIAFile = async (file: File, tipo: DocTipo) => {
    setIaReviewOpen(true);
    await startProcessing(file, tipo);
  };

  const handleIAVoice = async (audioBlob: Blob) => {
    const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
    setIaReviewOpen(true);
    await startProcessing(file, 'audio');
  };

  const handleIAConfirm = async (itensRevisados: any[]) => {
    // Cria um recebimento via IA
    await (supabase as any).from('material_recebimentos').insert({
      obra_id: obraId,
      company_id: obra?.company_id,
      origem: 'manual',
      tipo: 'nota_fiscal',
      data_recebimento: new Date().toISOString().slice(0, 10),
      itens: itensRevisados.map((i: any) => ({
        tempId: crypto.randomUUID(),
        nome: i.nome || i.material_nome || '',
        quantidade: String(i.quantidade || ''),
        unidade: i.unidade || 'un',
        preco_unitario: String(i.preco_unitario || ''),
      })),
      status: 'conferido',
      processado_por: user?.id || null,
      dados_ia: { fonte: 'ia', itens_originais: itensRevisados },
    });
    // Também atualiza estoque via hook existente
    await confirmarRecebimento(itensRevisados, 'estoque', registrarMovimentacao);
    setIaReviewOpen(false);
    iaReset();
    fetchRecebimentos();
  };

  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('_all');

  // Form manual
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: 'nota_fiscal', numero_documento: '',
    data_documento: '', data_recebimento: new Date().toISOString().slice(0, 10),
    fornecedor: '', valor_total: '', observacao_interna: '',
  });
  const [itens, setItens] = useState<ItemRec[]>([makeItem()]);

  // Drawer de revisão (link público)
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({
    fornecedor: '', numero_documento: '',
    data_recebimento: '', valor_total: '',
    observacao_interna: '',
  });
  const [reviewItens, setReviewItens] = useState<ItemRec[]>([]);
  const [reviewSaving, setReviewSaving] = useState(false);

  const reviewItem = recebimentos.find(r => r.id === reviewId);

  // Fetch
  const fetchRecebimentos = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('material_recebimentos')
      .select('*')
      .eq('obra_id', obraId)
      .order('data_recebimento', { ascending: false });
    const list = (data || []) as Recebimento[];
    setRecebimentos(list);
    const pendentes = list.filter(r => r.status === 'pendente').length;
    onCountChange?.(pendentes);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { if (isActive) fetchRecebimentos(); }, [fetchRecebimentos, isActive]);

  // Abrir form via URL ?novo=1
  useEffect(() => {
    if (searchParams.get('novo') === '1' && isActive) {
      resetForm(); setDialogOpen(true);
      setSearchParams(prev => { prev.delete('novo'); return prev; }, { replace: true });
    }
  }, [searchParams, isActive]);

  function resetForm() {
    setForm({ tipo: 'nota_fiscal', numero_documento: '', data_documento: '', data_recebimento: new Date().toISOString().slice(0, 10), fornecedor: '', valor_total: '', observacao_interna: '' });
    setItens([makeItem()]);
  }

  function openReview(r: Recebimento) {
    setReviewId(r.id);
    setReviewForm({
      fornecedor: r.fornecedor || '',
      numero_documento: r.numero_documento || '',
      data_recebimento: r.data_recebimento,
      valor_total: r.valor_total?.toString() || '',
      observacao_interna: r.observacao_interna || '',
    });
    setReviewItens(r.itens?.length ? r.itens.map(i => ({ ...i, tempId: crypto.randomUUID() })) : [makeItem()]);
  }

  async function handleSaveManual() {
    if (saving) return;
    if (!form.data_recebimento) {
      toast({ title: 'Informe a data de recebimento.', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const validItens = itens.filter(i => i.nome.trim());
      await (supabase as any).from('material_recebimentos').insert({
        obra_id: obraId,
        company_id: obra?.company_id,
        origem: 'manual',
        tipo: form.tipo,
        numero_documento: form.numero_documento.trim() || null,
        data_documento: form.data_documento || null,
        data_recebimento: form.data_recebimento,
        fornecedor: form.fornecedor.trim() || null,
        itens: validItens,
        valor_total: form.valor_total ? parseFloat(form.valor_total) : null,
        observacao_interna: form.observacao_interna.trim() || null,
        status: 'conferido',
        processado_por: user?.id || null,
      });
      toast({ title: 'Recebimento registrado!' });
      setDialogOpen(false);
      resetForm();
      fetchRecebimentos();
    } finally { setSaving(false); }
  }

  async function handleReviewSave() {
    if (!reviewId || reviewSaving) return;
    setReviewSaving(true);
    try {
      const validItens = reviewItens.filter(i => i.nome.trim());
      await (supabase as any).from('material_recebimentos').update({
        fornecedor: reviewForm.fornecedor.trim() || null,
        numero_documento: reviewForm.numero_documento.trim() || null,
        data_recebimento: reviewForm.data_recebimento,
        valor_total: reviewForm.valor_total ? parseFloat(reviewForm.valor_total) : null,
        observacao_interna: reviewForm.observacao_interna.trim() || null,
        itens: validItens,
        status: 'conferido',
        processado_por: user?.id || null,
        updated_at: new Date().toISOString(),
      }).eq('id', reviewId);
      toast({ title: 'Recebimento conferido!' });
      setReviewId(null);
      fetchRecebimentos();
    } finally { setReviewSaving(false); }
  }

  async function handleReject(id: string) {
    await (supabase as any).from('material_recebimentos').update({ status: 'rejeitado', updated_at: new Date().toISOString() }).eq('id', id);
    toast({ title: 'Recebimento rejeitado.' });
    setReviewId(null);
    fetchRecebimentos();
  }

  async function handleDelete(id: string) {
    await (supabase as any).from('material_recebimentos').delete().eq('id', id);
    toast({ title: 'Recebimento excluído.' });
    fetchRecebimentos();
  }

  const filtered = recebimentos.filter(r => filterStatus === '_all' || r.status === filterStatus);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Toolbar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger style={{ width: 140, height: 32, fontSize: 12 }}><SelectValue placeholder="Todos status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos status</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* IA de recebimento */}
          <IAInputButton
            size="sm"
            onFileSelected={handleIAFile}
            onVoiceReady={handleIAVoice}
            disabled={isProcessing}
          />
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> Registrar Manualmente
          </Button>
        </div>
      </div>

      {/* ── Lista ─── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-muted/40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <PackagePlus className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum recebimento encontrado.</p>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Registrar Primeiro Recebimento
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.id} className={cn(r.status === 'rejeitado' && 'opacity-60')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Thumbnail foto */}
                    {r.foto_urls?.length > 0 ? (
                      <img src={r.foto_urls[0]} alt="foto" className="h-12 w-12 rounded-lg object-cover shrink-0 border border-border" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">{tipoLabels[r.tipo] || r.tipo}</span>
                        <Badge variant="secondary" className={statusColors[r.status]}>{statusLabels[r.status]}</Badge>
                        {r.origem === 'link_publico' && (
                          <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-500">Campo</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        {r.fornecedor && <span>{r.fornecedor}</span>}
                        {r.nome_responsavel && <span>Por: {r.nome_responsavel}</span>}
                        <span>Recebido: {format(parseISO(r.data_recebimento), 'dd/MM/yyyy')}</span>
                        {r.numero_documento && <span>Nº {r.numero_documento}</span>}
                        {r.valor_total && <span className="font-medium text-foreground">{fmt(r.valor_total)}</span>}
                        {r.pedido_id && <span className="text-emerald-600">Vinculado a pedido</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {r.status !== 'rejeitado' && (
                      <button onClick={() => openReview(r)} className="p-1.5 rounded-md hover:bg-primary/10" title="Revisar">
                        <Eye className="h-3.5 w-3.5 text-primary" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-md hover:bg-red-500/10" title="Excluir">
                      <X className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Dialog Registro Manual ─── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
            <DialogDescription>Insira os dados do documento recebido.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de documento</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº do documento</Label>
                <Input className="h-8 text-sm" value={form.numero_documento} onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))} placeholder="Ex: 001234" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de recebimento *</Label>
                <Input type="date" className="h-8 text-sm" value={form.data_recebimento} onChange={e => setForm(f => ({ ...f, data_recebimento: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data do documento</Label>
                <Input type="date" className="h-8 text-sm" value={form.data_documento} onChange={e => setForm(f => ({ ...f, data_documento: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Input className="h-8 text-sm" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Nome do fornecedor" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor total</Label>
                <Input type="number" className="h-8 text-sm" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} placeholder="0,00" />
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <Label>Itens recebidos (opcional)</Label>
              {itens.map(item => (
                <div key={item.tempId} className="flex gap-2 items-center">
                  <Input className="h-7 text-xs flex-1" value={item.nome} onChange={e => setItens(p => p.map(i => i.tempId === item.tempId ? { ...i, nome: e.target.value } : i))} placeholder="Material" />
                  <Input type="number" className="h-7 text-xs w-16" value={item.quantidade} onChange={e => setItens(p => p.map(i => i.tempId === item.tempId ? { ...i, quantidade: e.target.value } : i))} placeholder="Qtd" />
                  <Select value={item.unidade} onValueChange={v => setItens(p => p.map(i => i.tempId === item.tempId ? { ...i, unidade: v } : i))}>
                    <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['un', 'kg', 'm', 'm²', 'm³', 'saco', 'l', 'cx'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {itens.length > 1 && (
                    <button onClick={() => setItens(p => p.filter(i => i.tempId !== item.tempId))} className="p-1">
                      <X className="h-3 w-3 text-red-500" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setItens(p => [...p, makeItem()])}>
                <Plus className="h-3 w-3" /> Adicionar item
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Observação interna</Label>
              <Textarea value={form.observacao_interna} onChange={e => setForm(f => ({ ...f, observacao_interna: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
            <Button onClick={handleSaveManual} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Drawer de Revisão (link público) ─── */}
      <Dialog open={!!reviewId} onOpenChange={v => { if (!v) setReviewId(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar Recebimento</DialogTitle>
            <DialogDescription>
              {reviewItem?.origem === 'link_publico'
                ? `Enviado por ${reviewItem.nome_responsavel || 'funcionário'} via link público.`
                : 'Confirme os dados do recebimento.'}
            </DialogDescription>
          </DialogHeader>

          {reviewItem && (
            <div className="space-y-4 py-2">
              {/* Fotos */}
              {reviewItem.foto_urls?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {reviewItem.foto_urls.map((url, i) => (
                    <img key={i} src={url} alt={`foto ${i + 1}`} className="h-32 w-32 object-cover rounded-lg border border-border shrink-0" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fornecedor</Label>
                  <Input className="h-8 text-sm" value={reviewForm.fornecedor} onChange={e => setReviewForm(f => ({ ...f, fornecedor: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nº documento</Label>
                  <Input className="h-8 text-sm" value={reviewForm.numero_documento} onChange={e => setReviewForm(f => ({ ...f, numero_documento: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de recebimento</Label>
                  <Input type="date" className="h-8 text-sm" value={reviewForm.data_recebimento} onChange={e => setReviewForm(f => ({ ...f, data_recebimento: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor total</Label>
                  <Input type="number" className="h-8 text-sm" value={reviewForm.valor_total} onChange={e => setReviewForm(f => ({ ...f, valor_total: e.target.value }))} />
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-2">
                <Label className="text-xs">Itens</Label>
                {reviewItens.map(item => (
                  <div key={item.tempId} className="flex gap-2 items-center">
                    <Input className="h-7 text-xs flex-1" value={item.nome} onChange={e => setReviewItens(p => p.map(i => i.tempId === item.tempId ? { ...i, nome: e.target.value } : i))} placeholder="Material" />
                    <Input type="number" className="h-7 text-xs w-16" value={item.quantidade} onChange={e => setReviewItens(p => p.map(i => i.tempId === item.tempId ? { ...i, quantidade: e.target.value } : i))} placeholder="Qtd" />
                    {reviewItens.length > 1 && (
                      <button onClick={() => setReviewItens(p => p.filter(i => i.tempId !== item.tempId))} className="p-1">
                        <X className="h-3 w-3 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setReviewItens(p => [...p, makeItem()])}>
                  <Plus className="h-3 w-3" /> Adicionar item
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observação interna</Label>
                <Textarea value={reviewForm.observacao_interna} onChange={e => setReviewForm(f => ({ ...f, observacao_interna: e.target.value }))} rows={2} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => reviewId && handleReject(reviewId)}>
              <XCircle className="h-4 w-4 mr-1.5" /> Rejeitar
            </Button>
            <Button variant="outline" onClick={() => setReviewId(null)}>Cancelar</Button>
            <Button onClick={handleReviewSave} disabled={reviewSaving}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {reviewSaving ? 'Salvando...' : 'Conferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── NF Review Drawer (IA) ─── */}
      <NfReviewDrawer
        open={iaReviewOpen}
        resultado={resultado}
        materiaisObra={materiais.map(m => ({ id: m.id, nome: m.nome, unidade: m.unidade }))}
        loading={iaState === 'uploading' || iaState === 'processing'}
        onClose={() => { setIaReviewOpen(false); iaReset(); }}
        onConfirm={handleIAConfirm}
        onReprocess={() => { iaReset(); }}
      />
    </div>
  );
}
