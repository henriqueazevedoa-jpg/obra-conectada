import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isBefore, startOfDay, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useObras } from '@/contexts/ObrasContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Plus, CalendarDays, CheckCircle2, Clock, Pencil, Trash2,
  AlertTriangle, Play, Calendar, Filter, ListChecks,
  Kanban, List, GitBranch, DollarSign,
} from 'lucide-react';
import ObraCalendarView from '@/components/painel/ObraCalendarView';
import { toast } from '@/hooks/use-toast';
import NoObraState from '@/components/obras/NoObraState';
import PageShell from '@/components/layout/PageShell';
import type { PageAction, PageKPI } from '@/components/layout/PageShell';

// ── Types ──────────────────────────────────────────────────────────────────────

type AgendaTipo =
  | 'execucao' | 'entrega_material' | 'instalacao' | 'vistoria'
  | 'ensaio' | 'reuniao' | 'medicao' | 'administrativo'
  | 'fornecedor' | 'pendencia' | 'outro';

type AgendaStatus = 'programado' | 'confirmado' | 'em_andamento' | 'concluido' | 'atrasado' | 'cancelado';
type AgendaPrioridade = 'baixa' | 'media' | 'alta';
type ViewMode = 'lista' | 'kanban' | 'calendario';

interface AgendaItem {
  id: string; obra_id: string; titulo: string; tipo: AgendaTipo;
  descricao: string | null; data_programada: string; hora_programada: string | null;
  data_finalizacao: string | null; responsavel: string | null; status: AgendaStatus;
  prioridade: AgendaPrioridade; local: string | null; alerta_ativo: boolean;
  antecedencia_alerta_em_dias: number | null; created_at: string;
  data_limite: string | null; origem: string | null;
  _effectiveStatus?: AgendaStatus;
  _readOnly?: boolean;
}

// ── Labels & Colors ────────────────────────────────────────────────────────────

const tipoLabels: Record<AgendaTipo, string> = {
  execucao: 'Execução', entrega_material: 'Entrega de Material', instalacao: 'Instalação',
  vistoria: 'Vistoria', ensaio: 'Ensaio', reuniao: 'Reunião', medicao: 'Medição',
  administrativo: 'Administrativo', fornecedor: 'Fornecedor',
  pendencia: 'Pendência', outro: 'Outro',
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
  data_limite: '',
};

const KANBAN_COLS: { status: AgendaStatus; label: string; color: string }[] = [
  { status: 'programado',   label: 'Programado',   color: 'border-primary/30 bg-primary/5' },
  { status: 'em_andamento', label: 'Em Andamento', color: 'border-amber-500/30 bg-amber-500/5' },
  { status: 'concluido',    label: 'Concluído',    color: 'border-emerald-500/30 bg-emerald-500/5' },
  { status: 'atrasado',     label: 'Atrasado',     color: 'border-red-500/30 bg-red-500/5' },
];

// ── Tabs config ────────────────────────────────────────────────────────────────

type Tab = 'lista' | 'kanban' | 'calendario';
const TABS_CONFIG = [
  { id: 'lista'      as Tab, label: 'Lista'      },
  { id: 'kanban'     as Tab, label: 'Kanban'     },
  { id: 'calendario' as Tab, label: 'Calendário' },
];
const VALID_TABS: Tab[] = ['lista', 'kanban', 'calendario'];

// ── ItemCard ───────────────────────────────────────────────────────────────────

function ItemCard({
  item, onEdit, onDelete, onConcluir, onCycle, compact = false,
}: {
  item: AgendaItem & { _effectiveStatus: AgendaStatus };
  onEdit: () => void;
  onDelete: () => void;
  onConcluir: () => void;
  onCycle: () => void;
  compact?: boolean;
}) {
  const es = item._effectiveStatus;
  const isPendencia = item.tipo === 'pendencia';
  const isReadOnly = item._readOnly;
  const origemBadge = item.origem === 'cronograma' ? 'Cronograma' : item.origem === 'financeiro' ? 'Financeiro' : null;

  return (
    <Card className={cn(
      'transition-colors',
      es === 'atrasado' && 'border-red-500/30 bg-red-500/[0.02]',
      isToday(parseISO(item.data_programada)) && es !== 'atrasado' && 'border-primary/30 bg-primary/[0.02]',
      isPendencia && !isReadOnly && 'border-amber-500/20',
    )}>
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {!isReadOnly && (
                <button onClick={onCycle} className="shrink-0" title="Alterar status">
                  {isPendencia ? <ListChecks className={cn('h-5 w-5', es === 'atrasado' ? 'text-red-500' : es === 'concluido' ? 'text-muted-foreground' : 'text-amber-500')} /> : statusIcons[es]}
                </button>
              )}
              {isReadOnly && origemBadge === 'Cronograma' && <GitBranch className="h-4 w-4 text-violet-500 shrink-0" />}
              {isReadOnly && origemBadge === 'Financeiro' && <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />}
              <span className={cn(
                'font-medium text-foreground',
                ['concluido', 'cancelado'].includes(es) && 'line-through text-muted-foreground',
              )}>{item.titulo}</span>
              <Badge variant="secondary" className={statusColors[es]}>{statusLabels[es]}</Badge>
              <Badge variant="secondary" className={prioridadeColors[item.prioridade]}>{prioridadeLabels[item.prioridade]}</Badge>
              <Badge variant="outline" className="text-[10px]">{tipoLabels[item.tipo]}</Badge>
              {origemBadge && (
                <Badge variant="outline" className={cn(
                  'text-[10px]',
                  origemBadge === 'Cronograma' ? 'border-violet-500/30 text-violet-500' : 'border-emerald-500/30 text-emerald-500',
                )}>{origemBadge}</Badge>
              )}
            </div>
            {item.descricao && <p className="text-sm text-muted-foreground ml-7 line-clamp-2">{item.descricao}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 ml-7 mt-1 text-xs text-muted-foreground">
              <span className={cn(es === 'atrasado' && 'text-red-600 font-medium')}>
                {es === 'atrasado' ? '⚠ Atrasado — ' : ''}
                {format(parseISO(item.data_programada), 'dd/MM/yyyy')}
                {item.hora_programada && ` às ${item.hora_programada.slice(0, 5)}`}
              </span>
              {item.data_limite && <span>Limite: {format(parseISO(item.data_limite), 'dd/MM/yyyy')}</span>}
              {item.responsavel && <span>Resp: {item.responsavel}</span>}
              {item.local && <span>Local: {item.local}</span>}
            </div>
          </div>
          {!isReadOnly && (
            <div className="flex gap-1 shrink-0">
              {!['concluido', 'cancelado'].includes(es) && (
                <button onClick={onConcluir} className="p-1.5 rounded-md hover:bg-emerald-500/10" title="Concluir">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </button>
              )}
              <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-accent" title="Editar">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-500/10" title="Excluir">
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── KanbanView ─────────────────────────────────────────────────────────────────

function KanbanView({
  items, onEdit, onDelete, onConcluir, onCycle,
}: {
  items: (AgendaItem & { _effectiveStatus: AgendaStatus })[];
  onEdit: (item: AgendaItem) => void;
  onDelete: (item: AgendaItem) => void;
  onConcluir: (item: AgendaItem) => void;
  onCycle: (item: AgendaItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {KANBAN_COLS.map(col => {
        const colItems = items.filter(i => i._effectiveStatus === col.status);
        return (
          <div key={col.status} className={cn('rounded-xl border p-3 space-y-2', col.color)}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {col.label}
              </span>
              <Badge variant="secondary" className="text-xs h-5 min-w-[20px] px-1">{colItems.length}</Badge>
            </div>
            {colItems.length === 0 ? (
              <p className="text-xs text-muted-foreground/40 text-center py-4">Vazio</p>
            ) : (
              colItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  compact
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                  onConcluir={() => onConcluir(item)}
                  onCycle={() => onCycle(item)}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── FilterBar ──────────────────────────────────────────────────────────────────

function FilterBar({
  search, onSearch, filterStatus, onFilterStatus, filterTipo, onFilterTipo,
}: {
  search: string; onSearch: (v: string) => void;
  filterStatus: string; onFilterStatus: (v: string) => void;
  filterTipo: string; onFilterTipo: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Filter style={{ width: 14, height: 14, color: 'var(--color-text-secondary)' }} />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{ height: 32, fontSize: 12, width: 140 }}
        />
      </div>
      <Select value={filterStatus} onValueChange={v => onFilterStatus(v === 'all' ? '' : v)}>
        <SelectTrigger style={{ width: 130, height: 32, fontSize: 12 }}><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos status</SelectItem>
          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filterTipo} onValueChange={v => onFilterTipo(v === 'all' ? '' : v)}>
        <SelectTrigger style={{ width: 140, height: 32, fontSize: 12 }}><SelectValue placeholder="Tipo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tipos</SelectItem>
          {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── AgendaIcon ─────────────────────────────────────────────────────────────────

const AgendaIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="12" rx="2" fill="#AFA9EC" />
    <rect x="4" y="1" width="2" height="4" rx="1" fill="#534AB7" />
    <rect x="10" y="1" width="2" height="4" rx="1" fill="#534AB7" />
    <rect x="1" y="7" width="14" height="1" fill="#534AB7" opacity="0.4" />
  </svg>
);

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedObraId } = useObraSelection();
  const { obras } = useObras();
  const { user } = useAuth();
  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  // Tab via URL (igual ao Financeiro)
  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'lista';
  const setTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });

  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  const fetchItems = useCallback(async () => {
    if (!obra) return;
    setLoading(true);

    const { data: agendaData } = await (supabase as any)
      .from('obra_agenda')
      .select('*')
      .eq('obra_id', obra.id)
      .order('data_programada', { ascending: true });

    const { data: marcosData } = await (supabase as any)
      .from('cronograma_tarefas')
      .select('id, nome, data_inicio, data_fim')
      .eq('obra_id', obra.id)
      .eq('tipo_tarefa', 'MARCO');

    const { data: pagamentosData } = await (supabase as any)
      .from('pagamentos')
      .select('id, descricao, data_vencimento, valor')
      .eq('obra_id', obra.id)
      .not('data_vencimento', 'is', null)
      .not('status', 'in', '("pago","cancelado")');

    const agendaItems = (agendaData || []) as AgendaItem[];

    const marcosItems: AgendaItem[] = (marcosData || []).map((m: any) => ({
      id: `marco-${m.id}`, obra_id: obra.id,
      titulo: m.nome, tipo: 'execucao' as AgendaTipo,
      descricao: null, data_programada: m.data_fim || m.data_inicio,
      hora_programada: null, data_finalizacao: null, responsavel: null,
      status: 'programado' as AgendaStatus, prioridade: 'media' as AgendaPrioridade,
      local: null, alerta_ativo: false, antecedencia_alerta_em_dias: null,
      created_at: '', data_limite: null, origem: 'cronograma', _readOnly: true,
    }));

    const pagamentosItems: AgendaItem[] = (pagamentosData || []).map((p: any) => ({
      id: `pag-${p.id}`, obra_id: obra.id,
      titulo: p.descricao || 'Pagamento', tipo: 'administrativo' as AgendaTipo,
      descricao: `Valor: R$ ${Number(p.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      data_programada: p.data_vencimento,
      hora_programada: null, data_finalizacao: null, responsavel: null,
      status: 'programado' as AgendaStatus, prioridade: 'alta' as AgendaPrioridade,
      local: null, alerta_ativo: false, antecedencia_alerta_em_dias: null,
      created_at: '', data_limite: p.data_vencimento, origem: 'financeiro', _readOnly: true,
    }));

    const { data: pedidosData } = await (supabase as any)
      .from('material_pedidos')
      .select('id, descricao, fornecedor, data_entrega_prevista, status, valor_estimado')
      .eq('obra_id', obra.id)
      .not('data_entrega_prevista', 'is', null)
      .not('status', 'in', '("cancelado","recebido")');

    const pedidosItems: AgendaItem[] = (pedidosData || []).map((p: any) => ({
      id: `pedido-${p.id}`, obra_id: obra.id,
      titulo: `Entrega: ${p.descricao}`,
      tipo: 'entrega_material' as AgendaTipo,
      descricao: `${p.fornecedor ? `Fornecedor: ${p.fornecedor}` : ''}${p.valor_estimado ? ` · ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_estimado)}` : ''}`.trim() || null,
      data_programada: p.data_entrega_prevista,
      hora_programada: null, data_finalizacao: null, responsavel: null,
      status: 'programado' as AgendaStatus, prioridade: 'media' as AgendaPrioridade,
      local: null, alerta_ativo: false, antecedencia_alerta_em_dias: null,
      created_at: '', data_limite: null, origem: 'pedido', _readOnly: true,
    }));

    setItems([...agendaItems, ...marcosItems, ...pagamentosItems, ...pedidosItems]);
    setLoading(false);
  }, [obra?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getEffectiveStatus = (item: AgendaItem): AgendaStatus => {
    if (item.status === 'concluido' || item.status === 'cancelado') return item.status;
    if (item.data_programada && isBefore(parseISO(item.data_programada), today)) return 'atrasado';
    return item.status;
  };

  const itemsWithStatus = items.map(i => ({ ...i, _effectiveStatus: getEffectiveStatus(i) }));

  const filtered = itemsWithStatus
    .filter(i => !search || i.titulo.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !filterStatus || i._effectiveStatus === filterStatus)
    .filter(i => !filterTipo || i.tipo === filterTipo);

  // KPIs (mesmo padrão do Financeiro → lift-state via PageShell kpis prop)
  const hojeCount      = itemsWithStatus.filter(i => isToday(parseISO(i.data_programada)) && !['concluido', 'cancelado'].includes(i._effectiveStatus)).length;
  const prox7Count     = itemsWithStatus.filter(i => { const d = parseISO(i.data_programada); return d >= today && d <= in7Days && !['concluido', 'cancelado'].includes(i._effectiveStatus); }).length;
  const atrasadosCount = itemsWithStatus.filter(i => i._effectiveStatus === 'atrasado').length;
  const pendenciasCount = itemsWithStatus.filter(i => i.tipo === 'pendencia' && !['concluido', 'cancelado'].includes(i._effectiveStatus)).length;

  const kpis: PageKPI[] = [
    {
      id: 'hoje', label: 'Hoje', value: String(hojeCount),
      tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7',
    },
    {
      id: 'prox7', label: 'Próx. 7 dias', value: String(prox7Count),
      tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7',
    },
    {
      id: 'atrasados', label: 'Atrasados', value: String(atrasadosCount),
      tint: atrasadosCount > 0 ? '#FEF2F2' : undefined,
      valueColor: atrasadosCount > 0 ? '#A32D2D' : undefined,
    },
    {
      id: 'pendencias', label: 'Pendências', value: String(pendenciasCount),
      tint: pendenciasCount > 0 ? '#FFFBEB' : undefined,
      valueColor: pendenciasCount > 0 ? '#92400E' : undefined,
    },
  ];

  const openCreate = (tipo?: AgendaTipo) => {
    setEditingId(null);
    setForm({ ...emptyForm, tipo: tipo || 'execucao' });
    setDialogOpen(true);
  };

  const openEdit = (item: AgendaItem) => {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo, tipo: item.tipo, descricao: item.descricao || '',
      data_programada: item.data_programada, hora_programada: item.hora_programada || '',
      responsavel: item.responsavel || '', status: item.status, prioridade: item.prioridade,
      local: item.local || '', alerta_ativo: item.alerta_ativo,
      antecedencia_alerta_em_dias: item.antecedencia_alerta_em_dias?.toString() || '',
      data_limite: item.data_limite || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.titulo || !form.data_programada) {
      toast({ title: 'Preencha título e data.', variant: 'destructive' }); return;
    }
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
        data_limite: form.data_limite || null,
        origem: 'agenda',
      };
      if (editingId) {
        await (supabase as any).from('obra_agenda').update(payload).eq('id', editingId);
        toast({ title: 'Evento atualizado!' });
      } else {
        await (supabase as any).from('obra_agenda').insert({ ...payload, obra_id: obra!.id });
        toast({ title: 'Evento criado!' });
      }
      setDialogOpen(false); fetchItems();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await (supabase as any).from('obra_agenda').delete().eq('id', deleteConfirmId);
    toast({ title: 'Evento excluído.' }); setDeleteConfirmId(null); fetchItems();
  };

  const handleConcluir = async (item: AgendaItem) => {
    await (supabase as any).from('obra_agenda').update({
      status: 'concluido', data_finalizacao: new Date().toISOString(),
    }).eq('id', item.id);
    toast({ title: `"${item.titulo}" concluído!` }); fetchItems();
  };

  const cycleStatus = async (item: AgendaItem) => {
    const order: AgendaStatus[] = ['programado', 'confirmado', 'em_andamento', 'concluido'];
    const idx = order.indexOf(item.status);
    const next = order[(idx + 1) % order.length];
    await (supabase as any).from('obra_agenda').update({
      status: next, data_finalizacao: next === 'concluido' ? new Date().toISOString() : null,
    }).eq('id', item.id);
    fetchItems();
  };

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra selecionada"
        description="Selecione uma obra para acessar a agenda."
      />
    );
  }

  const toolbar = activeTab !== 'calendario' ? (
    <FilterBar
      search={search} onSearch={setSearch}
      filterStatus={filterStatus} onFilterStatus={setFilterStatus}
      filterTipo={filterTipo} onFilterTipo={setFilterTipo}
    />
  ) : undefined;

  const headerActions: PageAction[] = [
    { label: '+ Nova Pendência', variant: 'outline', onClick: () => openCreate('pendencia') },
    { label: '+ Novo Evento', variant: 'primary', onClick: () => openCreate() },
  ];

  return (
    <>
      <PageShell
        icon={AgendaIcon}
        title="Agenda"
        tabs={TABS_CONFIG}
        activeTab={activeTab}
        onTabChange={id => setTab(id as Tab)}
        kpis={kpis}
        actions={headerActions}
        toolbar={toolbar}
      >
        <div style={{ height: '100%', position: 'relative', background: 'var(--color-background-primary)' }}>

          {/* ── Lista ─── */}
          <div style={{ height: '100%', display: activeTab === 'lista' ? 'block' : 'none' }}>
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted/40" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
                <Button size="sm" onClick={() => openCreate()} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Criar Primeiro Evento
                </Button>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {(filtered as (AgendaItem & { _effectiveStatus: AgendaStatus })[]).map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => setDeleteConfirmId(item.id)}
                    onConcluir={() => handleConcluir(item)}
                    onCycle={() => cycleStatus(item)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Kanban ─── */}
          <div style={{ height: '100%', display: activeTab === 'kanban' ? 'block' : 'none' }}>
            {loading ? (
              <div className="grid grid-cols-4 gap-3 p-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-xl animate-pulse bg-muted/40" />)}
              </div>
            ) : (
              <div className="p-4">
                <KanbanView
                  items={filtered as (AgendaItem & { _effectiveStatus: AgendaStatus })[]}
                  onEdit={openEdit}
                  onDelete={item => setDeleteConfirmId(item.id)}
                  onConcluir={handleConcluir}
                  onCycle={cycleStatus}
                />
              </div>
            )}
          </div>

          {/* ── Calendário ─── */}
          <div style={{ height: '100%', display: activeTab === 'calendario' ? 'block' : 'none' }}>
            <div className="p-4">
              <ObraCalendarView obraId={obra.id} sources={['agenda']} fetchFromDb={true} />
            </div>
          </div>

        </div>
      </PageShell>

      {/* ── Dialog Criar/Editar ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Atualize os dados do evento.' : 'Cadastre um novo evento na agenda.'}
            </DialogDescription>
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

            {form.tipo === 'pendencia' && (
              <div className="space-y-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <Label className="text-amber-600 flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" /> Data Limite
                </Label>
                <Input type="date" value={form.data_limite} onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))} />
              </div>
            )}

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

      {/* ── Dialog Excluir ─── */}
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
    </>
  );
}
