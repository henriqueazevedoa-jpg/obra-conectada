import { useState, useRef, useMemo, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useCronograma, CronogramaTarefa, TipoTarefa } from '@/hooks/useCronograma';
import { useRecursos } from '@/hooks/useRecursos';
import { useGanttFinanceiro } from '@/hooks/useGanttFinanceiro';
import { useCompany } from '@/contexts/CompanyContext';
import { parseISO, differenceInDays, isBefore, format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  CalendarDays, AlertTriangle, CheckCircle2, Clock, Plus,
  Save, ChevronDown, ChevronRight, BarChart3, List, Pencil,
  Lock, Unlock, MoreHorizontal, Trash2, Link2, TrendingUp, Loader2,
  ClipboardCheck, Wand2, Presentation, FileText, DollarSign, Play,
  Download, LineChart, BarChart2
} from 'lucide-react';
import ModoApresentacao from '@/components/cronograma/ModoApresentacao';
import ImportarOrcamentoDialog from '@/components/cronograma/ImportarOrcamentoDialog';

import FluxoProjetadoTab from '@/components/cronograma/FluxoProjetadoTab';
import { gerarPropostaComercial } from '@/lib/pdf/propostaComercialPdf';
import { gerarCronogramaPdf } from '@/lib/pdf/cronogramaPdf';
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
import CronogramaImportWizard from '@/components/cronograma/CronogramaImportWizard';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import NoObraState from '@/components/obras/NoObraState';
import TaskDetailDrawer from '@/components/cronograma/TaskDetailDrawer';
import GanttCanvasPanel, { computeCriticalPath } from '@/components/cronograma/GanttCanvasPanel';
import CurvaS from '@/components/cronograma/CurvaS';
import MedicaoTab from '@/components/cronograma/MedicaoTab';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI, PageAction } from '@/components/layout/PageShell';
import DrawerEstimarDuracoes, { EstimaUpdate } from '@/components/cronograma/DrawerEstimarDuracoes';
import CalendarioObraTab from '@/components/cronograma/CalendarioObraTab';
import BaselineConfirmModal from '@/components/cronograma/BaselineConfirmModal';


// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = 'gantt' | 'acompanhamento' | 'impedimentos' | 'desempenho';

// Chaves de persistência
const VIEW_LIST_KEY   = 'cron_view_list';
const VIEW_GANTT_KEY  = 'cron_view_gantt';
const VIEW_CURVA_KEY  = 'cron_view_curva';
const VIEW_FLUXO_KEY  = 'cron_view_fluxo';

function readBool(key: string, fallback: boolean): boolean {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; } catch { return fallback; }
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

function fmtD(s: string | null | undefined): string {
  if (!s) return '—';
  try { return format(parseISO(s), 'dd/MM'); } catch { return '—'; }
}

function InlineDateCell({ value, onChange, red }: { value: string | null | undefined; onChange: (v: string) => void; red?: boolean }) {
  const d = (() => { try { return value ? parseISO(value) : undefined; } catch { return undefined; } })();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button onClick={e => e.stopPropagation()} className={cn('text-[10px] tabular-nums px-1 h-6 rounded border border-transparent hover:border-border hover:bg-muted/40 transition-colors min-w-[46px] text-center block', value ? (red ? 'text-red-500 font-semibold' : 'text-muted-foreground') : 'text-muted-foreground/30')}>
          {d ? format(d, 'dd/MM') : '—'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center" side="bottom" onClick={e => e.stopPropagation()}>
        <Calendar mode="single" selected={d} onSelect={day => day && onChange(format(day, 'yyyy-MM-dd'))} locale={ptBR} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

interface WBSRowProps {
  tarefa: CronogramaTarefa;
  allTarefas: CronogramaTarefa[];
  expandedIds: Set<string>;
  selectedId: string | null;
  checkedIds: Set<string>;
  criticalIds: Set<string>;
  dragId: string | null;
  dragOverId: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onUpdate: (id: string, changes: Partial<CronogramaTarefa>) => void;
  onDelete: (id: string) => void;
  onOpenDrawer: (t: CronogramaTarefa) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  onAddBelow: (parentId: string | null, nivel: number, ordem: number, tipo: TipoTarefa) => void;
}

function WBSRow({ tarefa, allTarefas, expandedIds, selectedId, checkedIds, criticalIds, dragId, dragOverId, onToggleExpand, onSelect, onToggleCheck, onUpdate, onDelete, onOpenDrawer, onDragStart, onDragOver, onDrop, onAddBelow }: WBSRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const children = useMemo(() => allTarefas.filter(t => t.parent_tarefa_id === tarefa.id).sort((a,b) => a.ordem - b.ordem), [allTarefas, tarefa.id]);
  const status = computeStatusTarefa(tarefa);
  const cfg = STATUS_CONFIG[status];
  const isExpanded = expandedIds.has(tarefa.id);
  const isSelected = selectedId === tarefa.id;
  const isChecked = checkedIds.has(tarefa.id);
  const isCritico = criticalIds.has(tarefa.id);
  const isDragging = dragId === tarefa.id;
  const isDragOver = dragOverId === tarefa.id;
  const hasChildren = children.length > 0;
  const isSummary = tarefa.tipo_tarefa === 'RESUMO' || hasChildren;
  const isMilestone = tarefa.tipo_tarefa === 'MARCO';
  const indent = Math.min((tarefa.nivel - 1) * 14, 70);
  return (
    <>
      <div
        tabIndex={0}
        onDragOver={e => { e.preventDefault(); onDragOver(tarefa.id); }}
        onDrop={e => { e.preventDefault(); onDrop(tarefa.id); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddBelow(tarefa.parent_tarefa_id ?? null, tarefa.nivel, tarefa.ordem + 1, 'PADRAO'); } }}
        className={cn('group grid border-b border-border/50 cursor-pointer transition-colors items-center outline-none focus-visible:ring-1 focus-visible:ring-primary/40', isSelected ? 'bg-primary/[0.06] border-l-2 border-l-primary' : 'hover:bg-muted/30', isSummary && !isSelected && 'bg-muted/[0.12]', isDragging && 'opacity-40', isDragOver && 'border-t-2 border-t-primary')}
        style={{ gridTemplateColumns: '20px 1fr 52px 52px 48px 88px', height: 38 }}
        onClick={() => onSelect(tarefa.id)}
      >
        <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <Checkbox checked={isChecked} onCheckedChange={() => onToggleCheck(tarefa.id)} className={cn('h-3.5 w-3.5 transition-opacity', isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')} />
        </div>
        <div className="flex items-center min-w-0">
          <div draggable onDragStart={e => { e.stopPropagation(); onDragStart(tarefa.id); }} onClick={e => e.stopPropagation()} className="shrink-0 w-3 h-3 flex items-center justify-center text-muted-foreground/20 hover:text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 mr-0.5">
            <svg width="6" height="10" viewBox="0 0 8 12" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/></svg>
          </div>
          <div style={{ width: indent, flexShrink: 0 }} />
          <button className={cn('h-5 w-5 flex items-center justify-center shrink-0 text-muted-foreground hover:bg-muted/50 rounded', !hasChildren && 'opacity-0 pointer-events-none')} onClick={e => { e.stopPropagation(); onToggleExpand(tarefa.id); }}>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5"/> : <ChevronRight className="h-3.5 w-3.5"/>}
          </button>
          {/* Tag de tipo permanente — P2.5 */}
          <span className={cn(
            'shrink-0 text-[8px] font-bold tabular-nums mr-1 px-1 py-0.5 rounded select-none',
            isMilestone
              ? 'text-amber-600 bg-amber-500/10'
              : isSummary
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground/60'
          )}>
            {isMilestone ? '◆' : isSummary ? '≡' : '▬'}
          </span>
          <span className={cn('flex-1 text-xs truncate min-w-0', isSummary ? 'font-semibold' : 'text-foreground/90', isMilestone && 'italic')} title={tarefa.nome} onDoubleClick={e => { e.stopPropagation(); onOpenDrawer(tarefa); }}>{tarefa.nome}</span>
          {tarefa.dias_impedidos > 0 && (<Tooltip><TooltipTrigger asChild><div className="flex items-center h-3.5 px-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0 ml-1"><AlertTriangle className="h-2 w-2 mr-0.5"/><span className="text-[8px] font-bold">{tarefa.dias_impedidos}d</span></div></TooltipTrigger><TooltipContent side="left" className="text-[10px]">Impedido {tarefa.dias_impedidos}d</TooltipContent></Tooltip>)}
        </div>
        <div className="flex justify-center" onClick={e => e.stopPropagation()}>
          <InlineDateCell value={tarefa.data_inicio} onChange={v => {
            const changes: Partial<CronogramaTarefa> = { data_inicio: v };
            try {
              if (tarefa.duracao_dias && tarefa.duracao_dias > 0) {
                changes.data_fim = format(addDays(parseISO(v), tarefa.duracao_dias - 1), 'yyyy-MM-dd');
              } else if (tarefa.data_fim) {
                const dur = differenceInDays(parseISO(tarefa.data_fim), parseISO(v)) + 1;
                if (dur > 0) changes.duracao_dias = dur;
              }
            } catch {}
            onUpdate(tarefa.id, changes);
          }} />
        </div>
        <div className="flex justify-center" onClick={e => e.stopPropagation()}>
          <InlineDateCell value={tarefa.data_fim} onChange={v => {
            const changes: Partial<CronogramaTarefa> = { data_fim: v };
            try {
              if (tarefa.data_inicio) {
                const dur = differenceInDays(parseISO(v), parseISO(tarefa.data_inicio)) + 1;
                if (dur > 0) changes.duracao_dias = dur;
              }
            } catch {}
            onUpdate(tarefa.id, changes);
          }} red={status === 'atrasada'} />
        </div>
        <div className="flex justify-center" onClick={e => e.stopPropagation()}>
          {/* P3.5 — Duração com unidade 'd' visível */}
          <div className="flex items-center">
            <input type="number" min={1} value={tarefa.duracao_dias || ''} onChange={e => {
              const dur = Number(e.target.value) || null;
              const changes: Partial<CronogramaTarefa> = { duracao_dias: dur };
              try {
                if (dur && dur > 0 && tarefa.data_inicio) {
                  changes.data_fim = format(addDays(parseISO(tarefa.data_inicio), dur - 1), 'yyyy-MM-dd');
                }
              } catch {}
              onUpdate(tarefa.id, changes);
            }} placeholder="—" className="w-9 h-6 text-center text-[10px] border border-transparent rounded-l hover:border-border focus:border-primary focus:outline-none bg-transparent tabular-nums text-muted-foreground" />
            {tarefa.duracao_dias ? <span className="text-[9px] text-muted-foreground/50 pr-0.5">d</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-0.5 px-1">
          <div className="flex items-center gap-1 flex-1 group-hover:hidden">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full', isCritico ? 'bg-orange-500' : cfg.bar)} style={{ width: `${tarefa.percentual_concluido}%` }}/></div>
            <span className="text-[9px] text-muted-foreground w-6 tabular-nums text-right">{tarefa.percentual_concluido}%</span>
          </div>
          <div className={cn("items-center gap-0.5 w-full justify-end", menuOpen ? "flex" : "hidden group-hover:flex")}>
            <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-primary" onClick={e => { e.stopPropagation(); onAddBelow(tarefa.parent_tarefa_id ?? null, tarefa.nivel, tarefa.ordem + 1, 'PADRAO'); }} title="Inserir abaixo"><Plus className="h-3 w-3"/></button>
            <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-primary" onClick={e => { e.stopPropagation(); onOpenDrawer(tarefa); }} title="Editar"><Pencil className="h-3 w-3"/></button>
            <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-500" onClick={e => { e.stopPropagation(); onDelete(tarefa.id); }} title="Remover"><Trash2 className="h-3 w-3"/></button>
            <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground"/>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-44" onClick={e => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onAddBelow(tarefa.id, tarefa.nivel + 1, 1, 'PADRAO')}><Plus className="h-3 w-3 mr-2"/>Inserir subtarefa</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddBelow(tarefa.parent_tarefa_id ?? null, tarefa.nivel, tarefa.ordem + 1, 'RESUMO')}><List className="h-3 w-3 mr-2"/>Inserir Grupo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddBelow(tarefa.parent_tarefa_id ?? null, tarefa.nivel, tarefa.ordem + 1, 'MARCO')}><span className="mr-2 text-[10px]">♦</span>Inserir Marco</DropdownMenuItem>
                <DropdownMenuSeparator/>
                <DropdownMenuItem><Link2 className="h-3 w-3 mr-2"/>Vincular Orçamento</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {isExpanded && children.map(c => <WBSRow key={c.id} tarefa={c} allTarefas={allTarefas} expandedIds={expandedIds} selectedId={selectedId} checkedIds={checkedIds} criticalIds={criticalIds} dragId={dragId} dragOverId={dragOverId} onToggleExpand={onToggleExpand} onSelect={onSelect} onToggleCheck={onToggleCheck} onUpdate={onUpdate} onDelete={onDelete} onOpenDrawer={onOpenDrawer} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onAddBelow={onAddBelow} />)}
    </>
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

interface ViewToggleProps {
  showList: boolean;
  showGantt: boolean;
  onToggleList: () => void;
  onToggleGantt: () => void;
}

function ViewToggle({ showList, showGantt, onToggleList, onToggleGantt }: ViewToggleProps) {
  const btn = (active: boolean, disabled: boolean, onClick: () => void, icon: React.ReactNode, label: string, title?: string) => (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        height: 26, padding: '0 9px',
        borderRadius: 6,
        border: active ? '1px solid rgba(83,74,183,0.25)' : '1px solid transparent',
        background: active ? 'var(--color-background-secondary)' : 'transparent',
        color: active ? '#534AB7' : disabled ? 'var(--color-text-tertiary,#bbb)' : 'var(--color-text-secondary)',
        fontSize: 11, fontWeight: active ? 600 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.12s',
        boxShadow: active ? '0 1px 3px rgba(83,74,183,0.12)' : 'none',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', background: 'var(--color-background-tertiary, #f3f4f6)', padding: 2, borderRadius: 8, gap: 2, border: '1px solid var(--color-border-secondary)' }}>
      {btn(showList, false, onToggleList, <List style={{ width: 13, height: 13 }}/>, 'EAP')}
      {btn(showGantt, false, onToggleGantt, <BarChart2 style={{ width: 13, height: 13, transform: 'rotate(90deg)' }}/>, 'Gantt')}
    </div>
  );
}

interface ViewToggleDesempenhoProps {
  showCurvaS: boolean;
  showFluxo: boolean;
  onToggleCurvaS: () => void;
  onToggleFluxo: () => void;
}

function ViewToggleDesempenho({ showCurvaS, showFluxo, onToggleCurvaS, onToggleFluxo }: ViewToggleDesempenhoProps) {
  const btn = (active: boolean, disabled: boolean, onClick: () => void, icon: React.ReactNode, label: string, title?: string) => (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        height: 26, padding: '0 9px',
        borderRadius: 6,
        border: active ? '1px solid rgba(83,74,183,0.25)' : '1px solid transparent',
        background: active ? 'var(--color-background-secondary)' : 'transparent',
        color: active ? '#534AB7' : disabled ? 'var(--color-text-tertiary,#bbb)' : 'var(--color-text-secondary)',
        fontSize: 11, fontWeight: active ? 600 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.12s',
        boxShadow: active ? '0 1px 3px rgba(83,74,183,0.12)' : 'none',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}{label}
    </button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px', background: 'var(--color-background-tertiary,rgba(0,0,0,0.06))', borderRadius: 8 }}>
      {btn(showCurvaS, false,       onToggleCurvaS, <TrendingUp style={{ width: 12, height: 12 }}/>, 'Curva S')}
      {btn(showFluxo,  false,       onToggleFluxo,  <LineChart style={{ width: 12, height: 12 }}/>,  'Fluxo')}
    </div>
  );
}


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
  const { company } = useCompany();
  const { tarefas: rawTarefas, dependencias, impedimentos, loading, saving, addTarefa, updateTarefa, deleteTarefa, addDependencia, updateDependencia, removeDependencia, addImpedimento, updateImpedimento, deleteImpedimento, applyDateCascade, reorderTarefas, saveBaseline, unlockBaseline, shiftTaskTree, stats, refresh } = useCronograma(selectedObraId);
  const [isAutoSchedule, setIsAutoSchedule] = useState(() => {
    const saved = localStorage.getItem('GANTT_AUTO_SCHEDULE');
    return saved ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('GANTT_AUTO_SCHEDULE', String(isAutoSchedule));
  }, [isAutoSchedule]);

  const tarefas = useMemo(() => {
    if (!isAutoSchedule) return rawTarefas;
    const taskMap = new Map<string, CronogramaTarefa>();
    const childrenMap = new Map<string, CronogramaTarefa[]>();
    
    rawTarefas.forEach(t => {
      taskMap.set(t.id, { ...t });
    });

    rawTarefas.forEach(t => {
      if (t.parent_tarefa_id) {
        if (!childrenMap.has(t.parent_tarefa_id)) childrenMap.set(t.parent_tarefa_id, []);
        childrenMap.get(t.parent_tarefa_id)!.push(taskMap.get(t.id)!);
      }
    });

    const computeNode = (id: string) => {
      const node = taskMap.get(id);
      if (!node) return;
      const children = childrenMap.get(id);
      if (children && children.length > 0) {
        children.forEach(c => computeNode(c.id));
        const childDates = children.flatMap(c => {
          const cNode = taskMap.get(c.id);
          return [cNode?.data_inicio, cNode?.data_fim].filter(Boolean) as string[];
        }).map(s => parseISO(s).getTime()).filter(n => !isNaN(n));
        
        if (childDates.length > 0) {
          const minD = new Date(Math.min(...childDates));
          const maxD = new Date(Math.max(...childDates));
          node.data_inicio = format(minD, 'yyyy-MM-dd');
          node.data_fim = format(maxD, 'yyyy-MM-dd');
          node.duracao_dias = differenceInDays(maxD, minD) + 1;
        } else {
          node.data_inicio = null;
          node.data_fim = null;
          node.duracao_dias = null;
        }
      }
    };

    rawTarefas.filter(t => !t.parent_tarefa_id).forEach(t => computeNode(t.id));
    return Array.from(taskMap.values());
  }, [rawTarefas, isAutoSchedule]);

  const { recursos, addAlocacao, removeAlocacao, getAlocacoesDaTarefa, recursosSupelalocados } = useRecursos(selectedObraId);
  const { byEtapa: financeiroByEtapa } = useGanttFinanceiro(selectedObraId);
  const [apresentacaoAtiva, setApresentacaoAtiva] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const toggleCheck = useCallback((id: string) => setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);

  const desvioEmDias = useMemo(() => {
    let maxBaseline: Date | null = null;
    let maxPrevisto: Date | null = null;
    tarefas.forEach(t => {
      if (t.baseline_fim) {
        const bd = parseISO(t.baseline_fim);
        if (!maxBaseline || bd > maxBaseline) maxBaseline = bd;
      }
      if (t.data_fim) {
        const pd = parseISO(t.data_fim);
        if (!maxPrevisto || pd > maxPrevisto) maxPrevisto = pd;
      }
    });
    if (maxBaseline && maxPrevisto) {
      return differenceInDays(maxPrevisto, maxBaseline);
    }
    return null;
  }, [tarefas]);



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
  const [mainTab, setMainTab] = useState<MainTab>('gantt');
  const [showList,   setShowList]   = useState(() => readBool(VIEW_LIST_KEY,  true));
  const [showGantt,  setShowGantt]  = useState(() => readBool(VIEW_GANTT_KEY, true));
  const [showCurvaS, setShowCurvaS] = useState(() => readBool(VIEW_CURVA_KEY,  true));
  const [showFluxo,  setShowFluxo]  = useState(() => readBool(VIEW_FLUXO_KEY,  false));

  const toggleList   = useCallback(() => { const v = !showList;   setShowList(v);   try { localStorage.setItem(VIEW_LIST_KEY,  v ? '1' : '0'); } catch {} }, [showList]);
  const toggleGantt  = useCallback(() => { const v = !showGantt;  setShowGantt(v);  try { localStorage.setItem(VIEW_GANTT_KEY, v ? '1' : '0'); } catch {} }, [showGantt]);
  const toggleCurvaS = useCallback(() => { const v = !showCurvaS; setShowCurvaS(v); try { localStorage.setItem(VIEW_CURVA_KEY, v ? '1' : '0'); } catch {} }, [showCurvaS]);
  const toggleFluxo  = useCallback(() => { const v = !showFluxo;  setShowFluxo(v);  try { localStorage.setItem(VIEW_FLUXO_KEY, v ? '1' : '0'); } catch {} }, [showFluxo]);

  const [selectedTarefaId, setSelectedTarefaId] = useState<string | null>(null);
  const [drawerTarefa, setDrawerTarefa] = useState<CronogramaTarefa | null>(null);
  const [drawerEstimarOpen, setDrawerEstimarOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const addTaskRef = useRef<AddTaskInlineHandle>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // ── Sync Vertical Scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const listEl = listScrollRef.current;
    const ganttEl = ganttScrollRef.current;
    if (!listEl || !ganttEl || !showList || !showGantt) return;

    let isSyncingList = false;
    let isSyncingGantt = false;

    const onListScroll = () => {
      if (isSyncingList) { isSyncingList = false; return; }
      isSyncingGantt = true;
      ganttEl.scrollTop = listEl.scrollTop;
    };

    const onGanttScroll = () => {
      if (isSyncingGantt) { isSyncingGantt = false; return; }
      isSyncingList = true;
      listEl.scrollTop = ganttEl.scrollTop;
    };

    listEl.addEventListener('scroll', onListScroll, { passive: true });
    ganttEl.addEventListener('scroll', onGanttScroll, { passive: true });

    return () => {
      listEl.removeEventListener('scroll', onListScroll);
      ganttEl.removeEventListener('scroll', onGanttScroll);
    };
  }, [showList, showGantt]);

  // ── Bulk Actions State ──────────────────────────────────────────────────
  const [bulkProgress, setBulkProgress] = useState(100);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Tem certeza que deseja excluir ${checkedIds.size} tarefas?`)) return;
    const array = Array.from(checkedIds);
    for (const id of array) {
      await deleteTarefa(id);
    }
    setCheckedIds(new Set());
  }, [checkedIds, deleteTarefa]);

  const handleBulkProgress = useCallback(async () => {
    const array = Array.from(checkedIds);
    for (const id of array) {
      await updateTarefa(id, { percentual_concluido: bulkProgress });
    }
    setCheckedIds(new Set());
  }, [checkedIds, updateTarefa, bulkProgress]);

  // ── Import: resolve parent_tarefa_id sequentially ─────────────────────────
  const handleImportarOrcamento = useCallback(async (tarefasParaImportar: Partial<CronogramaTarefa>[]) => {
    // Map from placeholder __parent:<orcId> → real cronograma task id
    const idMap = new Map<string, string>(); // orcamento node id → cronograma tarefa id

    for (const partial of tarefasParaImportar) {
      // Resolve parent placeholder
      let parentId = partial.parent_tarefa_id ?? null;
      if (parentId?.startsWith('__parent:')) {
        const orcId = parentId.replace('__parent:', '');
        parentId = idMap.get(orcId) ?? null;
      }

      const created = await addTarefa({
        ...partial,
        parent_tarefa_id: parentId,
      });

      // Register the created id so children can reference it
      const orcId = partial.orcamento_categoria_id ?? partial.orcamento_composicao_id;
      if (orcId && created?.id) idMap.set(orcId, created.id);
    }
  }, [addTarefa]);

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
    // Garante estar na sub-view Lista e na aba Planejamento (Gantt)
    if (mainTab !== 'gantt') setMainTab('gantt');
    if (!showList) toggleList();
    requestAnimationFrame(() => {
      listScrollRef.current?.scrollTo({ top: listScrollRef.current.scrollHeight, behavior: 'smooth' });
      setTimeout(() => addTaskRef.current?.activate(tipo), 80);
    });
  }, [mainTab, showList, toggleList]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleAddBelow = useCallback((parentId: string | null, nivel: number, ordem: number, tipo: TipoTarefa) => {
    addTarefa({ nome: tipo === 'MARCO' ? 'Novo Marco' : tipo === 'RESUMO' ? 'Nova Fase' : 'Nova Tarefa', nivel, tipo_tarefa: tipo, ...(parentId ? { parent_tarefa_id: parentId } : {}), ordem });
  }, [addTarefa]);

  const rootTarefas = useMemo(() => tarefas.filter(t => !t.parent_tarefa_id).sort((a, b) => a.ordem - b.ordem), [tarefas]);
  const childrenOf = useCallback((parentId: string) => tarefas.filter(t => t.parent_tarefa_id === parentId).sort((a, b) => a.ordem - b.ordem), [tarefas]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);


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
    ...(desvioEmDias !== null ? [{
      id: 'desvio',
      label: 'Desvio (Dias)',
      value: `${desvioEmDias > 0 ? '+' : ''}${desvioEmDias}d`,
      icon: <AlertTriangle style={{ width: 16, height: 16, color: desvioEmDias > 0 ? '#A32D2D' : '#3B6D11' }}/>,
      tint: desvioEmDias > 0 ? '#FCEBEB' : '#EAF3DE',
      valueColor: desvioEmDias > 0 ? '#A32D2D' : '#3B6D11',
      labelColor: desvioEmDias > 0 ? '#A32D2D' : '#3B6D11',
    }] : []),
  ] : [];

  // ── PDF handlers ─────────────────────────────────────────────────────────
  const handleGerarProposta = useCallback(() => {
    if (!obra || !company) return;
    gerarPropostaComercial(
      { nome: obra.nome, responsavel: (obra as any).responsavel, data_inicio: (obra as any).data_inicio, data_previsao_termino: (obra as any).data_previsao_termino },
      tarefas,
      { nome: company.nome, cnpj: (company as any).cnpj, email: (company as any).email, telefone: (company as any).telefone },
      tarefas.reduce((s, t) => s + (t.peso_orcamento || 0), 0),
    );
  }, [obra, tarefas, company]);

  const handleExportarCronograma = useCallback(() => {
    if (!obra || !company) return;
    gerarCronogramaPdf(
      { nome: obra.nome, responsavel: (obra as any).responsavel, data_inicio: (obra as any).data_inicio, data_previsao_termino: (obra as any).data_previsao_termino },
      tarefas,
      dependencias,
      { tipo: 'execucao', numero: 1 },
      { nome: company.nome, email: (company as any).email },
    );
  }, [obra, tarefas, dependencias, company]);


  // ── Ações header ──────────────────────────────────────────────────────────
  const headerActions: PageAction[] = [
    { label: 'Apresentar', variant: 'ghost', onClick: () => setApresentacaoAtiva(true) },
  ];

  // ── Toolbar planejamento ──────────────────────────────────────────────────
  const planejamentoToolbar = obra ? (
    <>
      {/* ── GRUPO PRIMÁRIO: Criar estrutura ── */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => handleAddBelow(null, 1, tarefas.length + 1, 'PADRAO')} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 12px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '6px 0 0 6px', fontSize: 12, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, whiteSpace: 'nowrap' }}>
              <Plus style={{ width: 12, height: 12 }}/> Tarefa
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px] max-w-[180px]">
            <p className="font-semibold mb-1">Atalhos de teclado</p>
            <p>Enter ↵ — nova tarefa abaixo</p>
            <p>Tab ↹ — indentar (filho)</p>
            <p>Shift+Tab — desindentar</p>
          </TooltipContent>
        </Tooltip>
        <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,.2)', flexShrink: 0 }}/>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 30, width: 28, background: '#534AB7', color: '#fff', border: 'none', borderRadius: '0 6px 6px 0', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
              <ChevronDown style={{ width: 12, height: 12 }}/>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => handleAddBelow(null, 1, tarefas.length + 1, 'RESUMO')}><span className="mr-2">≡</span>Grupo</DropdownMenuItem>
            <DropdownMenuSeparator/>
            <DropdownMenuItem onClick={() => handleAddBelow(null, 1, tarefas.length + 1, 'MARCO')}><span className="mr-2" style={{ color: '#854F0B' }}>◆</span>Marco</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── SEPARADOR ── */}
      <div style={{ width: 1, height: 20, background: 'var(--color-border-secondary)', flexShrink: 0 }} />

      {/* ── GRUPO SECUNDÁRIO: Ferramentas de suporte ── */}
      <button onClick={() => setDrawerEstimarOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <Wand2 style={{ width: 11, height: 11 }}/> Estimar
      </button>

      {selectedObraId && (
        <button onClick={() => setShowImportDialog(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Download style={{ width: 11, height: 11 }}/> Importar do Orçamento
        </button>
      )}

      <div style={{ width: 1, height: 20, background: 'var(--color-border-secondary)', margin: '0 8px' }} />

      <div className="flex items-center gap-2" title="Agendamento Automático: Pai se ajusta às datas das filhas.">
        <Switch 
          checked={isAutoSchedule} 
          onCheckedChange={setIsAutoSchedule} 
          className="scale-75 data-[state=checked]:bg-primary"
        />
        <span className="text-[11px] font-medium text-muted-foreground select-none cursor-pointer" onClick={() => setIsAutoSchedule(!isAutoSchedule)}>Automático</span>
      </div>


      {/* ── ESPAÇO FLEXÍVEL ── */}
      <div style={{ flex: 1 }}/>

      {/* Indicador de salvamento */}
      {saving && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--color-text-tertiary, #aaa)', fontWeight: 500 }}>
          <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }}/> Salvando…
        </div>
      )}

      {/* ── GRUPO VISUALIZAÇÃO ── */}
      <ViewToggle showList={showList} showGantt={showGantt} onToggleList={toggleList} onToggleGantt={toggleGantt} />

      {/* ── SEPARADOR ── */}
      <div style={{ width: 1, height: 20, background: 'var(--color-border-secondary)', flexShrink: 0 }} />

      {/* ── GRUPO CICLO DE VIDA ── */}
      {tarefas.length > 0 && (
        <button onClick={() => setApresentacaoAtiva(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Presentation style={{ width: 12, height: 12 }}/> Apresentar
        </button>
      )}
      {tarefas.length > 0 && (stats.hasBaseline ? (
        <button onClick={() => unlockBaseline()} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Unlock style={{ width: 12, height: 12 }}/> Editar Baseline
        </button>
      ) : (
        <button onClick={() => setShowBaselineModal(true)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: saving ? 0.6 : 1 }} onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#15803D'; }} onMouseLeave={e => { e.currentTarget.style.background = '#16A34A'; }}>
          <Play style={{ width: 11, height: 11 }}/> Iniciar Execução
        </button>
      ))}
    </>
  ) : undefined;


  // ── Toolbar Desempenho ──────────────────────────────────────────────────
  const desempenhoToolbar = obra ? (
    <>
      <div style={{ flex: 1 }}/>
      <ViewToggleDesempenho showCurvaS={showCurvaS} showFluxo={showFluxo} onToggleCurvaS={toggleCurvaS} onToggleFluxo={toggleFluxo} />
    </>
  ) : undefined;

  // ── Abas do PageShell ─────────────────────────────────────────────────────
  const tabs = [
    { id: 'gantt',         label: 'Planejamento (Gantt)', icon: <BarChart3 style={{ width: 13, height: 13 }}/> },
    { id: 'acompanhamento',label: 'Acompanhamento',        icon: <ClipboardCheck style={{ width: 13, height: 13 }}/> },
    { id: 'impedimentos',  label: 'Impedimentos',          icon: <AlertTriangle style={{ width: 13, height: 13 }}/> },
    { id: 'desempenho',    label: 'Desempenho & Fluxo',    icon: <LineChart style={{ width: 13, height: 13 }}/> },
  ];

  // ── Toolbar condicional por aba ────────────────────────────────────────────
  const activeToolbar =
    mainTab === 'gantt'         ? planejamentoToolbar :
    mainTab === 'desempenho'    ? desempenhoToolbar :
    mainTab === 'impedimentos'  ? (
      <button
        onClick={() => setIsAddingImpedimento(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Registrar Impedimento
      </button>
    ) : undefined;

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

          {/* ── ABA GANTT ──────────────────────────────────────── */}
          <div style={{ display: mainTab === 'gantt' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', animation: mainTab === 'gantt' ? 'tabFadeIn 0.12s ease' : undefined }}>

            {/* Toolbar do Gantt (portal, só quando gantt/split) */}
            {showGantt && (
              <div id="gantt-toolbar-portal" style={{
                flexShrink: 0,
                background: 'var(--color-background-secondary)',
                borderBottom: '0.5px solid var(--color-border-secondary)',
              }}/>
            )}

            {!loading && tarefas.length === 0 && (
              <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-full"><BarChart3 className="h-4 w-4 text-emerald-600" /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-800">Primeiros Passos</h4>
                    <p className="text-xs text-emerald-600">Importe seu orçamento para gerar o cronograma automaticamente.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800" onClick={() => triggerAddTask('PADRAO')}>
                    Criar manualmente
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowImportWizard(true)}>
                    Importar do Orçamento
                  </Button>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>

              {/* Lista — ocupa 40% quando split com Gantt, 100% quando sozinha */}
              {showList && (
                <div
                  ref={listScrollRef}
                  className="flex flex-col overflow-y-auto border-r border-border"
                  style={{ flex: showGantt ? '0 0 40%' : '1 1 100%', minWidth: 0 }}
                >
                  <div className="grid border-b border-border bg-muted/50 shrink-0 select-none" style={{ gridTemplateColumns: '20px 1fr 52px 52px 32px 88px', height: 50 }}>
                    <div className="flex items-center justify-center">
                      <Checkbox className="h-3.5 w-3.5" checked={checkedIds.size > 0 && checkedIds.size === tarefas.length} onCheckedChange={v => { if (v) setCheckedIds(new Set(tarefas.map(t => t.id))); else setCheckedIds(new Set()); }} />
                    </div>
                    <span className="flex items-center px-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Tarefa</span>
                    <span className="flex items-center justify-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Início</span>
                    <span className="flex items-center justify-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Fim</span>
                    <span className="flex items-center justify-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Dur.</span>
                    <span className="flex items-center px-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Progresso</span>
                  </div>
                  {loading && <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>}
                  {!loading && tarefas.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
                      <BarChart3 className="h-10 w-10 text-muted-foreground/30"/>
                      <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>
                      <p className="text-xs text-muted-foreground/70">Use o botão "+ Tarefa" para começar.</p>
                    </div>
                  )}
                  {tarefas.filter(t => !t.parent_tarefa_id).sort((a,b) => a.ordem - b.ordem).map(tarefa => (
                    <WBSRow
                      key={tarefa.id} tarefa={tarefa} allTarefas={tarefas}
                      expandedIds={expandedIds} selectedId={selectedTarefaId}
                      checkedIds={checkedIds} criticalIds={criticalIds}
                      dragId={dragId} dragOverId={dragOverId}
                      onToggleExpand={toggleExpand} onSelect={setSelectedTarefaId} onToggleCheck={toggleCheck}
                      onUpdate={updateTarefa} onDelete={deleteTarefa} onOpenDrawer={setDrawerTarefa}
                      onDragStart={setDragId} onDragOver={setDragOverId}
                      onDrop={targetId => { if (dragId) reorderTarefas(dragId, targetId); setDragId(null); setDragOverId(null); }}
                      onAddBelow={handleAddBelow}
                    />
                  ))}
                  {!loading && <AddTaskInline ref={addTaskRef} onAdd={(nome, tipo) => addTarefa({ nome, nivel: 1, tipo_tarefa: tipo })} loading={saving}/>}

                   {/* Bulk Actions Toolbar */}
                   {checkedIds.size > 0 && (
                     <div className="sticky bottom-0 left-0 right-0 bg-primary text-primary-foreground p-2 px-4 flex items-center justify-between shadow-md z-10 text-xs">
                       <div className="flex items-center gap-2">
                         <span className="font-semibold">{checkedIds.size} selecionadas</span>
                         <Button variant="ghost" size="sm" className="h-6 px-2 text-primary-foreground hover:bg-primary-foreground/20 hover:text-white text-[10px]" onClick={() => setCheckedIds(new Set())}>
                           Limpar
                         </Button>
                       </div>
                       <div className="flex items-center gap-2">
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button variant="secondary" size="sm" className="h-7 text-[10px] font-semibold gap-1">
                               Definir %
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent align="center" className="w-[200px] p-3 text-foreground" side="top">
                             <label className="text-[10px] font-semibold mb-2 block">Definir progresso em lote</label>
                             <div className="flex items-center gap-2 mb-3">
                               <Input type="number" min={0} max={100} placeholder="0-100" className="h-7 text-xs" id="bulk-progress-input" />
                               <span className="text-muted-foreground text-[10px]">%</span>
                             </div>
                             <Button size="sm" className="w-full h-7 text-[10px]" onClick={() => {
                               const inp = document.getElementById('bulk-progress-input') as HTMLInputElement;
                               const v = parseInt(inp?.value ?? '');
                               if (!isNaN(v)) { checkedIds.forEach(id => updateTarefa(id, { percentual_concluido: Math.max(0, Math.min(100, v)) })); setCheckedIds(new Set()); }
                             }}>Aplicar</Button>
                           </PopoverContent>
                         </Popover>
                         <Button variant="destructive" size="sm" className="h-7 text-[10px] font-semibold" onClick={() => { checkedIds.forEach(id => deleteTarefa(id)); setCheckedIds(new Set()); }}>
                           Excluir {checkedIds.size}
                         </Button>
                       </div>
                     </div>
                   )}
                 </div>
               )}

              {/* Gantt — painel direito */}
              {showGantt && (
                <div
                  ref={ganttScrollRef}
                  className="flex flex-col overflow-hidden"
                  style={{ flex: showList ? '1 1 60%' : '1 1 100%', minWidth: 0 }}
                >
                  <GanttCanvasPanel
                    tarefas={tarefas}
                    dependencias={dependencias}
                    selectedId={selectedTarefaId}
                    onSelectTarefa={setSelectedTarefaId}
                    onOpenDrawer={setDrawerTarefa}
                    onUpdateTarefa={(id, upd) => updateTarefa(id, upd)}
                    onShiftTree={shiftTaskTree}
                    onAddDependencia={addDependencia}
                    onRemoveDependencia={removeDependencia}
                    scrollRef={ganttScrollRef}
                    isAutoSchedule={isAutoSchedule}
                  />
                </div>
              )}
             </div>
           </div>

          {/* ── ABA IMPEDIMENTOS ────────────────────────────────────────── */}
          {(() => {
            const abertos = impedimentos.filter(i => !i.resolvido);
            const resolvidos = impedimentos.filter(i => i.resolvido);
            return (
              <div className="absolute inset-0 overflow-auto px-5 py-4" style={{ display: mainTab === 'impedimentos' ? 'block' : 'none' }}>
                {impedimentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center border border-dashed border-border rounded-2xl bg-muted/10">
                    <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-amber-500/40"/>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Nenhum impedimento registrado.</p>
                    <p className="text-xs text-muted-foreground/70 max-w-xs">Registre paralisações por chuva, falta de material ou projetos para calcular o impacto no cronograma.</p>
                    <button onClick={() => setIsAddingImpedimento(true)} className="mt-2 px-4 py-2 bg-amber-600/10 text-amber-600 hover:bg-amber-600/20 rounded-lg text-xs font-semibold transition-colors">
                      + Registrar primeiro impedimento
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Em Aberto */}
                    {abertos.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500"/>
                          <span className="text-xs font-semibold text-foreground">Em Aberto</span>
                          <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10">{abertos.length}</Badge>
                        </div>
                        <div className="space-y-2 mb-6">
                          {abertos.map(imp => {
                            const tarefa = tarefas.find(t => t.id === imp.tarefa_id);
                            const impact = differenceInDays(new Date(), parseISO(imp.data_inicio)) + 1;
                            return (
                              <div key={imp.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-900/10 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-amber-700 border-amber-400/40">{imp.categoria.replace('_', ' ')}</Badge>
                                    <span className="text-sm font-semibold text-foreground truncate">{tarefa?.nome || 'Tarefa removida'}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{imp.descricao}</p>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3"/> Desde {parseISO(imp.data_inicio).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 md:border-l md:pl-4 border-amber-200/60 shrink-0">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Impacto</span>
                                    <span className="text-sm font-bold text-amber-600">{impact}d</span>
                                  </div>
                                  <button onClick={() => updateImpedimento(imp.id, { resolvido: true, data_fim: new Date().toISOString().split('T')[0] })} className="px-3 py-1.5 bg-green-600/10 text-green-600 hover:bg-green-600 text-xs font-medium rounded-lg transition-colors hover:text-white">
                                    Resolver
                                  </button>
                                  <button onClick={() => deleteImpedimento(imp.id)} className="p-2 text-muted-foreground/40 hover:text-destructive transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Histórico */}
                    {resolvidos.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mb-3 mt-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600"/>
                          <span className="text-xs font-semibold text-foreground">Histórico Resolvido</span>
                          <Badge className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">{resolvidos.length}</Badge>
                        </div>
                        <div className="space-y-2 opacity-70">
                          {resolvidos.map(imp => {
                            const tarefa = tarefas.find(t => t.id === imp.tarefa_id);
                            const impact = imp.data_fim ? differenceInDays(parseISO(imp.data_fim), parseISO(imp.data_inicio)) + 1 : 0;
                            return (
                              <div key={imp.id} className="flex flex-col md:flex-row md:items-center gap-4 p-3 rounded-xl border border-border bg-card shadow-sm">
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-500">{imp.categoria.replace('_', ' ')}</Badge>
                                    <span className="text-sm font-medium text-foreground/70 truncate">{tarefa?.nome || 'Tarefa removida'}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground/70 line-clamp-1">{imp.descricao}</p>
                                </div>
                                <div className="flex items-center gap-3 md:border-l md:pl-4 border-border shrink-0">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Impacto</span>
                                    <span className="text-sm font-bold text-muted-foreground">{impact}d</span>
                                  </div>
                                  <button onClick={() => deleteImpedimento(imp.id)} className="p-2 text-muted-foreground/30 hover:text-destructive transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* ── ABA ACOMPANHAMENTO ───────────────────────────── */}
          <div className="absolute inset-0 overflow-hidden" style={{ display: mainTab === 'acompanhamento' ? 'flex' : 'none', flexDirection: 'column' }}>
            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
              <div className="flex-1 overflow-hidden flex flex-col border-b xl:border-b-0 xl:border-r border-border">
                {/* Cabeçalho do painel de Medição */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary"/>
                  <span className="text-xs font-semibold text-foreground">Medição de Avanço</span>
                  {stats.hasBaseline && (
                    <Badge variant="outline" className="text-[9px] text-primary border-primary/30 ml-auto">
                      {stats.progressoGeral}% concluído
                    </Badge>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <MedicaoTab
                    obraId={obra.id}
                    tarefas={tarefas}
                    hasBaseline={stats.hasBaseline}
                    saveBaseline={saveBaseline}
                    onMedicaoConfirmada={() => refresh()}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col bg-muted/10">
                {/* Cabeçalho do painel de Calendário */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground"/>
                  <span className="text-xs font-semibold text-foreground">Calendário de Trabalho</span>
                  <span className="text-[10px] text-muted-foreground ml-1">— dias úteis e feriados da obra</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  {selectedObraId && <CalendarioObraTab obraId={selectedObraId} />}
                </div>
              </div>
            </div>
          </div>


          {/* ── ABA DESEMPENHO ────────────────────────────────────────── */}
          <div className="absolute inset-0 overflow-hidden" style={{ display: mainTab === 'desempenho' ? 'flex' : 'none', flexDirection: 'column', background: 'var(--color-background-primary)', animation: mainTab === 'desempenho' ? 'tabFadeIn 0.12s ease' : undefined }}>
            {showCurvaS && (
              <div className="flex-1 overflow-hidden" style={{ borderBottom: showFluxo ? '1px solid var(--color-border-secondary)' : 'none', position: 'relative' }}>
                <CurvaS tarefas={tarefas} />
              </div>
            )}
            {showFluxo && (
              <div className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
                {selectedObraId && <FluxoProjetadoTab obraId={selectedObraId} />}
              </div>
            )}
            {!showCurvaS && !showFluxo && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <LineChart className="w-10 h-10 opacity-20" />
                <span className="text-sm">Selecione uma visão no menu superior (Curva S ou Fluxo)</span>
              </div>
            )}
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
          onAddDependencia={addDependencia} onRemoveDependencia={removeDependencia} onUpdateDependencia={updateDependencia}
          onAddAlocacao={addAlocacao} onRemoveAlocacao={removeAlocacao}
        />
      )}

      {/* Modo Apresentação */}
      {apresentacaoAtiva && obra && (
        <ModoApresentacao
          tarefas={tarefas}
          dependencias={dependencias}
          obraNome={obra.nome}
          progressoGeral={stats.progressoGeral}
          tasksAtrasadas={stats.tasksAtrasadas}
          spi={spi}
          onClose={() => setApresentacaoAtiva(false)}
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

      {selectedObraId && (
        <CronogramaImportWizard 
          obraId={selectedObraId} 
          open={showImportWizard} 
          onOpenChange={setShowImportWizard} 
        />
      )}

      <BaselineConfirmModal
        open={showBaselineModal}
        onOpenChange={setShowBaselineModal}
        title="Iniciar Execução"
        description="O plano será congelado como baseline de referência. As datas planejadas ficam registradas, desvios serão calculados automaticamente e medições de avanço serão desbloqueadas."
        onConfirm={async () => { await saveBaseline(); setShowBaselineModal(false); }}
        loading={saving}
      />

      {/* Importar Orçamento Dialog */}
      {showImportDialog && selectedObraId && (
        <ImportarOrcamentoDialog
          obraId={selectedObraId}
          onClose={() => setShowImportDialog(false)}
          onImport={handleImportarOrcamento}
        />
      )}

    </PageShell>
    </TooltipProvider>
  );
}
