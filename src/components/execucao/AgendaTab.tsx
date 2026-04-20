/**
 * AgendaTab — wrapper de AgendaObraPage para uso dentro do ExecucaoCentral
 * Remove o header próprio e o seletor de obra pois o contexto já está estabelecido
 */
import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isBefore, startOfDay, addDays, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Plus, CalendarDays, CheckCircle2, Clock, Pencil, Trash2,
  AlertTriangle, Play, Calendar, Filter,
} from 'lucide-react';
import ObraCalendarView from '@/components/painel/ObraCalendarView';
import AgendaTimelineView from '@/components/painel/AgendaTimelineView';
import ViewModeSwitcher, { ViewMode } from '@/components/painel/ViewModeSwitcher';
import { toast } from '@/hooks/use-toast';
import { usePersistentPageState } from '@/hooks/usePersistentPageState';

// ── Types (copiados de AgendaObraPage para isolamento) ─────────────────────────
type AgendaTipo = 'execucao' | 'entrega_material' | 'instalacao' | 'vistoria' | 'ensaio' | 'reuniao' | 'medicao' | 'administrativo' | 'fornecedor' | 'outro';
type AgendaStatus = 'programado' | 'confirmado' | 'em_andamento' | 'concluido' | 'atrasado' | 'cancelado';
type AgendaPrioridade = 'baixa' | 'media' | 'alta';

interface AgendaItem {
  id: string; obra_id: string; titulo: string; tipo: AgendaTipo;
  descricao: string | null; data_programada: string; hora_programada: string | null;
  data_finalizacao: string | null; responsavel: string | null; status: AgendaStatus;
  prioridade: AgendaPrioridade; local: string | null; alerta_ativo: boolean;
  antecedencia_alerta_em_dias: number | null; created_at: string;
}

const tipoLabels: Record<AgendaTipo, string> = {
  execucao: 'Execução', entrega_material: 'Entrega de Material', instalacao: 'Instalação',
  vistoria: 'Vistoria', ensaio: 'Ensaio', reuniao: 'Reunião', medicao: 'Medição',
  administrativo: 'Administrativo', fornecedor: 'Fornecedor', outro: 'Outro',
};
const statusLabels: Record<AgendaStatus, string> = {
  programado: 'Programado', confirmado: 'Confirmado', em_andamento: 'Em Andamento',
  concluido: 'Concluído', atrasado: 'Atrasado', cancelado: 'Cancelado',
};
const statusColors: Record<AgendaStatus, string> = {
  programado: 'bg-primary/10 text-primary border-0',
  confirmado: 'bg-emerald-500/10 text-emerald-600 border-0',
  em_andamento: 'bg-amber-500/10 text-amber-600 border-0',
  concluido: 'bg-muted text-muted-foreground border-0',
  atrasado: 'bg-red-500/10 text-red-600 border-0',
  cancelado: 'bg-muted text-muted-foreground/50 border-0',
};
const prioridadeLabels: Record<AgendaPrioridade, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta',
};
const prioridadeColors: Record<AgendaPrioridade, string> = {
  baixa: 'bg-muted text-muted-foreground border-0',
  media: 'bg-amber-500/10 text-amber-600 border-0',
  alta: 'bg-red-500/10 text-red-600 border-0',
};
const statusIcons: Record<AgendaStatus, React.ReactNode> = {
  programado: <Clock className="h-5 w-5 text-primary" />,
  confirmado: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  em_andamento: <Play className="h-5 w-5 text-amber-500" />,
  concluido: <CheckCircle2 className="h-5 w-5 text-muted-foreground" />,
  atrasado: <AlertTriangle className="h-5 w-5 text-red-500" />,
  cancelado: <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />,
};
const emptyForm = {
  titulo: '', tipo: 'execucao' as AgendaTipo, descricao: '',
  data_programada: '', hora_programada: '', responsavel: '',
  status: 'programado' as AgendaStatus, prioridade: 'media' as AgendaPrioridade,
  local: '', alerta_ativo: false, antecedencia_alerta_em_dias: '',
};

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  obraId: string;
}

export default function AgendaTab({ obraId }: Props) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = usePersistentPageState<ViewMode>('agenda:viewMode', 'lista', obraId);
  const [search, setSearch] = usePersistentPageState<string>('agenda:search', '', obraId);
  const [filterStatus, setFilterStatus] = usePersistentPageState<string>('agenda:filterStatus', '', obraId);
  const [filterAtrasados, setFilterAtrasados] = usePersistentPageState<boolean>('agenda:filterAtrasados', false, obraId);
  const [filterProximos, setFilterProximos] = usePersistentPageState<boolean>('agenda:filterProximos', false, obraId);

  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('obra_agenda').select('*').eq('obra_id', obraId)
      .order('data_programada', { ascending: true });
    if (!error && data) setItems(data as AgendaItem[]);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getEffectiveStatus = (item: AgendaItem): AgendaStatus => {
    if (item.status === 'concluido' || item.status === 'cancelado') return item.status;
    if (isBefore(parseISO(item.data_programada), today)) return 'atrasado';
    return item.status;
  };

  const itemsWithStatus = items.map(i => ({ ...i, _effectiveStatus: getEffectiveStatus(i) }));
  const hojeCount = itemsWithStatus.filter(i => isToday(parseISO(i.data_programada)) && !['concluido', 'cancelado'].includes(i._effectiveStatus)).length;
  const prox7Count = itemsWithStatus.filter(i => { const d = parseISO(i.data_programada); return d >= today && d <= in7Days && !['concluido', 'cancelado'].includes(i._effectiveStatus); }).length;
  const atrasadosCount = itemsWithStatus.filter(i => i._effectiveStatus === 'atrasado').length;
  const concluidosCount = itemsWithStatus.filter(i => i._effectiveStatus === 'concluido').length;

  const filtered = itemsWithStatus
    .filter(i => !search || i.titulo.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !filterStatus || i._effectiveStatus === filterStatus)
    .filter(i => !filterAtrasados || i._effectiveStatus === 'atrasado')
    .filter(i => !filterProximos || (() => { const d = parseISO(i.data_programada); return d >= today && d <= in7Days; })());

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: AgendaItem) => {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo, tipo: item.tipo, descricao: item.descricao || '',
      data_programada: item.data_programada, hora_programada: item.hora_programada || '',
      responsavel: item.responsavel || '', status: item.status, prioridade: item.prioridade,
      local: item.local || '', alerta_ativo: item.alerta_ativo,
      antecedencia_alerta_em_dias: item.antecedencia_alerta_em_dias?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.titulo || !form.data_programada) { toast({ title: 'Preencha título e data.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload: any = {
        titulo: form.titulo, tipo: form.tipo, descricao: form.descricao || null,
        data_programada: form.data_programada, hora_programada: form.hora_programada || null,
        responsavel: form.responsavel || null, status: form.status,
        prioridade: form.prioridade, local: form.local || null,
        alerta_ativo: form.alerta_ativo,
        antecedencia_alerta_em_dias: form.antecedencia_alerta_em_dias ? parseInt(form.antecedencia_alerta_em_dias) : null,
        data_finalizacao: form.status === 'concluido' ? new Date().toISOString() : null,
      };
      if (editingId) {
        const { error } = await supabase.from('obra_agenda').update(payload).eq('id', editingId);
        if (error) { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Evento atualizado!' });
      } else {
        const { error } = await supabase.from('obra_agenda').insert({ ...payload, obra_id: obraId });
        if (error) { toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Evento criado!' });
      }
      setDialogOpen(false); fetchItems();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const { error } = await supabase.from('obra_agenda').delete().eq('id', deleteConfirmId);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Evento excluído.' }); setDeleteConfirmId(null); fetchItems();
  };

  const cycleStatus = async (item: AgendaItem) => {
    const order: AgendaStatus[] = ['programado', 'confirmado', 'em_andamento', 'concluido'];
    const idx = order.indexOf(item.status);
    const next = order[(idx + 1) % order.length];
    const payload: any = { status: next, data_finalizacao: next === 'concluido' ? new Date().toISOString() : null };
    await supabase.from('obra_agenda').update(payload).eq('id', item.id);
    fetchItems();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar evento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs w-[160px]"
            />
          </div>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={filterAtrasados ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1"
            onClick={() => { setFilterAtrasados(!filterAtrasados); setFilterProximos(false); }}>
            <AlertTriangle className="h-3 w-3" /> Atrasados {atrasadosCount > 0 && `(${atrasadosCount})`}
          </Button>
          <Button variant={filterProximos ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1"
            onClick={() => { setFilterProximos(!filterProximos); setFilterAtrasados(false); }}>
            <Calendar className="h-3 w-3" /> Próximos {prox7Count > 0 && `(${prox7Count})`}
          </Button>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Hoje', value: hojeCount, color: 'text-primary' },
          { label: 'Próx. 7d', value: prox7Count, color: 'text-foreground' },
          { label: 'Atrasados', value: atrasadosCount, color: 'text-red-600' },
          { label: 'Concluídos', value: concluidosCount, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center p-2.5 rounded-xl border border-border bg-card">
            <p className={cn('text-xl font-bold', color)}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'calendario' ? (
        <ObraCalendarView obraId={obraId} sources={['agenda']} fetchFromDb={true} />
      ) : viewMode === 'timeline' ? (
        loading ? <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          : <AgendaTimelineView items={filtered as any} />
      ) : loading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Criar Primeiro Evento
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const es = item._effectiveStatus;
            return (
              <Card key={item.id} className={cn('transition-colors',
                es === 'atrasado' && 'border-red-500/30 bg-red-500/[0.02]',
                isToday(parseISO(item.data_programada)) && es !== 'atrasado' && 'border-primary/30 bg-primary/[0.02]',
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <button onClick={() => cycleStatus(item)} className="shrink-0" title="Alterar status">
                          {statusIcons[es]}
                        </button>
                        <span className={cn('font-medium text-foreground',
                          ['concluido', 'cancelado'].includes(es) && 'line-through text-muted-foreground'
                        )}>{item.titulo}</span>
                        <Badge variant="secondary" className={statusColors[es]}>{statusLabels[es]}</Badge>
                        <Badge variant="secondary" className={prioridadeColors[item.prioridade]}>{prioridadeLabels[item.prioridade]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{tipoLabels[item.tipo]}</Badge>
                      </div>
                      {item.descricao && <p className="text-sm text-muted-foreground ml-7 line-clamp-2">{item.descricao}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 ml-7 mt-1 text-xs text-muted-foreground">
                        <span className={cn(es === 'atrasado' && 'text-red-600 font-medium')}>
                          {es === 'atrasado' ? '⚠ Atrasado — ' : ''}
                          {format(parseISO(item.data_programada), 'dd/MM/yyyy')}
                          {item.hora_programada && ` às ${item.hora_programada.slice(0, 5)}`}
                        </span>
                        {item.responsavel && <span>Resp: {item.responsavel}</span>}
                        {item.local && <span>Local: {item.local}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!['concluido', 'cancelado'].includes(es) && (
                        <button onClick={async () => {
                          await supabase.from('obra_agenda').update({ status: 'concluido', data_finalizacao: new Date().toISOString() }).eq('id', item.id);
                          toast({ title: `"${item.titulo}" concluído!` }); fetchItems();
                        }} className="p-1.5 rounded-md hover:bg-emerald-500/10" title="Concluir">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </button>
                      )}
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-accent" title="Editar">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(item.id)} className="p-1.5 rounded-md hover:bg-red-500/10" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
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
            <DialogTitle>{editingId ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            <DialogDescription>{editingId ? 'Atualize os dados do evento.' : 'Cadastre um novo evento na agenda da obra.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Programada *</Label>
                <Input type="date" value={form.data_programada} onChange={e => setForm(f => ({ ...f, data_programada: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora (opcional)</Label>
                <Input type="time" value={form.hora_programada} onChange={e => setForm(f => ({ ...f, hora_programada: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as AgendaTipo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v as AgendaPrioridade }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(prioridadeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as AgendaStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome" />
              </div>
              <div className="space-y-1.5">
                <Label>Local</Label>
                <Input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} placeholder="Local do evento" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.alerta_ativo} onCheckedChange={v => setForm(f => ({ ...f, alerta_ativo: v }))} id="alerta" />
                <Label htmlFor="alerta" className="cursor-pointer text-sm">Alerta ativo</Label>
              </div>
              {form.alerta_ativo && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Antecedência (dias)</Label>
                  <Input type="number" min={1} className="w-20 h-8"
                    value={form.antecedencia_alerta_em_dias}
                    onChange={e => setForm(f => ({ ...f, antecedencia_alerta_em_dias: e.target.value }))} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Evento</DialogTitle>
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
