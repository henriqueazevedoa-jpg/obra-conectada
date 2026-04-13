import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Plus, AlertTriangle, CheckCircle2, Clock, Pencil, Trash2, Filter, ListChecks,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import NoObraState from '@/components/obras/NoObraState';

type PendenciaPrioridade = 'baixa' | 'media' | 'alta';
type PendenciaStatus = 'aberta' | 'em_andamento' | 'resolvida';
type PendenciaTipo = 'documento' | 'custo' | 'pagamento' | 'diario' | 'orcamento';

interface Pendencia {
  id: string;
  obra_id: string;
  titulo: string;
  descricao: string | null;
  tipo: PendenciaTipo;
  prioridade: PendenciaPrioridade;
  status: PendenciaStatus;
  data_limite: string | null;
  observacao_interna: string | null;
  created_at: string;
}

const tipoLabels: Record<PendenciaTipo, string> = {
  documento: 'Documento', custo: 'Custo', pagamento: 'Pagamento',
  diario: 'Diário', orcamento: 'Orçamento',
};

const prioridadeLabels: Record<PendenciaPrioridade, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta',
};

const statusLabels: Record<PendenciaStatus, string> = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', resolvida: 'Resolvida',
};

const statusColors: Record<PendenciaStatus, string> = {
  aberta: 'bg-warning/10 text-warning border-0',
  em_andamento: 'bg-primary/10 text-primary border-0',
  resolvida: 'bg-success/10 text-success border-0',
};

const prioridadeColors: Record<PendenciaPrioridade, string> = {
  baixa: 'bg-muted text-muted-foreground border-0',
  media: 'bg-warning/10 text-warning border-0',
  alta: 'bg-destructive/10 text-destructive border-0',
};

const emptyForm = {
  titulo: '', descricao: '', tipo: 'documento' as PendenciaTipo,
  prioridade: 'media' as PendenciaPrioridade, status: 'aberta' as PendenciaStatus,
  data_limite: '', observacao_interna: '',
};

export default function PendenciasPage() {
  const { obras } = useObras();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPendencias = useCallback(async () => {
    if (!obra) { setPendencias([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('pendencias')
      .select('*')
      .eq('obra_id', obra.id)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); setPendencias([]); }
    else setPendencias((data || []) as Pendencia[]);
    setLoading(false);
  }, [obra?.id]);

  useEffect(() => { fetchPendencias(); }, [fetchPendencias]);

  if (!obra) return <NoObraState title="Nenhuma obra selecionada" description="Selecione ou cadastre uma obra para gerenciar pendências." />;

  const today = startOfDay(new Date());
  const abertas = pendencias.filter(p => p.status === 'aberta');
  const vencidas = abertas.filter(p => p.data_limite && isBefore(parseISO(p.data_limite), today));
  const resolvidas = pendencias.filter(p => p.status === 'resolvida');

  const filtered = pendencias
    .filter(p => !filterStatus || p.status === filterStatus)
    .filter(p => !filterPrioridade || p.prioridade === filterPrioridade)
    .filter(p => !filterTipo || p.tipo === filterTipo);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Pendencia) => {
    setEditingId(p.id);
    setForm({
      titulo: p.titulo, descricao: p.descricao || '', tipo: p.tipo,
      prioridade: p.prioridade, status: p.status,
      data_limite: p.data_limite || '', observacao_interna: p.observacao_interna || '',
    });
    setDialogOpen(true);
  };

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (saving) return;
    if (!form.titulo) { toast({ title: 'Preencha o título.', variant: 'destructive' }); return; }
    const payload = {
      titulo: form.titulo, descricao: form.descricao || null,
      tipo: form.tipo, prioridade: form.prioridade, status: form.status,
      data_limite: form.data_limite || null, observacao_interna: form.observacao_interna || null,
    };
    if (editingId) {
      const { error } = await supabase.from('pendencias').update(payload).eq('id', editingId);
      if (error) { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Pendência atualizada!' });
    } else {
      const { error } = await supabase.from('pendencias').insert({ ...payload, obra_id: obra.id });
      if (error) { toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Pendência criada!' });
    }
    setDialogOpen(false); fetchPendencias();
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const { error } = await supabase.from('pendencias').delete().eq('id', deleteConfirmId);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Pendência excluída.' }); setDeleteConfirmId(null); fetchPendencias();
  };

  const toggleStatus = async (p: Pendencia) => {
    const next: PendenciaStatus = p.status === 'aberta' ? 'em_andamento' : p.status === 'em_andamento' ? 'resolvida' : 'aberta';
    await supabase.from('pendencias').update({ status: next }).eq('id', p.id);
    fetchPendencias();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Pendências
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={obra.id} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-full sm:w-[260px] h-9 text-sm">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo ? `${o.codigo} - ` : ''}{o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Pendência</Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-card"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Abertas</p>
          <p className="text-2xl font-bold text-warning">{abertas.length}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Vencidas</p>
          <p className="text-2xl font-bold text-destructive">{vencidas.length}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Resolvidas</p>
          <p className="text-2xl font-bold text-success">{resolvidas.length}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPrioridade} onValueChange={v => setFilterPrioridade(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(prioridadeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={v => setFilterTipo(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card"><CardContent className="p-10 text-center text-muted-foreground">
          <ListChecks className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p>Nenhuma pendência encontrada.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const isVencida = p.status !== 'resolvida' && p.data_limite && isBefore(parseISO(p.data_limite), today);
            return (
              <Card key={p.id} className={cn("shadow-card", isVencida && "border-destructive/30")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <button onClick={() => toggleStatus(p)} className="shrink-0">
                          {p.status === 'resolvida' ? <CheckCircle2 className="h-5 w-5 text-success" /> :
                           p.status === 'em_andamento' ? <Clock className="h-5 w-5 text-primary" /> :
                           <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />}
                        </button>
                        <span className={cn("font-medium text-foreground", p.status === 'resolvida' && "line-through text-muted-foreground")}>{p.titulo}</span>
                        <Badge variant="secondary" className={statusColors[p.status]}>{statusLabels[p.status]}</Badge>
                        <Badge variant="secondary" className={prioridadeColors[p.prioridade]}>{prioridadeLabels[p.prioridade]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{tipoLabels[p.tipo]}</Badge>
                      </div>
                      {p.descricao && <p className="text-sm text-muted-foreground ml-7 line-clamp-2">{p.descricao}</p>}
                      {p.data_limite && (
                        <p className={cn("text-xs ml-7 mt-1", isVencida ? "text-destructive font-medium" : "text-muted-foreground")}>
                          {isVencida ? '⚠ Vencida em ' : 'Prazo: '}{format(parseISO(p.data_limite), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-accent"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setDeleteConfirmId(p.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Pendência' : 'Nova Pendência'}</DialogTitle>
            <DialogDescription>{editingId ? 'Atualize os dados da pendência.' : 'Cadastre uma nova pendência para esta obra.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as PendenciaTipo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v as PendenciaPrioridade }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(prioridadeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as PendenciaStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Data Limite</Label>
              <Input type="date" value={form.data_limite} onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação Interna</Label>
              <Textarea value={form.observacao_interna} onChange={e => setForm(f => ({ ...f, observacao_interna: e.target.value }))} rows={2} placeholder="Visível apenas para a equipe interna" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Pendência</DialogTitle>
            <DialogDescription>Tem certeza? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
