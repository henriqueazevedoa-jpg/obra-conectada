import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isBefore, startOfDay, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
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
  Plus, CalendarDays, CheckCircle2, Clock, Pencil, Trash2, Filter, AlertTriangle,
  Play, Calendar, RotateCcw, List, BarChart3,
} from 'lucide-react';
import ObraCalendarView, { CalendarEvent } from '@/components/painel/ObraCalendarView';
import AgendaTimelineView from '@/components/painel/AgendaTimelineView';
import ViewModeSwitcher, { ViewMode } from '@/components/painel/ViewModeSwitcher';
import { toast } from '@/hooks/use-toast';
import NoObraState from '@/components/obras/NoObraState';

/* ── Tipos ── */
type AgendaTipo = 'execucao' | 'entrega_material' | 'instalacao' | 'vistoria' | 'ensaio' | 'reuniao' | 'medicao' | 'administrativo' | 'fornecedor' | 'outro';
type AgendaStatus = 'programado' | 'confirmado' | 'em_andamento' | 'concluido' | 'atrasado' | 'cancelado';
type AgendaPrioridade = 'baixa' | 'media' | 'alta';

interface AgendaItem {
  id: string;
  obra_id: string;
  titulo: string;
  tipo: AgendaTipo;
  descricao: string | null;
  data_programada: string;
  hora_programada: string | null;
  data_finalizacao: string | null;
  responsavel: string | null;
  status: AgendaStatus;
  prioridade: AgendaPrioridade;
  local: string | null;
  alerta_ativo: boolean;
  antecedencia_alerta_em_dias: number | null;
  created_at: string;
}

/* ── Labels & Colors ── */
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
  confirmado: 'bg-success/10 text-success border-0',
  em_andamento: 'bg-warning/10 text-warning border-0',
  concluido: 'bg-muted text-muted-foreground border-0',
  atrasado: 'bg-destructive/10 text-destructive border-0',
  cancelado: 'bg-muted text-muted-foreground/50 border-0',
};

const prioridadeLabels: Record<AgendaPrioridade, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta',
};

const prioridadeColors: Record<AgendaPrioridade, string> = {
  baixa: 'bg-muted text-muted-foreground border-0',
  media: 'bg-warning/10 text-warning border-0',
  alta: 'bg-destructive/10 text-destructive border-0',
};

const statusIcons: Record<AgendaStatus, React.ReactNode> = {
  programado: <Clock className="h-5 w-5 text-primary" />,
  confirmado: <CheckCircle2 className="h-5 w-5 text-success" />,
  em_andamento: <Play className="h-5 w-5 text-warning" />,
  concluido: <CheckCircle2 className="h-5 w-5 text-muted-foreground" />,
  atrasado: <AlertTriangle className="h-5 w-5 text-destructive" />,
  cancelado: <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />,
};

const emptyForm = {
  titulo: '', tipo: 'execucao' as AgendaTipo, descricao: '',
  data_programada: '', hora_programada: '', responsavel: '',
  status: 'programado' as AgendaStatus, prioridade: 'media' as AgendaPrioridade,
  local: '', alerta_ativo: false, antecedencia_alerta_em_dias: '',
};

export default function AgendaObraPage() {
  const { obras } = useObras();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('lista');

  // Filtros
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('');
  const [filterAtrasados, setFilterAtrasados] = useState(false);
  const [filterProximos, setFilterProximos] = useState(false);

  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  const fetchItems = useCallback(async () => {
    if (!obra) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('obra_agenda')
      .select('*')
      .eq('obra_id', obra.id)
      .order('data_programada', { ascending: true });
    if (error) { console.error(error); setItems([]); }
    else setItems((data || []) as AgendaItem[]);
    setLoading(false);
  }, [obra?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  if (!obra) return <NoObraState title="Nenhuma obra selecionada" description="Selecione ou cadastre uma obra para gerenciar a agenda." />;

  /* ── Helpers de status ── */
  const getEffectiveStatus = (item: AgendaItem): AgendaStatus => {
    if (item.status === 'concluido' || item.status === 'cancelado') return item.status;
    const d = parseISO(item.data_programada);
    if (isBefore(d, today)) return 'atrasado';
    return item.status;
  };

  const itemsWithStatus = items.map(i => ({ ...i, _effectiveStatus: getEffectiveStatus(i) }));

  /* ── Resumo ── */
  const hojeCount = itemsWithStatus.filter(i => {
    const d = parseISO(i.data_programada);
    return isToday(d) && i._effectiveStatus !== 'concluido' && i._effectiveStatus !== 'cancelado';
  }).length;
  const prox7Count = itemsWithStatus.filter(i => {
    const d = parseISO(i.data_programada);
    return d >= today && d <= in7Days && i._effectiveStatus !== 'concluido' && i._effectiveStatus !== 'cancelado';
  }).length;
  const atrasadosCount = itemsWithStatus.filter(i => i._effectiveStatus === 'atrasado').length;
  const concluidosCount = itemsWithStatus.filter(i => i._effectiveStatus === 'concluido').length;

  /* ── Filtro ── */
  const filtered = itemsWithStatus
    .filter(i => !search || i.titulo.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !filterStatus || i._effectiveStatus === filterStatus)
    .filter(i => !filterTipo || i.tipo === filterTipo)
    .filter(i => !filterPrioridade || i.prioridade === filterPrioridade)
    .filter(i => !filterAtrasados || i._effectiveStatus === 'atrasado')
    .filter(i => {
      if (!filterProximos) return true;
      const d = parseISO(i.data_programada);
      return d >= today && d <= in7Days;
    });

  /* ── CRUD ── */
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
    if (!form.titulo || !form.data_programada) {
      toast({ title: 'Preencha título e data programada.', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const payload: any = {
        titulo: form.titulo, tipo: form.tipo,
        descricao: form.descricao || null, data_programada: form.data_programada,
        hora_programada: form.hora_programada || null,
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
        const { error } = await supabase.from('obra_agenda').insert({ ...payload, obra_id: obra.id });
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

  const quickAction = async (item: AgendaItem, action: 'concluir' | 'reagendar') => {
    if (action === 'concluir') {
      await supabase.from('obra_agenda').update({ status: 'concluido', data_finalizacao: new Date().toISOString() }).eq('id', item.id);
      toast({ title: `"${item.titulo}" concluído!` });
    } else {
      openEdit(item);
      return;
    }
    fetchItems();
  };

  const cycleStatus = async (item: AgendaItem) => {
    const order: AgendaStatus[] = ['programado', 'confirmado', 'em_andamento', 'concluido'];
    const idx = order.indexOf(item.status);
    const next = order[(idx + 1) % order.length];
    const payload: any = { status: next };
    if (next === 'concluido') payload.data_finalizacao = new Date().toISOString();
    else payload.data_finalizacao = null;
    await supabase.from('obra_agenda').update(payload).eq('id', item.id);
    fetchItems();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Agenda da Obra
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Programação de atividades, entregas e eventos</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={obra.id} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-full sm:w-[260px] h-9 text-sm">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map((o: any) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo ? `${o.codigo} - ` : ''}{o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Evento</Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-card"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Hoje</p>
          <p className="text-2xl font-bold text-primary">{hojeCount}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Próx. 7 dias</p>
          <p className="text-2xl font-bold text-foreground">{prox7Count}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Atrasados</p>
          <p className="text-2xl font-bold text-destructive">{atrasadosCount}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Concluídos</p>
          <p className="text-2xl font-bold text-success">{concluidosCount}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Buscar título..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-[180px] h-8 text-xs"
        />
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={v => setFilterTipo(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPrioridade} onValueChange={v => setFilterPrioridade(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(prioridadeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant={filterAtrasados ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => { setFilterAtrasados(!filterAtrasados); setFilterProximos(false); }}
        >
          <AlertTriangle className="h-3 w-3" /> Atrasados
        </Button>
        <Button
          variant={filterProximos ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => { setFilterProximos(!filterProximos); setFilterAtrasados(false); }}
        >
          <Calendar className="h-3 w-3" /> Próximos
        </Button>
      </div>


      {/* Conteúdo */}
      {viewMode === 'calendario' ? (
        <ObraCalendarView obraId={obra.id} sources={['agenda']} fetchFromDb={true} />
      ) : viewMode === 'timeline' ? (
        loading ? <div className="text-center py-10 text-muted-foreground">Carregando...</div> :
        <AgendaTimelineView items={filtered as any} />
      ) : loading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card"><CardContent className="p-10 text-center text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p>Nenhum evento encontrado.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const es = item._effectiveStatus;
            const isAtrasado = es === 'atrasado';
            const isHoje = isToday(parseISO(item.data_programada));
            return (
              <Card key={item.id} className={cn(
                "shadow-card transition-colors",
                isAtrasado && "border-destructive/40 bg-destructive/[0.02]",
                isHoje && !isAtrasado && "border-primary/30 bg-primary/[0.02]",
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <button onClick={() => cycleStatus(item)} className="shrink-0" title="Alterar status">
                          {statusIcons[es]}
                        </button>
                        <span className={cn(
                          "font-medium text-foreground",
                          es === 'concluido' && "line-through text-muted-foreground",
                          es === 'cancelado' && "line-through text-muted-foreground/50",
                        )}>{item.titulo}</span>
                        <Badge variant="secondary" className={statusColors[es]}>{statusLabels[es]}</Badge>
                        <Badge variant="secondary" className={prioridadeColors[item.prioridade]}>{prioridadeLabels[item.prioridade]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{tipoLabels[item.tipo]}</Badge>
                      </div>
                      {item.descricao && <p className="text-sm text-muted-foreground ml-7 line-clamp-2">{item.descricao}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 ml-7 mt-1 text-xs text-muted-foreground">
                        <span className={cn(isAtrasado && "text-destructive font-medium")}>
                          {isAtrasado ? '⚠ Atrasado — ' : ''}
                          {format(parseISO(item.data_programada), "dd/MM/yyyy")}
                          {item.hora_programada && ` às ${item.hora_programada.slice(0, 5)}`}
                        </span>
                        {item.responsavel && <span>Resp: {item.responsavel}</span>}
                        {item.local && <span>Local: {item.local}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {es !== 'concluido' && es !== 'cancelado' && (
                        <button
                          onClick={() => quickAction(item, 'concluir')}
                          className="p-1.5 rounded-md hover:bg-success/10"
                          title="Concluir"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-md hover:bg-accent"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
                <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
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
                  <Input
                    type="number" min={1} className="w-20 h-8"
                    value={form.antecedencia_alerta_em_dias}
                    onChange={e => setForm(f => ({ ...f, antecedencia_alerta_em_dias: e.target.value }))}
                  />
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
