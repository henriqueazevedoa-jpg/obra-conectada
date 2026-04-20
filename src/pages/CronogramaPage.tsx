import { useState, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useCronograma, CronogramaTarefa, TipoTarefa } from '@/hooks/useCronograma';
import { useRecursos } from '@/hooks/useRecursos';
import { useGanttFinanceiro } from '@/hooks/useGanttFinanceiro';
import { parseISO, differenceInDays, isBefore } from 'date-fns';
import {
  CalendarDays, AlertTriangle, CheckCircle2, Clock, Plus,
  Save, ChevronDown, ChevronRight, BarChart3, List, Pencil,
  Lock, Unlock, MoreHorizontal, Trash2, Link2, Users, TrendingUp, Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import NoObraState from '@/components/obras/NoObraState';
import TaskDetailDrawer from '@/components/cronograma/TaskDetailDrawer';
import GanttCanvasPanel, { computeCriticalPath } from '@/components/cronograma/GanttCanvasPanel';
import CurvaS from '@/components/cronograma/CurvaS';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI, PageAction } from '@/components/layout/PageShell';

// ─── Status Config ───────────────────────────────────────────────────────────

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

// ─── WBS Row ─────────────────────────────────────────────────────────────────

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
  const { tarefas, dependencias, loading, saving, addTarefa, updateTarefa, deleteTarefa, addDependencia, removeDependencia, applyDateCascade, saveBaseline, unlockBaseline, stats } = useCronograma(selectedObraId);
  const { recursos, alocacoes, addAlocacao, removeAlocacao, getAlocacoesDaTarefa, recursosSupelalocados } = useRecursos(selectedObraId);
  const { byEtapa: financeiroByEtapa } = useGanttFinanceiro(selectedObraId);

  const obra = obras.find(o => o.id === selectedObraId);
  const [viewMode, setViewMode] = useState<'split' | 'gantt' | 'list' | 'curvs' | 'recursos'>('split');
  const [selectedTarefaId, setSelectedTarefaId] = useState<string | null>(null);
  const [drawerTarefa, setDrawerTarefa] = useState<CronogramaTarefa | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const addTaskRef = useRef<AddTaskInlineHandle>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const triggerAddTask = useCallback((tipo: TipoTarefa = 'PADRAO') => {
    if (viewMode !== 'list') setViewMode('list');
    requestAnimationFrame(() => {
      listScrollRef.current?.scrollTo({ top: listScrollRef.current.scrollHeight, behavior: 'smooth' });
      setTimeout(() => addTaskRef.current?.activate(tipo), 80);
    });
  }, [viewMode]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
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
      icon: <AlertTriangle style={{ width: 16, height: 16, color: stats.tasksAtrasadas > 0 ? '#A32D2D' : '#3B6D11' }}/>,
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

  // ── Ações header: apenas Exportar (ghost) ─────────────────────────────────
  const headerActions: PageAction[] = [
    { label: 'Exportar', variant: 'ghost', onClick: () => {} },
  ];

  // ── L3a — Toolbar de página (+ Tarefa + ⋯ Baseline) ──────────────────────
  const pageToolbar = obra ? (
    <>
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

      <div style={{ flex: 1 }}/>

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

  // ── Abas ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'split',    label: 'Gantt',    icon: <BarChart3 style={{ width: 13, height: 13 }}/> },
    { id: 'list',     label: 'Lista',    icon: <List style={{ width: 13, height: 13 }}/> },
    { id: 'curvs',    label: 'Curva S',  icon: <TrendingUp style={{ width: 13, height: 13 }}/> },
    { id: 'recursos', label: 'Recursos', icon: <Users style={{ width: 13, height: 13 }}/> },
  ];

  return (
    <TooltipProvider>
    <PageShell
      icon={CronogramaIcon}
      title="Cronograma"
      tabs={tabs}
      activeTab={viewMode}
      onTabChange={id => setViewMode(id as typeof viewMode)}
      actions={headerActions}
      kpis={kpis}
      toolbar={pageToolbar}
    >
      {!obra ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <NoObraState title="Nenhuma obra selecionada" description="Selecione ou cadastre uma obra para gerenciar o cronograma."/>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

          {/* L3b — Toolbar do Gantt (só na view Gantt) */}
          {(viewMode === 'split' || viewMode === 'gantt') && (
            <div id="gantt-toolbar-portal" style={{
              flexShrink: 0,
              background: 'var(--color-background-secondary)',
              borderBottom: '0.5px solid var(--color-border-secondary)',
            }}/>
          )}

          {/* Conteúdo — views sempre montadas */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

            {/* Lista */}
            <div ref={listScrollRef} className="absolute inset-0 flex flex-col overflow-y-auto" style={{ display: viewMode === 'list' ? 'flex' : 'none' }}>
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
            <div className="absolute inset-0 overflow-hidden" style={{ display: (viewMode === 'split' || viewMode === 'gantt') ? 'block' : 'none' }}>
              <GanttCanvasPanel
                tarefas={tarefas} dependencias={dependencias}
                selectedId={selectedTarefaId} onSelectTarefa={setSelectedTarefaId}
                onOpenDrawer={setDrawerTarefa} childrenOf={childrenOf}
                onUpdateDates={(id, start, end) => {
                  updateTarefa(id, { data_inicio: start, data_fim: end, duracao_dias: differenceInDays(parseISO(end), parseISO(start)) + 1 });
                  applyDateCascade(id, start, end);
                }}
                onAddDependencia={addDependencia}
                toolbarPortalId="gantt-toolbar-portal"
              />
            </div>

            {/* Curva S */}
            <div className="absolute inset-0 overflow-auto px-5 py-5" style={{ display: viewMode === 'curvs' ? 'block' : 'none' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary"/>
                <span className="text-sm font-semibold text-foreground">Curva S — Avanço Planejado vs. Realizado</span>
              </div>
              <CurvaS tarefas={tarefas}/>
            </div>

            {/* Recursos */}
            <div className="absolute inset-0 overflow-auto px-5 py-5" style={{ display: viewMode === 'recursos' ? 'block' : 'none' }}>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-primary"/>
                <span className="text-sm font-semibold text-foreground">Alocação de Recursos</span>
                <Badge variant="secondary" className="text-[10px]">{recursos.length} recursos</Badge>
              </div>
              {recursos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/30"/>
                  <p className="text-sm text-muted-foreground">Nenhum recurso cadastrado.</p>
                  <p className="text-xs text-muted-foreground/70">Cadastre equipes e equipamentos nas tarefas via painel de detalhes.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recursos.map(rec => {
                    const overloaded = recursosSupelalocados().has(rec.id);
                    const myAlocacoes = alocacoes.filter(a => a.recurso_id === rec.id);
                    const totalUso = myAlocacoes.reduce((s, a) => s + a.quantidade, 0);
                    const pct = Math.round((totalUso / rec.capacidade_diaria) * 100);
                    return (
                      <div key={rec.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: rec.cor }}/>
                        <span className="text-sm text-foreground w-48 truncate">{rec.nome}</span>
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', overloaded ? 'bg-[#A32D2D]' : 'bg-[#534AB7]')} style={{ width: `${Math.min(pct, 100)}%` }}/>
                        </div>
                        <span className={cn('text-xs w-14 text-right font-medium', overloaded ? 'text-[#A32D2D]' : 'text-muted-foreground')}>
                          {pct}%{overloaded ? ' ⚠' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

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
    </PageShell>
    </TooltipProvider>
  );
}
