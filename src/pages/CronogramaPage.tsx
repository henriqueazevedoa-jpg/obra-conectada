import { useState, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useCronograma, CronogramaTarefa, TipoTarefa } from '@/hooks/useCronograma';
import { useCronogramaVersoes, CronogramaVersao, TipoCronogramaVersao } from '@/hooks/useCronogramaVersoes';
import { useRecursos } from '@/hooks/useRecursos';
import { useGanttFinanceiro } from '@/hooks/useGanttFinanceiro';
import { parseISO, differenceInDays, isBefore } from 'date-fns';
import {
  CalendarDays, AlertTriangle, CheckCircle2, Clock, Plus,
  Save, ChevronDown, ChevronRight, BarChart3, List, Pencil,
  Lock, Unlock, MoreHorizontal, Trash2, Link2, Users, TrendingUp, Loader2,
  ClipboardCheck, Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import NoObraState from '@/components/obras/NoObraState';
import TaskDetailDrawer from '@/components/cronograma/TaskDetailDrawer';
import GanttCanvasPanel, { computeCriticalPath } from '@/components/cronograma/GanttCanvasPanel';
import CurvaS from '@/components/cronograma/CurvaS';
import MedicaoTab from '@/components/cronograma/MedicaoTab';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI, PageAction } from '@/components/layout/PageShell';
import DrawerEstimarDuracoes, { EstimaUpdate } from '@/components/cronograma/DrawerEstimarDuracoes';
import CronogramaVersaoStepper from '@/components/cronograma/CronogramaVersaoStepper';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = 'planejamento' | 'impedimentos' | 'medicao';
type SubView = 'split' | 'list' | 'curvs';

const SUBVIEW_KEY = 'lastra_cronograma_subview';

function readSavedSubView(): SubView {
  try {
    const saved = localStorage.getItem(SUBVIEW_KEY);
    if (saved === 'split' || saved === 'list' || saved === 'curvs') return saved;
  } catch {}
  return 'split';
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bar: string }> = {
  nao_iniciada: { label: 'Não Iniciada', color: 'text-[#888780]', icon: <Clock className="h-3.5 w-3.5" style={{ color: '#888780' }} />,        bar: 'bg-[#888780]' },
  em_andamento: { label: 'Em Andamento', color: 'text-[#185FA5]', icon: <CalendarDays className="h-3.5 w-3.5" style={{ color: '#185FA5' }} />, bar: 'bg-[#185FA5]' },
  concluida:    { label: 'Concluída',    color: 'text-[#3B6D11]', icon: <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#3B6D11' }} />, bar: 'bg-[#3B6D11]' },
  atrasada:     { label: 'Atrasada',     color: 'text-[#A32D2D]', icon: <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#A32D2D' }} />, bar: 'bg-[#A32D2D]' },
};

function computeStatusTarefa(t: CronogramaTarefa): string {
  if (t.percentual_concluido >= 100) return 'concluida';
  const hoje = new Date();
  if (t.data_fim && isBefore(parseISO(t.data_fim), hoje)) return 'atrasada';
  if (t.data_inicio && isBefore(parseISO(t.data_inicio), hoje)) return 'em_andamento';
  return 'nao_iniciada';
}

// ─── WBS Row ──────────────────────────────────────────────────────────────────

interface WBSRowProps {
  tarefa: CronogramaTarefa;
  children?: CronogramaTarefa[];
  isExpanded: boolean; isSelected: boolean; isCritico?: boolean;
  isDragging?: boolean; isDragOver?: boolean;
  onToggle: () => void; onSelect: () => void;
  onUpdate: (id: string, changes: Partial<CronogramaTarefa>) => void;
  onDelete: (id: string) => void;
  onOpenDrawer: (tarefa: CronogramaTarefa) => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  financeiroTotal?: number;
}

function WBSRow({ tarefa, children, isExpanded, isSelected, isCritico, isDragging, isDragOver, onToggle, onSelect, onUpdate, onDelete, onOpenDrawer, onDragStart, onDragOver, onDrop }: WBSRowProps) {
  const status = computeStatusTarefa(tarefa);
  const cfg = STATUS_CONFIG[status];
  const hasChildren = children && children.length > 0;
  const indent = tarefa.nivel === 1 ? '' : 'pl-6';
  const isSummary = tarefa.tipo_tarefa === 'RESUMO' || hasChildren;
  const isMilestone = tarefa.tipo_tarefa === 'MARCO';

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={e => { e.stopPropagation(); onDragStart?.(); }}
      onDragOver={e => { e.preventDefault(); onDragOver?.(e); }}
      onDrop={e => { e.preventDefault(); onDrop?.(); }}
      className={cn(
        'group flex items-center gap-1 px-2 py-1.5 border-b border-border/50 cursor-pointer transition-colors relative',
        isSelected ? 'bg-primary/8 border-l-2 border-l-primary' : 'hover:bg-muted/40',
        isSummary && 'bg-muted/20',
        isDragging && 'opacity-40',
        isDragOver && 'border-t-2 border-t-primary bg-primary/5',
      )}
      onClick={onSelect}
    >
      <div className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing" onClick={e => e.stopPropagation()}>
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
          <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
          <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
        </svg>
      </div>
      <button className={cn('h-4 w-4 shrink-0 text-muted-foreground', !hasChildren && 'opacity-0 pointer-events-none')} onClick={e => { e.stopPropagation(); onToggle(); }}>
        {isExpanded ? <ChevronDown className="h-3.5 w-3.5"/> : <ChevronRight className="h-3.5 w-3.5"/>}
      </button>
      <div className={cn('h-2 w-2 rounded-full shrink-0', cfg.bar, isMilestone && 'rotate-45 rounded-none h-2.5 w-2.5')}/>
      <span
        className={cn('flex-1 text-xs truncate min-w-0', indent, isSummary ? 'font-semibold text-foreground' : 'text-foreground/90', isMilestone && 'italic')}
        title={tarefa.nome}
        onDoubleClick={e => { e.stopPropagation(); onOpenDrawer(tarefa); }}
      >
        {tarefa.nome}
      </span>
      <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{tarefa.duracao_dias}d</span>
      <div className="w-14 shrink-0">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', isCritico ? 'bg-orange-500' : cfg.bar)} style={{ width: `${tarefa.percentual_concluido}%` }}/>
          </div>
          <span className="text-[10px] text-muted-foreground w-6">{tarefa.percentual_concluido}%</span>
        </div>
      </div>
      {tarefa.dias_impedidos > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center h-4 px-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0 cursor-help">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              <span className="text-[9px] font-bold">{tarefa.dias_impedidos}d</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-[10px]">
            Obra impedida por {tarefa.dias_impedidos} dias nesta etapa
          </TooltipContent>
        </Tooltip>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded hover:bg-muted transition-opacity" onClick={e => e.stopPropagation()}>
            <MoreHorizontal className="h-3 w-3 mx-auto text-muted-foreground"/>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onOpenDrawer(tarefa)}><Pencil className="h-3 w-3 mr-2"/>Editar Detalhes</DropdownMenuItem>
          <DropdownMenuItem><Link2 className="h-3 w-3 mr-2"/>Vincular ao Orçamento</DropdownMenuItem>
          <DropdownMenuSeparator/>
          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(tarefa.id)}><Trash2 className="h-3 w-3 mr-2"/>Remover</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── AddTaskInline ────────────────────────────────────────────────────────────

export interface AddTaskInlineHandle { activate: (tipo?: TipoTarefa) => void; }

const AddTaskInline = forwardRef<AddTaskInlineHandle, { onAdd: (nome: string, tipo: TipoTarefa) => void; loading: boolean }>(
  function AddTaskInlineInner({ onAdd, loading }, ref) {
    const [active, setActive] = useState(false);
    const [nome, setNome] = useState('');
    const [tipo, setTipo] = useState<TipoTarefa>('PADRAO');
    const inputRef = useRef<HTMLInputElement>(null);

    const handle = () => {
      if (nome.trim()) { onAdd(nome.trim(), tipo); setNome(''); setTipo('PADRAO'); setTimeout(() => inputRef.current?.focus(), 50); }
      else setActive(false);
    };
    const activate = (t: TipoTarefa = 'PADRAO') => { setTipo(t); setActive(true); setTimeout(() => inputRef.current?.focus(), 50); };
    useImperativeHandle(ref, () => ({ activate }), []);

    if (!active) return (
      <div className="flex items-center border-t border-border/50">
        <button onClick={() => activate('PADRAO')} className="flex-1 flex items-center gap-1.5 px-3 py-2 text-[11px] text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors text-left group">
          <Plus className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100 group-hover:text-primary"/>
          <span className="font-medium">Adicionar tarefa</span>
        </button>
        <div className="w-px h-5 bg-border/60 shrink-0"/>
        <div className="flex items-center shrink-0">
          <button onClick={() => activate('MARCO')} className="flex items-center gap-1 px-2.5 py-2 text-[10px] text-muted-foreground/40 hover:text-amber-600 hover:bg-amber-50 transition-colors font-medium">
            <span className="text-amber-500/60">◆</span> Marco
          </button>
          <div className="w-px h-3.5 bg-border/40 shrink-0"/>
          <button onClick={() => activate('RESUMO')} className="flex items-center gap-1 px-2.5 py-2 text-[10px] text-muted-foreground/40 hover:text-[var(--color-text-primary)] hover:bg-muted/50 transition-colors font-medium">
            <span className="opacity-60">≡</span> Grupo
          </button>
        </div>
      </div>
    );

    return (
      <div className="flex items-center gap-1 border-t border-primary/30 bg-primary/5">
        <span className="pl-3 text-[10px] text-muted-foreground shrink-0 w-14">
          {tipo === 'MARCO' ? '◆ Marco' : tipo === 'RESUMO' ? '≡ Grupo' : '▬ Tarefa'}
        </span>
        <input
          ref={inputRef} value={nome} onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handle(); if (e.key === 'Escape') { setActive(false); setNome(''); setTipo('PADRAO'); } }}
          onBlur={() => { if (!nome.trim()) { setActive(false); setTipo('PADRAO'); } }}
          placeholder={tipo === 'PADRAO' ? 'Nome da tarefa…' : tipo === 'MARCO' ? 'Nome do marco…' : 'Nome do agrupador…'}
          className="flex-1 text-[11px] bg-transparent border-none outline-none py-2 text-foreground placeholder:text-muted-foreground/50"
          disabled={loading}
        />
        <span className="pr-3 text-[9px] text-muted-foreground/40 shrink-0">Enter ↵</span>
      </div>
    );
  }
);

// ─── SubView Toggle ───────────────────────────────────────────────────────────

interface SubViewToggleProps {
  value: SubView;
  onChange: (v: SubView) => void;
}

function SubViewToggle({ value, onChange }: SubViewToggleProps) {
  const options: { id: SubView; label: string; icon: React.ReactNode }[] = [
    { id: 'list',  label: 'Lista',   icon: <List style={{ width: 12, height: 12 }} /> },
    { id: 'split', label: 'Gantt',   icon: <BarChart3 style={{ width: 12, height: 12 }} /> },
    { id: 'curvs', label: 'Curva S', icon: <TrendingUp style={{ width: 12, height: 12 }} /> },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px', background: 'var(--color-background-tertiary,rgba(0,0,0,0.06))', borderRadius: 8 }}>
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              height: 26, padding: '0 9px',
              borderRadius: 6, border: active ? '1px solid rgba(83,74,183,0.2)' : '1px solid transparent',
              background: active ? 'var(--color-background-secondary)' : 'transparent',
              color: active ? '#534AB7' : 'var(--color-text-secondary)',
              fontSize: 11, fontWeight: active ? 600 : 500,
              cursor: 'pointer', transition: 'all 0.12s',
              boxShadow: active ? '0 1px 3px rgba(83,74,183,0.12)' : 'none',
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Ícone ────────────────────────────────────────────────────────────────────

const CronogramaIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5" height="5" rx="1" fill="#AFA9EC"/>
    <rect x="9" y="2" width="5" height="5" rx="1" fill="#AFA9EC"/>
    <rect x="2" y="9" width="5" height="5" rx="1" fill="#AFA9EC"/>
    <rect x="9" y="9" width="5" height="5" rx="1" fill="#534AB7"/>
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CronogramaPage() {
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const { tarefas, dependencias, impedimentos, loading, saving, addTarefa, updateTarefa, deleteTarefa, addDependencia, removeDependencia, addImpedimento, updateImpedimento, deleteImpedimento, applyDateCascade, saveBaseline, unlockBaseline, stats, refresh } = useCronograma(selectedObraId);
  const { versoes, loading: versoesLoading, criarVersao } = useCronogramaVersoes(selectedObraId);
  const { recursos, alocacoes, addAlocacao, removeAlocacao, getAlocacoesDaTarefa, recursosSupelalocados } = useRecursos(selectedObraId);
  const { byEtapa: financeiroByEtapa } = useGanttFinanceiro(selectedObraId);

  // Versão ativa do cronograma (null = sem versão, exibe todas as tarefas)
  const [versaoAtiva, setVersaoAtiva] = useState<CronogramaVersao | null>(null);

  const handleSelectVersao = useCallback((versao: CronogramaVersao) => {
    setVersaoAtiva(versao);
  }, []);

  const handleCriarVersao = useCallback(async (tipo: TipoCronogramaVersao) => {
    const nova = await criarVersao(tipo);
    if (nova) setVersaoAtiva(nova);
  }, [criarVersao]);

  // Tarefas filtradas pela versão ativa (null = todas as tarefas)
  const tarefasFiltradas = useMemo(() => {
    if (!versaoAtiva) return tarefas;
    return tarefas.filter(t => !(t as any).versao_id || (t as any).versao_id === versaoAtiva.id);
  }, [tarefas, versaoAtiva]);

  const [isAddingImpedimento, setIsAddingImpedimento] = useState(false);
  const [newImpedimento, setNewImpedimento] = useState<{
    tarefa_id: string;
    categoria: 'climatico' | 'projeto' | 'material' | 'mao_de_obra' | 'financeiro' | 'outros';
    descricao: string;
    data_inicio: string;
  }>({
    tarefa_id: '',
    categoria: 'climatico',
    descricao: '',
    data_inicio: new Date().toISOString().split('T')[0],
  });

  const obra = obras.find(o => o.id === selectedObraId);

  // ── State: dois estados separados ─────────────────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>('planejamento');
  const [subView, setSubView] = useState<SubView>(readSavedSubView);

  const handleSubViewChange = useCallback((sv: SubView) => {
    setSubView(sv);
    try { localStorage.setItem(SUBVIEW_KEY, sv); } catch {}
  }, []);

  const [selectedTarefaId, setSelectedTarefaId] = useState<string | null>(null);
  const [drawerTarefa, setDrawerTarefa] = useState<CronogramaTarefa | null>(null);
  const [drawerEstimarOpen, setDrawerEstimarOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const addTaskRef = useRef<AddTaskInlineHandle>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const handleAplicarEstimativas = useCallback(async (updates: EstimaUpdate[]) => {
    for (const u of updates) {
      await updateTarefa(u.id, {
        data_fim: u.data_fim,
        ...(u.amdahl_p !== undefined ? { amdahl_p: u.amdahl_p } : {}),
        ...(u.amdahl_f !== undefined ? { amdahl_f: u.amdahl_f } : {}),
        ...(u.duracao_sugerida_dias !== undefined ? { duracao_sugerida_dias: u.duracao_sugerida_dias } : {}),
      });
    }
  }, [updateTarefa]);

  const triggerAddTask = useCallback((tipo: TipoTarefa = 'PADRAO') => {
    // Garante estar na sub-view Lista e na aba Planejamento
    if (mainTab !== 'planejamento') setMainTab('planejamento');
    if (subView !== 'list') handleSubViewChange('list');
    requestAnimationFrame(() => {
      listScrollRef.current?.scrollTo({ top: listScrollRef.current.scrollHeight, behavior: 'smooth' });
      setTimeout(() => addTaskRef.current?.activate(tipo), 80);
    });
  }, [mainTab, subView, handleSubViewChange]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const rootTarefas = useMemo(() => tarefas.filter(t => !t.parent_tarefa_id).sort((a, b) => a.ordem - b.ordem), [tarefas]);
  const childrenOf = useCallback((parentId: string) => tarefas.filter(t => t.parent_tarefa_id === parentId).sort((a, b) => a.ordem - b.ordem), [tarefas]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const reorderRootTarefas = useCallback(async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const roots = [...rootTarefas];
    const fromIdx = roots.findIndex(t => t.id === sourceId);
    const toIdx = roots.findIndex(t => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...roots];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await Promise.all(reordered.map((t, idx) => updateTarefa(t.id, { ordem: idx + 1 })));
  }, [rootTarefas, updateTarefa]);

  const criticalIds = useMemo(() => computeCriticalPath(tarefas, dependencias), [tarefas, dependencias]);

  const spi = useMemo(() => {
    if (!stats.hasBaseline || tarefas.length === 0) return null;
    const hoje = new Date();
    const todasComPeso = tarefas.every(t => t.peso_orcamento != null && t.peso_orcamento > 0);
    if (todasComPeso) {
      const bcwp = tarefas.reduce((sum, t) => (!t.baseline_inicio || !isBefore(parseISO(t.baseline_inicio), hoje)) ? sum : sum + (t.peso_orcamento * (t.percentual_concluido / 100)), 0);
      const bcws = tarefas.reduce((sum, t) => (!t.baseline_inicio || !isBefore(parseISO(t.baseline_inicio), hoje)) ? sum : sum + t.peso_orcamento, 0);
      if (bcws === 0) return null;
      return bcwp / bcws;
    }
    const planned = tarefas.filter(t => t.baseline_inicio && isBefore(parseISO(t.baseline_inicio), hoje)).length;
    if (planned === 0) return null;
    return (stats.progressoGeral / 100 * tarefas.length) / planned;
  }, [tarefas, stats]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis: PageKPI[] = obra ? [
    {
      id: 'atrasadas',
      label: 'Tarefas atrasadas',
      value: String(stats.tasksAtrasadas),
      icon: stats.tasksAtrasadas > 0
        ? <AlertTriangle style={{ width: 16, height: 16, color: '#A32D2D' }}/>
        : <CheckCircle2 style={{ width: 16, height: 16, color: '#3B6D11' }}/>,
      tint: stats.tasksAtrasadas > 0 ? '#FCEBEB' : '#EAF3DE',
      valueColor: stats.tasksAtrasadas > 0 ? '#A32D2D' : '#3B6D11',
      labelColor: stats.tasksAtrasadas > 0 ? '#A32D2D' : '#3B6D11',
    },
    {
      id: 'progresso',
      label: 'Progresso geral',
      value: `${stats.progressoGeral}%`,
      icon: <TrendingUp style={{ width: 16, height: 16, color: '#534AB7' }}/>,
      tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7',
      main: true, progress: stats.progressoGeral, progressColor: '#534AB7',
    },
    {
      id: 'concluidas',
      label: 'Tarefas concluídas',
      value: `${stats.tasksConcluidas} / ${tarefas.length}`,
      icon: <CheckCircle2 style={{ width: 16, height: 16, color: stats.tasksConcluidas === tarefas.length && tarefas.length > 0 ? '#3B6D11' : 'var(--color-text-secondary)' }}/>,
      tint: stats.tasksConcluidas === tarefas.length && tarefas.length > 0 ? '#EAF3DE' : 'var(--color-background-secondary)',
      valueColor: stats.tasksConcluidas === tarefas.length && tarefas.length > 0 ? '#3B6D11' : 'var(--color-text-primary)',
      labelColor: stats.tasksConcluidas === tarefas.length && tarefas.length > 0 ? '#3B6D11' : 'var(--color-text-secondary)',
      sublabel: `${tarefas.length - stats.tasksConcluidas} em andamento`,
    },
    ...(spi !== null ? [{
      id: 'spi',
      label: `SPI — ${spi >= 1 ? 'No prazo' : spi >= 0.8 ? 'Atenção' : 'Atrasado'}`,
      value: `${spi.toFixed(2)} ${spi >= 1 ? '↑' : spi >= 0.8 ? '~' : '↓'}`,
      icon: <BarChart3 style={{ width: 16, height: 16, color: spi >= 1 ? '#3B6D11' : spi >= 0.8 ? '#854F0B' : '#A32D2D' }}/>,
      tint: spi >= 1 ? '#EAF3DE' : spi >= 0.8 ? '#FAEEDA' : '#FCEBEB',
      valueColor: spi >= 1 ? '#3B6D11' : spi >= 0.8 ? '#854F0B' : '#A32D2D',
      labelColor: spi >= 1 ? '#3B6D11' : spi >= 0.8 ? '#854F0B' : '#A32D2D',
    }] : []),
  ] : [];

  // ── Ações header ──────────────────────────────────────────────────────────
  const headerActions: PageAction[] = [
    { label: 'Exportar', variant: 'ghost', onClick: () => {} },
  ];

  // ── Toolbar planejamento (+ Tarefa + SubViewToggle + Baseline) ─────────────
  const planejamentoToolbar = obra ? (
    <>
      {/* Stepper de versões: Estimativo → Analítico → Execução */}
      <CronogramaVersaoStepper
        versoes={versoes}
        versaoAtiva={versaoAtiva}
        onSelectVersao={handleSelectVersao}
        onCriarVersao={handleCriarVersao}
        loading={versoesLoading}
      />

      {/* Separador */}
      <div style={{ width: 1, height: 22, background: 'var(--color-border-secondary)', flexShrink: 0, opacity: 0.5 }} />

      {/* Split button Tarefa */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => triggerAddTask('PADRAO')}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            height: 30, padding: '0 12px',
            background: '#534AB7', color: '#fff',
            border: 'none', borderRadius: '6px 0 0 6px',
            fontSize: 12, fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.5 : 1, whiteSpace: 'nowrap',
          }}
        >
          <Plus style={{ width: 12, height: 12 }}/>
          Tarefa
        </button>
        <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,.2)', flexShrink: 0 }}/>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 30, width: 28,
                background: '#534AB7', color: '#fff',
                border: 'none', borderRadius: '0 6px 6px 0',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
              }}
            >
              <ChevronDown style={{ width: 12, height: 12 }}/>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => triggerAddTask('RESUMO')}>
              <span className="mr-2 text-[var(--color-text-secondary)]">≡</span>Grupo
            </DropdownMenuItem>
            <DropdownMenuSeparator/>
            <DropdownMenuItem onClick={() => triggerAddTask('MARCO')}>
              <span className="mr-2" style={{ color: '#854F0B' }}>◆</span>Marco
              <span className="ml-auto text-[10px] text-[var(--color-text-secondary)]">milestone</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Estimar Durações */}
      <button
        onClick={() => setDrawerEstimarOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 30, padding: '0 11px',
          background: 'rgba(83,74,183,0.08)',
          border: '1px solid rgba(83,74,183,0.2)',
          borderRadius: 6, fontSize: 11, fontWeight: 600,
          color: '#534AB7', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(83,74,183,0.14)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(83,74,183,0.08)')}
      >
        <Wand2 style={{ width: 11, height: 11 }}/>
        Estimar Durações
      </button>

      <div style={{ flex: 1 }}/>

      {/* SubView Toggle */}
      <SubViewToggle value={subView} onChange={handleSubViewChange} />

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'var(--color-border-secondary)', flexShrink: 0 }} />

      {/* Baseline */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button style={{
            display: 'flex', alignItems: 'center',
            height: 30, padding: '0 10px',
            border: '0.5px solid var(--color-border-secondary)',
            background: 'transparent', color: 'var(--color-text-secondary)',
            borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', gap: 5,
          }}>
            <Save style={{ width: 12, height: 12 }}/>
            Baseline
            <ChevronDown style={{ width: 10, height: 10 }}/>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={saveBaseline} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-2 text-amber-600"/>Salvar Baseline
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => unlockBaseline()}>
            <Unlock className="h-3.5 w-3.5 mr-2"/>Editar Baseline
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  ) : undefined;

  // ── Abas do PageShell (3 abas principais) ─────────────────────────────────
  const tabs = [
    { id: 'planejamento',  label: 'Planejamento',  icon: <BarChart3 style={{ width: 13, height: 13 }}/> },
    { id: 'impedimentos',  label: 'Impedimentos',  icon: <AlertTriangle style={{ width: 13, height: 13 }}/> },
    { id: 'medicao',       label: 'Acompanhamento', icon: <ClipboardCheck style={{ width: 13, height: 13 }}/> },
  ];

  // ── Toolbar condicional por aba ────────────────────────────────────────────
  const activeToolbar = mainTab === 'impedimentos' ? (
    <button
      onClick={() => setIsAddingImpedimento(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
    >
      <Plus className="h-3.5 w-3.5" />
      Registrar Impedimento
    </button>
  ) : mainTab === 'planejamento' ? planejamentoToolbar : undefined;

  return (
    <TooltipProvider>
    <PageShell
      icon={CronogramaIcon}
      title="Cronograma"
      tabs={tabs}
      activeTab={mainTab}
      onTabChange={id => setMainTab(id as MainTab)}
      actions={headerActions}
      kpis={kpis}
      toolbar={activeToolbar}
    >
      {!obra ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <NoObraState title="Nenhuma obra selecionada" description="Selecione ou cadastre uma obra para gerenciar o cronograma."/>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

          {/* ── ABA PLANEJAMENTO ──────────────────────────────────────── */}
          <div style={{ display: mainTab === 'planejamento' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>

            {/* Toolbar do Gantt (portal, só quando gantt/split) */}
            {(subView === 'split') && (
              <div id="gantt-toolbar-portal" style={{
                flexShrink: 0,
                background: 'var(--color-background-secondary)',
                borderBottom: '0.5px solid var(--color-border-secondary)',
              }}/>
            )}

            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

              {/* Lista */}
              <div ref={listScrollRef} className="absolute inset-0 flex flex-col overflow-y-auto" style={{ display: subView === 'list' ? 'flex' : 'none' }}>
                <div className="grid grid-cols-[16px_16px_8px_1fr_36px_70px] gap-1 px-2 py-1.5 border-b border-border bg-muted/50 shrink-0">
                  <span/><span/><span/>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Tarefa</span>
                  <span className="text-[9px] font-semibold text-muted-foreground text-right">Dur.</span>
                  <span className="text-[9px] font-semibold text-muted-foreground">Progresso</span>
                </div>
                {loading && <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>}
                {!loading && tarefas.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/30"/>
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>
                    <p className="text-xs text-muted-foreground/70">Use o botão "+ Tarefa" para começar.</p>
                  </div>
                )}
                {rootTarefas.map(tarefa => (
                  <div key={tarefa.id}>
                    <WBSRow
                      tarefa={tarefa} children={childrenOf(tarefa.id)}
                      isExpanded={expandedIds.has(tarefa.id)} isSelected={selectedTarefaId === tarefa.id}
                      isCritico={criticalIds.has(tarefa.id)} isDragging={dragId === tarefa.id} isDragOver={dragOverId === tarefa.id}
                      onToggle={() => toggleExpand(tarefa.id)} onSelect={() => setSelectedTarefaId(tarefa.id)}
                      onUpdate={updateTarefa} onDelete={deleteTarefa} onOpenDrawer={setDrawerTarefa}
                      onDragStart={() => setDragId(tarefa.id)} onDragOver={() => setDragOverId(tarefa.id)}
                      onDrop={() => { if (dragId) reorderRootTarefas(dragId, tarefa.id); setDragId(null); setDragOverId(null); }}
                      financeiroTotal={financeiroByEtapa?.[tarefa.id]?.totalPrevisto}
                    />
                    {expandedIds.has(tarefa.id) && childrenOf(tarefa.id).map(child => (
                      <WBSRow
                        key={child.id} tarefa={child} isExpanded={false}
                        isSelected={selectedTarefaId === child.id} isCritico={criticalIds.has(child.id)}
                        onToggle={() => {}} onSelect={() => setSelectedTarefaId(child.id)}
                        onUpdate={updateTarefa} onDelete={deleteTarefa} onOpenDrawer={setDrawerTarefa}
                      />
                    ))}
                  </div>
                ))}
                {!loading && <AddTaskInline ref={addTaskRef} onAdd={(nome, tipo) => addTarefa({ nome, nivel: 1, tipo_tarefa: tipo })} loading={saving}/>}
              </div>

              {/* Gantt */}
              <div className="absolute inset-0 overflow-hidden" style={{ display: subView === 'split' ? 'block' : 'none' }}>
                <GanttCanvasPanel
                  tarefas={tarefas} dependencias={dependencias}
                  selectedId={selectedTarefaId} onSelectTarefa={setSelectedTarefaId}
                  onOpenDrawer={setDrawerTarefa} childrenOf={childrenOf}
                  onUpdateDates={(id, start, end) => {
                    updateTarefa(id, { data_inicio: start, data_fim: end, duracao_dias: differenceInDays(parseISO(end), parseISO(start)) + 1 });
                    applyDateCascade(id, start, end);
                  }}
                  onAddDependencia={addDependencia}
                />
              </div>

              {/* Curva S */}
              <div className="absolute inset-0 overflow-auto px-5 py-5" style={{ display: subView === 'curvs' ? 'block' : 'none' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-primary"/>
                  <span className="text-sm font-semibold text-foreground">Curva S — Avanço Planejado vs. Realizado</span>
                </div>
                <CurvaS tarefas={tarefas}/>
              </div>

            </div>
          </div>

          {/* ── ABA IMPEDIMENTOS ──────────────────────────────────────── */}
          <div className="absolute inset-0 overflow-auto px-5 py-5" style={{ display: mainTab === 'impedimentos' ? 'block' : 'none' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500"/>
                <span>Gestão de Impedimentos</span>
                <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/5 border-amber-500/20">
                  {impedimentos.length} registros
                </Badge>
              </div>
            </div>

            {impedimentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center border border-dashed border-border rounded-2xl bg-muted/10">
                <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-500/40"/>
                </div>
                <p className="text-sm text-muted-foreground font-medium">Nenhum impedimento registrado.</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs">Registre paralisações por chuva, falta de material ou projetos para calcular o impacto no cronograma.</p>
                <button
                  onClick={() => setIsAddingImpedimento(true)}
                  className="mt-2 px-4 py-2 bg-amber-600/10 text-amber-600 hover:bg-amber-600/20 rounded-lg text-xs font-semibold transition-colors"
                >
                  + Registrar primeiro impedimento
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {impedimentos.map(imp => {
                  const tarefa = tarefas.find(t => t.id === imp.tarefa_id);
                  return (
                    <div key={imp.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-500">{imp.categoria}</Badge>
                           <span className="text-sm font-semibold text-foreground truncate">{tarefa?.nome || 'Tarefa removida'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{imp.descricao}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> Início: {parseISO(imp.data_inicio).toLocaleDateString()}</span>
                          {imp.data_fim && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600"/> Resolvido: {parseISO(imp.data_fim).toLocaleDateString()}</span>}
                          {!imp.data_fim && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3"/> Em aberto</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:border-l md:pl-4 border-border shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Impacto</span>
                          <span className="text-sm font-bold text-foreground">
                            {imp.data_fim
                              ? differenceInDays(parseISO(imp.data_fim), parseISO(imp.data_inicio)) + 1
                              : differenceInDays(new Date(), parseISO(imp.data_inicio)) + 1} dias
                          </span>
                        </div>
                        {!imp.resolvido && (
                           <button
                             onClick={() => updateImpedimento(imp.id, { resolvido: true, data_fim: new Date().toISOString().split('T')[0] })}
                             className="px-3 py-1.5 bg-green-600/10 text-green-600 hover:bg-green-600 text-xs font-medium rounded-lg transition-colors hover:text-white"
                           >
                             Resolver
                           </button>
                        )}
                        <button onClick={() => deleteImpedimento(imp.id)} className="p-2 text-muted-foreground/40 hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── ABA ACOMPANHAMENTO (Medição) ───────────────────────────── */}
          <div className="absolute inset-0 overflow-hidden" style={{ display: mainTab === 'medicao' ? 'flex' : 'none', flexDirection: 'column' }}>
            <MedicaoTab
              obraId={obra.id}
              tarefas={tarefas}
              hasBaseline={stats.hasBaseline}
              saveBaseline={saveBaseline}
              onMedicaoConfirmada={() => refresh()}
            />
          </div>

        </div>
      )}

      {/* Modal Novo Impedimento */}
      <Dialog open={isAddingImpedimento} onOpenChange={setIsAddingImpedimento}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Registrar Impedimento
            </DialogTitle>
            <DialogDescription>
              Relate uma causa que impeça ou atrase a execução desta tarefa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tarefa">Tarefa Impactada</Label>
              <Select value={newImpedimento.tarefa_id} onValueChange={(val) => setNewImpedimento({...newImpedimento, tarefa_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a tarefa..." />
                </SelectTrigger>
                <SelectContent>
                  {tarefas.filter(t => t.tipo_tarefa === 'PADRAO').map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={newImpedimento.categoria} onValueChange={(val: 'climatico' | 'projeto' | 'material' | 'mao_de_obra' | 'financeiro' | 'outros') => setNewImpedimento({...newImpedimento, categoria: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="climatico">Climático</SelectItem>
                      <SelectItem value="material">Falta de Material</SelectItem>
                      <SelectItem value="mao_de_obra">Falta de Mão de Obra</SelectItem>
                      <SelectItem value="projeto">Definição de Projeto</SelectItem>
                      <SelectItem value="financeiro">Fluxo de Caixa</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  type="date"
                  id="data_inicio"
                  value={newImpedimento.data_inicio}
                  onChange={(e) => setNewImpedimento({...newImpedimento, data_inicio: e.target.value})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição / Detalhes</Label>
              <Textarea
                id="descricao"
                placeholder="Ex: Chuva intensa impediu concretagem da laje..."
                value={newImpedimento.descricao}
                onChange={(e) => setNewImpedimento({...newImpedimento, descricao: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsAddingImpedimento(false)}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                if (!newImpedimento.tarefa_id || !newImpedimento.descricao) return;
                await addImpedimento({
                  obra_id: selectedObraId!,
                  tarefa_id: newImpedimento.tarefa_id,
                  categoria: newImpedimento.categoria,
                  descricao: newImpedimento.descricao,
                  data_inicio: newImpedimento.data_inicio,
                  data_fim: null,
                  resolvido: false,
                });
                setIsAddingImpedimento(false);
                setNewImpedimento({
                  tarefa_id: '',
                  categoria: 'climatico',
                  descricao: '',
                  data_inicio: new Date().toISOString().split('T')[0],
                });
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
            >
              Salvar Registro
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {drawerTarefa && (
        <TaskDetailDrawer
          tarefa={drawerTarefa} obraId={selectedObraId}
          dependencias={dependencias} todasTarefas={tarefas}
          alocacoes={getAlocacoesDaTarefa(drawerTarefa.id)} recursos={recursos}
          recursosSupelalocados={recursosSupelalocados()}
          onClose={() => setDrawerTarefa(null)}
          onUpdate={(id, changes) => { updateTarefa(id, changes); setDrawerTarefa(prev => prev ? { ...prev, ...changes } : null); }}
          onAddDependencia={addDependencia} onRemoveDependencia={removeDependencia}
          onAddAlocacao={addAlocacao} onRemoveAlocacao={removeAlocacao}
        />
      )}

      {obra && (
        <DrawerEstimarDuracoes
          open={drawerEstimarOpen}
          onOpenChange={setDrawerEstimarOpen}
          tarefas={tarefas}
          obraId={obra.id}
          onAplicar={handleAplicarEstimativas}
        />
      )}
    </PageShell>
    </TooltipProvider>
  );
}
