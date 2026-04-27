import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { OrcamentoEtapa } from '@/contexts/OrcamentoContext';
import { GanttTask, GanttDragState, STATUS_LABELS, ZoomLevel, ZOOM_DAY_WIDTHS } from './types';
import GanttBar from './GanttBar';
import GanttTimelineHeader from './GanttTimelineHeader';
import GanttToolbar from './GanttToolbar';
import GanttConfirmDialog, { GanttChangeInfo } from './GanttConfirmDialog';
import GanttFinanceiroPanel from './GanttFinanceiroPanel';
import GanttDependencyArrows from './GanttDependencyArrows';
import GanttDependencyEditor from './GanttDependencyEditor';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Lock, DollarSign } from 'lucide-react';
import { parseISO, differenceInDays, addDays, format, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { FinanceiroByEtapa } from '@/hooks/useGanttFinanceiro';
import { formatCurrency } from '@/data/mockData';
import { GanttDependency, DepType, CascadeResult } from '@/hooks/useGanttDependencies';

interface Props {
  etapas: OrcamentoEtapa[];
  onUpdateDates?: (etapaId: string, startDate: string, endDate: string) => void;
  onUpdateBaseline?: (etapaId: string, startDate: string, endDate: string) => void;
  financeiroByEtapa?: FinanceiroByEtapa;
  dependencies?: GanttDependency[];
  onAddDependency?: (sourceId: string, targetId: string, tipo: DepType) => Promise<boolean | undefined>;
  onRemoveDependency?: (depId: string) => void;
  onCalculateCascade?: (etapaId: string, newStart: string, newEnd: string) => CascadeResult[];
}

function computeStatus(etapa: OrcamentoEtapa): GanttTask['status'] {
  if (etapa.statusCronograma) return etapa.statusCronograma;
  if ((etapa.percentualCronograma ?? 0) >= 100) return 'concluida';
  if (etapa.dataInicioReal) {
    if (etapa.dataFimPrevista && !etapa.dataFimReal && isAfter(new Date(), parseISO(etapa.dataFimPrevista))) return 'atrasada';
    return 'em_andamento';
  }
  if (etapa.dataFimPrevista && isAfter(new Date(), parseISO(etapa.dataFimPrevista))) return 'atrasada';
  return 'nao_iniciada';
}

function computeProgress(etapa: OrcamentoEtapa): number {
  if (etapa.percentualCronograma != null) return etapa.percentualCronograma;
  const composicoes = etapa.items?.filter(i => i.tipo !== 'etapa') as import('@/contexts/OrcamentoContext').OrcamentoComposicao[] || [];
  if (!etapa.usaComposicoes || composicoes.length === 0) return 0;
  const totalPeso = composicoes.reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
  if (totalPeso === 0) {
    const done = composicoes.filter(c => c.concluida).length;
    return Math.round((done / composicoes.length) * 100);
  }
  const doneW = composicoes.filter(c => c.concluida).reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
  return Math.round((doneW / totalPeso) * 100);
}

const LABEL_WIDTH = 200;
const ROW_HEIGHT = 36;
const MAX_HEIGHT = 480;

export default function GanttEditorChart({ etapas, onUpdateDates, onUpdateBaseline, financeiroByEtapa, dependencies = [], onAddDependency, onRemoveDependency, onCalculateCascade }: Props) {
  const { planFeatures } = useCompany();
  const canView = planFeatures.gantt_view;
  const canEditGantt = planFeatures.gantt_edit;
  const canViewBaseline = planFeatures.gantt_baseline;
  const canEditBaseline = planFeatures.gantt_baseline_edit;
  const canViewDeps = planFeatures.gantt_dependencies;
  const canEditDeps = canViewDeps && canEditGantt;

  const editable = canEditGantt && !!onUpdateDates;

  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [showBaseline, setShowBaseline] = useState(canViewBaseline);
  const [baselineEditMode, setBaselineEditMode] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(etapas.map(e => e.id)));
  const [dragState, setDragState] = useState<GanttDragState | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [pendingChange, setPendingChange] = useState<GanttChangeInfo | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute tasks & timeline bounds
  const { tasks, timelineStart, totalDays } = useMemo(() => {
    const allTasks: GanttTask[] = [];
    etapas.forEach(etapa => {
      const composicoes = etapa.items?.filter(i => i.tipo !== 'etapa') as import('@/contexts/OrcamentoContext').OrcamentoComposicao[] || [];
      const group: GanttTask = {
        id: etapa.id,
        name: etapa.nome,
        code: etapa.codigo,
        startDate: etapa.dataInicioPrevista,
        endDate: etapa.dataFimPrevista,
        actualStart: etapa.dataInicioReal,
        actualEnd: etapa.dataFimReal,
        progress: computeProgress(etapa),
        status: computeStatus(etapa),
        isGroup: etapa.usaComposicoes && composicoes.length > 0,
        children: [],
      };
      if (group.isGroup && expandedGroups.has(etapa.id)) {
        composicoes.forEach(comp => {
          group.children!.push({
            id: comp.id,
            name: comp.descricao || comp.codigo,
            code: comp.codigo,
            startDate: comp.dataInicioPrevista,
            endDate: comp.dataFimPrevista,
            actualStart: comp.dataInicioReal,
            actualEnd: comp.dataFimReal,
            progress: comp.concluida ? 100 : 0,
            status: comp.concluida ? 'concluida' : (comp.dataInicioReal ? 'em_andamento' : 'nao_iniciada'),
            groupId: etapa.id,
          });
        });
      }
      allTasks.push(group);
    });

    const allDates: string[] = [];
    etapas.forEach(e => {
      [e.dataInicioPrevista, e.dataFimPrevista, e.dataInicioReal, e.dataFimReal].forEach(d => { if (d) allDates.push(d); });
      const composicoes = e.items?.filter(i => i.tipo !== 'etapa') as import('@/contexts/OrcamentoContext').OrcamentoComposicao[] || [];
      composicoes.forEach(comp => {
        [comp.dataInicioPrevista, comp.dataFimPrevista, comp.dataInicioReal, comp.dataFimReal].forEach(d => { if (d) allDates.push(d); });
      });
    });
    allDates.push(format(new Date(), 'yyyy-MM-dd'));
    if (allDates.length === 0) return { tasks: allTasks, timelineStart: new Date(), totalDays: 30 };

    const sorted = allDates.sort();
    const min = addDays(parseISO(sorted[0]), -3);
    const max = addDays(parseISO(sorted[sorted.length - 1]), 7);
    const days = Math.max(differenceInDays(max, min) + 1, 30);
    return { tasks: allTasks, timelineStart: min, totalDays: days };
  }, [etapas, expandedGroups]);

  // Compute dayWidth based on zoom
  const dayWidth = useMemo(() => {
    if (zoom === 'fit' && containerRef.current) {
      const availableWidth = containerRef.current.clientWidth - LABEL_WIDTH;
      return Math.max(Math.floor(availableWidth / totalDays), 3);
    }
    return ZOOM_DAY_WIDTHS[zoom === 'fit' ? 'month' : zoom];
  }, [zoom, totalDays]);

  const todayOffset = differenceInDays(new Date(), timelineStart) * dayWidth;

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(etapas.filter(e => {
      const composicoes = e.items?.filter(i => i.tipo !== 'etapa') as import('@/contexts/OrcamentoContext').OrcamentoComposicao[] || [];
      return e.usaComposicoes && composicoes.length > 0;
    }).map(e => e.id)));
  }, [etapas]);

  const collapseAll = useCallback(() => setExpandedGroups(new Set()), []);

  // Drag handling
  const handleDragStart = useCallback((state: GanttDragState) => {
    if (state.isBaseline && !baselineEditMode) return;
    if (!state.isBaseline && !editable) return;
    setDragState(state);
    setDragDelta(0);
    setSelectedTask(state.taskId);
  }, [editable, baselineEditMode]);

  useEffect(() => {
    if (!dragState) return;
    const handleMouseMove = (e: MouseEvent) => setDragDelta(e.clientX - dragState.startX);
    const handleMouseUp = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.startX;
      const deltaDays = Math.round(deltaPx / dayWidth);

      if (deltaDays !== 0) {
        const origStart = parseISO(dragState.originalStart);
        const origEnd = parseISO(dragState.originalEnd);
        let newStart: Date, newEnd: Date;

        if (dragState.mode === 'move') {
          newStart = addDays(origStart, deltaDays);
          newEnd = addDays(origEnd, deltaDays);
        } else if (dragState.mode === 'resize-left') {
          newStart = addDays(origStart, deltaDays);
          newEnd = origEnd;
          if (newStart >= newEnd) { setDragState(null); setDragDelta(0); return; }
        } else {
          newStart = origStart;
          newEnd = addDays(origEnd, deltaDays);
          if (newEnd <= newStart) { setDragState(null); setDragDelta(0); return; }
        }

        const taskName = etapas.find(e => e.id === dragState.taskId)?.nome || 'Tarefa';
        const newStartStr = format(newStart, 'yyyy-MM-dd');
        const newEndStr = format(newEnd, 'yyyy-MM-dd');

        // Calculate cascade impact
        const cascadeResults = !dragState.isBaseline && onCalculateCascade
          ? onCalculateCascade(dragState.taskId, newStartStr, newEndStr)
          : [];

        setPendingChange({
          taskId: dragState.taskId,
          taskName,
          oldStart: dragState.originalStart,
          oldEnd: dragState.originalEnd,
          newStart: newStartStr,
          newEnd: newEndStr,
          isBaseline: dragState.isBaseline,
          cascadeResults,
        });
      }
      setDragState(null);
      setDragDelta(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [dragState, dayWidth, etapas, onCalculateCascade, onUpdateDates, onUpdateBaseline]);

  const handleConfirm = useCallback(() => {
    if (!pendingChange) return;
    const { taskId, taskName, oldStart, oldEnd, newStart, newEnd, isBaseline, cascadeResults } = pendingChange;
    const updateFn = isBaseline ? onUpdateBaseline : onUpdateDates;
    if (!updateFn) return;

    // Apply main change
    updateFn(taskId, newStart, newEnd);

    // Apply cascade changes
    if (cascadeResults && cascadeResults.length > 0 && onUpdateDates) {
      cascadeResults.forEach(cr => {
        onUpdateDates(cr.catId, cr.newStart, cr.newEnd);
      });
    }

    setPendingChange(null);

    const totalAffected = 1 + (cascadeResults?.length || 0);
    toast.success(
      totalAffected > 1
        ? `${totalAffected} etapas atualizadas`
        : `${isBaseline ? 'Baseline' : 'Datas'} de "${taskName}" atualizado`,
      {
        action: {
          label: 'Desfazer',
          onClick: () => {
            updateFn(taskId, oldStart, oldEnd);
            if (cascadeResults && onUpdateDates) {
              cascadeResults.forEach(cr => onUpdateDates(cr.catId, cr.oldStart, cr.oldEnd));
            }
            toast.info('Alteração desfeita');
          },
        },
        duration: 8000,
      }
    );
  }, [pendingChange, onUpdateDates, onUpdateBaseline]);

  const handleCancel = useCallback(() => setPendingChange(null), []);

  // Preview offsets for drag
  const getPreviewOffset = useCallback((task: GanttTask, forBaseline: boolean): { left: number; width: number } | null => {
    if (!dragState || dragState.taskId !== task.id || !!dragState.isBaseline !== forBaseline) return null;
    const snappedDays = Math.round(dragDelta / dayWidth);
    const origStart = parseISO(dragState.originalStart);
    const origEnd = parseISO(dragState.originalEnd);
    let newStart: Date, newEnd: Date;

    if (dragState.mode === 'move') { newStart = addDays(origStart, snappedDays); newEnd = addDays(origEnd, snappedDays); }
    else if (dragState.mode === 'resize-left') { newStart = addDays(origStart, snappedDays); newEnd = origEnd; if (newStart >= newEnd) return null; }
    else { newStart = origStart; newEnd = addDays(origEnd, snappedDays); if (newEnd <= newStart) return null; }

    const left = differenceInDays(newStart, timelineStart) * dayWidth;
    const width = Math.max((differenceInDays(newEnd, newStart) + 1) * dayWidth, dayWidth);
    return { left, width };
  }, [dragState, dragDelta, dayWidth, timelineStart]);

  if (!canView) {
    return (
      <div className="text-center py-10 space-y-2">
        <Lock className="h-7 w-7 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-medium">Disponível apenas no plano avançado</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return <div className="text-center py-6 text-muted-foreground text-sm">Nenhuma etapa para exibir.</div>;
  }

  const renderRow = (task: GanttTask, indent = 0) => {
    const fin = financeiroByEtapa?.[task.name];
    const hasFinanceiro = fin && fin.totalPrevisto > 0;

    return (
      <div
        key={task.id}
        className={cn(
          "flex items-stretch border-b border-border/20 transition-colors",
          selectedTask === task.id ? "bg-primary/5" : "hover:bg-muted/20",
          dragState?.taskId === task.id && "bg-primary/10",
        )}
        style={{ height: ROW_HEIGHT }}
        onClick={() => setSelectedTask(prev => prev === task.id ? null : task.id)}
      >
        <div
          className="shrink-0 flex items-center gap-1 px-1.5 border-r border-border/40 bg-background"
          style={{ width: LABEL_WIDTH, paddingLeft: 6 + indent * 14 }}
        >
          {task.isGroup && (
            <button onClick={(e) => { e.stopPropagation(); toggleGroup(task.id); }} className="text-muted-foreground hover:text-foreground p-0.5">
              {expandedGroups.has(task.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
          <span className={cn("text-[10px] truncate flex-1", task.isGroup ? "font-semibold text-foreground" : "text-muted-foreground")} title={task.name}>
            {task.name}
          </span>
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {hasFinanceiro && !task.groupId && (
              <span className={cn(
                "text-[8px] font-mono px-1 py-0 rounded",
                fin.totalAtrasado > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
              )} title={`Previsto: ${formatCurrency(fin.totalPrevisto)} | Pago: ${formatCurrency(fin.totalPago)}`}>
                <DollarSign className="h-2.5 w-2.5 inline -mt-0.5" />
                {formatCurrency(fin.totalPrevisto).replace('R$\u00a0', '').replace('R$ ', '')}
              </span>
            )}
            {task.isGroup && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 shrink-0">{task.progress}%</Badge>
            )}
          </div>
        </div>
        <div className="relative flex-1 min-w-0" style={{ width: totalDays * dayWidth }}>
          <GanttBar
            task={task}
            dayWidth={dayWidth}
            timelineStart={timelineStart}
            editable={editable && !task.groupId && !baselineEditMode}
            showBaseline={showBaseline && canViewBaseline}
            baselineEditable={baselineEditMode && canEditBaseline && !task.groupId}
            onDragStart={handleDragStart}
            previewOffset={getPreviewOffset(task, false)}
            baselinePreviewOffset={getPreviewOffset(task, true)}
            isSelected={selectedTask === task.id}
          />
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Toolbar */}
        <GanttToolbar
          zoom={zoom}
          onZoomChange={setZoom}
          showBaseline={showBaseline}
          onToggleBaseline={setShowBaseline}
          baselineEditMode={baselineEditMode}
          onToggleBaselineEdit={setBaselineEditMode}
          canEdit={editable}
          canEditBaseline={canEditBaseline && !!onUpdateBaseline}
          canViewBaseline={canViewBaseline}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />

        {/* Read-only indicator */}
        {!canEditGantt && canView && (
          <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 border-b border-border text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Modo visualização — faça upgrade para editar
          </div>
        )}

        <div ref={containerRef} className={cn("overflow-x-auto overflow-y-auto", dragState && "select-none")} style={{ maxHeight: MAX_HEIGHT }}>
          <div style={{ minWidth: LABEL_WIDTH + totalDays * dayWidth }}>
            {/* Header */}
            <div className="flex sticky top-0 z-20 bg-background">
              <div className="shrink-0 border-r border-border/40 bg-muted/30 flex items-center px-2" style={{ width: LABEL_WIDTH }}>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">Etapa</span>
              </div>
              <GanttTimelineHeader timelineStart={timelineStart} totalDays={totalDays} dayWidth={dayWidth} />
            </div>

            {/* Rows */}
            <div className="relative">
              {todayOffset > 0 && todayOffset < totalDays * dayWidth && (
                <div className="absolute top-0 bottom-0 w-px bg-destructive/50 z-10 pointer-events-none" style={{ left: LABEL_WIDTH + todayOffset }}>
                  <div className="absolute -top-0 -left-2 bg-destructive text-destructive-foreground text-[7px] px-1 py-0 rounded-b font-medium">Hoje</div>
                </div>
              )}

              {/* Dependency arrows */}
              {canViewDeps && dependencies.length > 0 && (
                <GanttDependencyArrows
                  tasks={tasks}
                  dependencies={dependencies}
                  dayWidth={dayWidth}
                  timelineStart={timelineStart}
                  labelWidth={LABEL_WIDTH}
                  rowHeight={ROW_HEIGHT}
                />
              )}

              {tasks.map(task => (
                <div key={task.id}>
                  {renderRow(task)}
                  {task.isGroup && expandedGroups.has(task.id) && task.children?.map(child => renderRow(child, 1))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-t border-border bg-muted/20">
              {showBaseline && canViewBaseline && (
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <span className="w-4 h-1.5 rounded-full bg-muted-foreground/15 border border-dashed border-muted-foreground/50 inline-block" /> Baseline
                </span>
              )}
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-3 h-2 rounded-sm bg-primary inline-block" /> Em andamento
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-3 h-2 rounded-sm bg-success inline-block" /> Concluído
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-3 h-2 rounded-sm bg-destructive inline-block" /> Atrasado
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-3 h-2 rounded-sm bg-muted-foreground/40 inline-block" /> Não iniciado
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial detail panel */}
      {selectedTask && financeiroByEtapa && (() => {
        const etapa = etapas.find(e => e.id === selectedTask);
        const fin = etapa ? financeiroByEtapa[etapa.nome] : undefined;
        if (!fin || fin.totalPrevisto === 0) return null;
        return (
          <div className="mt-3">
            <GanttFinanceiroPanel
              etapaNome={etapa!.nome}
              financeiro={fin}
              onClose={() => setSelectedTask(null)}
            />
          </div>
        );
      })()}

      {/* Dependency editor */}
      {canEditDeps && onAddDependency && onRemoveDependency && (
        <div className="mt-3 border border-border rounded-lg p-3 bg-background">
          <GanttDependencyEditor
            tasks={tasks}
            dependencies={dependencies}
            onAdd={onAddDependency}
            onRemove={onRemoveDependency}
          />
        </div>
      )}

      <GanttConfirmDialog change={pendingChange} onConfirm={handleConfirm} onCancel={handleCancel} />
    </TooltipProvider>
  );
}
