import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose,
} from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle, ListChecks, Loader2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type PrioridadeT = 'baixa' | 'media' | 'alta';
type StatusT = 'aberta' | 'em_andamento' | 'resolvida';
type TipoT = 'documento' | 'custo' | 'pagamento' | 'diario' | 'orcamento';

interface Pendencia {
  id: string;
  obra_id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoT;
  prioridade: PrioridadeT;
  status: StatusT;
  data_limite: string | null;
  observacao_interna: string | null;
  created_at: string;
}

const tipoLabels: Record<TipoT, string> = {
  documento: 'Documento', custo: 'Custo', pagamento: 'Pagamento',
  diario: 'Diário', orcamento: 'Orçamento',
};
const prioridadeLabels: Record<PrioridadeT, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta',
};
const statusLabels: Record<StatusT, string> = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', resolvida: 'Resolvida',
};
const prioridadeBg: Record<PrioridadeT, string> = {
  baixa: 'bg-muted text-muted-foreground border-0',
  media: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  alta: 'bg-red-500/15 text-red-400 border-red-500/30',
};
const statusBg: Record<StatusT, string> = {
  aberta: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  em_andamento: 'bg-primary/15 text-primary/80 border-primary/30',
  resolvida: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const emptyForm = {
  titulo: '', descricao: '', tipo: 'documento' as TipoT,
  prioridade: 'media' as PrioridadeT, status: 'aberta' as StatusT,
  data_limite: '', observacao_interna: '',
};

// ─── PendenciasPanel ──────────────────────────────────────────────────────────

export default function PendenciasPanel({
  obraId,
  onCountChange,
}: {
  obraId: string;
  onCountChange?: (count: number) => void;
}) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const fetchPendencias = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('pendencias')
      .select('*').eq('obra_id', obraId).order('created_at', { ascending: false });
    const items = (data || []) as Pendencia[];
    setPendencias(items);
    const abertas = items.filter(p => p.status !== 'resolvida').length;
    onCountChange?.(abertas);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { fetchPendencias(); }, [fetchPendencias]);

  const today = startOfDay(new Date());
  const filtered = pendencias.filter(p => !filterStatus || p.status === filterStatus);
  const resumo = {
    abertas: pendencias.filter(p => p.status === 'aberta').length,
    vencidas: pendencias.filter(p => p.status !== 'resolvida' && p.data_limite && isBefore(parseISO(p.data_limite), today)).length,
    resolvidas: pendencias.filter(p => p.status === 'resolvida').length,
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDrawerOpen(true); };
  const openEdit = (p: Pendencia) => {
    setEditingId(p.id);
    setForm({
      titulo: p.titulo, descricao: p.descricao || '', tipo: p.tipo,
      prioridade: p.prioridade, status: p.status,
      data_limite: p.data_limite || '', observacao_interna: p.observacao_interna || '',
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo) { toast({ title: 'Preencha o título.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo, descricao: form.descricao || null,
        tipo: form.tipo, prioridade: form.prioridade, status: form.status,
        data_limite: form.data_limite || null, observacao_interna: form.observacao_interna || null,
      };
      if (editingId) {
        await supabase.from('pendencias').update(payload).eq('id', editingId);
        toast({ title: 'Pendência atualizada!' });
      } else {
        await supabase.from('pendencias').insert({ ...payload, obra_id: obraId });
        toast({ title: 'Pendência criada!' });
      }
      setDrawerOpen(false);
      fetchPendencias();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await supabase.from('pendencias').delete().eq('id', deleteConfirmId);
    toast({ title: 'Pendência excluída.' });
    setDeleteConfirmId(null);
    fetchPendencias();
  };

  const toggleStatus = async (p: Pendencia) => {
    const next: StatusT = p.status === 'aberta' ? 'em_andamento' : p.status === 'em_andamento' ? 'resolvida' : 'aberta';
    await supabase.from('pendencias').update({ status: next }).eq('id', p.id);
    fetchPendencias();
  };

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Abertas', value: resumo.abertas, color: 'text-amber-400' },
          { label: 'Vencidas', value: resumo.vencidas, color: 'text-red-400' },
          { label: 'Resolvidas', value: resumo.resolvidas, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Select value={filterStatus || 'all'} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-9 shrink-0" onClick={openCreate}>
          <Plus className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Nova Pendência</span>
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted/40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhuma pendência encontrada.</p>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Nova pendência</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const isVencida = p.status !== 'resolvida' && p.data_limite && isBefore(parseISO(p.data_limite), today);
            return (
              <div
                key={p.id}
                className={cn(
                  'border rounded-xl p-3 bg-card flex items-start gap-3 transition-colors',
                  isVencida ? 'border-red-500/30' : 'border-border'
                )}
              >
                {/* Toggle button */}
                <button onClick={() => toggleStatus(p)} className="shrink-0 mt-0.5">
                  {p.status === 'resolvida'
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    : p.status === 'em_andamento'
                    ? <Clock className="h-5 w-5 text-primary/80" />
                    : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className={cn('font-medium text-sm', p.status === 'resolvida' && 'line-through text-muted-foreground')}>
                      {p.titulo}
                    </span>
                    <Badge className={cn('text-[10px] border', statusBg[p.status])}>{statusLabels[p.status]}</Badge>
                    <Badge className={cn('text-[10px] border', prioridadeBg[p.prioridade])}>{prioridadeLabels[p.prioridade]}</Badge>
                    <Badge variant="outline" className="text-[10px]">{tipoLabels[p.tipo]}</Badge>
                  </div>
                  {p.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{p.descricao}</p>}
                  {p.data_limite && (
                    <p className={cn('text-xs mt-0.5', isVencida ? 'text-red-400 font-medium' : 'text-muted-foreground')}>
                      {isVencida ? '⚠ Vencida em ' : 'Prazo: '}
                      {format(parseISO(p.data_limite), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>

                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirmId(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer form */}
      <Drawer open={drawerOpen} onOpenChange={v => { if (!v) setDrawerOpen(false); }}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="border-b border-border pb-3">
            <DrawerTitle>{editingId ? 'Editar Pendência' : 'Nova Pendência'}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Descreva a pendência..." />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Tipo', 'tipo', tipoLabels],
                ['Prioridade', 'prioridade', prioridadeLabels],
                ['Status', 'status', statusLabels],
              ].map(([label, field, opts]) => (
                <div key={field as string} className="space-y-1.5">
                  <Label>{label as string}</Label>
                  <Select value={form[field as keyof typeof form] as string} onValueChange={v => setForm(f => ({ ...f, [field as string]: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(opts as Record<string, string>).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Data Limite</Label>
              <Input type="date" value={form.data_limite} onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação Interna</Label>
              <Textarea value={form.observacao_interna} onChange={e => setForm(f => ({ ...f, observacao_interna: e.target.value }))} rows={2} placeholder="Visível apenas para a equipe" />
            </div>
          </div>
          <DrawerFooter className="border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="w-full h-11">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : editingId ? 'Salvar' : 'Criar'}
            </Button>
            <DrawerClose asChild><Button variant="outline" className="w-full h-11">Cancelar</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pendência?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
