import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import { GanttTask, GanttDragState, STATUS_LABELS } from './types';
import GanttBar from './GanttBar';
import GanttTimelineHeader from './GanttTimelineHeader';
import GanttConfirmDialog, { GanttChangeInfo } from './GanttConfirmDialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { parseISO, differenceInDays, addDays, format, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

interface Props {
  categorias: OrcamentoCategoria[];
  onUpdateDates?: (catId: string, startDate: string, endDate: string) => void;
  dayWidth?: number;
}

function computeStatus(cat: OrcamentoCategoria): GanttTask['status'] {
  if (cat.statusCronograma) return cat.statusCronograma;
  if ((cat.percentualCronograma ?? 0) >= 100) return 'concluida';
  if (cat.dataInicioReal) {
    if (cat.dataFimPrevista && !cat.dataFimReal && isAfter(new Date(), parseISO(cat.dataFimPrevista))) return 'atrasada';
    return 'em_andamento';
  }
  if (cat.dataFimPrevista && isAfter(new Date(), parseISO(cat.dataFimPrevista))) return 'atrasada';
  return 'nao_iniciada';
}

function computeProgress(cat: OrcamentoCategoria): number {
  if (cat.percentualCronograma != null) return cat.percentualCronograma;
  if (!cat.usaComposicoes || cat.composicoes.length === 0) return 0;
  const totalPeso = cat.composicoes.reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
  if (totalPeso === 0) {
    const done = cat.composicoes.filter(c => c.concluida).length;
    return Math.round((done / cat.composicoes.length) * 100);
  }
  const doneW = cat.composicoes.filter(c => c.concluida).reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
  return Math.round((doneW / totalPeso) * 100);
}

const DAY_WIDTH_DEFAULT = 28;
const LABEL_WIDTH = 220;
const ROW_HEIGHT = 44;

export default function GanttEditorChart({ categorias, onUpdateDates, dayWidth: dayWidthProp }: Props) {
  const { planFeatures } = useCompany();
  const canView = planFeatures.gantt_view;
  const canEdit = planFeatures.gantt_edit;
  const showBaseline = planFeatures.gantt_baseline;
  const editable = canEdit && !!onUpdateDates;

  const dayWidth = dayWidthProp || DAY_WIDTH_DEFAULT;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(categorias.map(c => c.id)));
  const [dragState, setDragState] = useState<GanttDragState | null>(null);
  const [dragDelta, setDragDelta] = useState(0); // px delta during drag
  const [pendingChange, setPendingChange] = useState<GanttChangeInfo | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Convert categorias to flat task list
  const { tasks, timelineStart, totalDays } = useMemo(() => {
    const allTasks: GanttTask[] = [];

    categorias.forEach(cat => {
      const status = computeStatus(cat);
      const progress = computeProgress(cat);

      const group: GanttTask = {
        id: cat.id,
        name: cat.nome,
        code: cat.codigo,
        startDate: cat.dataInicioPrevista,
        endDate: cat.dataFimPrevista,
        actualStart: cat.dataInicioReal,
        actualEnd: cat.dataFimReal,
        progress,
        status,
        isGroup: cat.usaComposicoes && cat.composicoes.length > 0,
        children: [],
      };

      if (group.isGroup && expandedGroups.has(cat.id)) {
        cat.composicoes.forEach(comp => {
          const compStatus: GanttTask['status'] = comp.concluida ? 'concluida' :
            (comp.dataInicioReal ? 'em_andamento' : 'nao_iniciada');
          group.children!.push({
            id: comp.id,
            name: comp.descricao || comp.codigo,
            code: comp.codigo,
            startDate: comp.dataInicioPrevista,
            endDate: comp.dataFimPrevista,
            actualStart: comp.dataInicioReal,
            actualEnd: comp.dataFimReal,
            progress: comp.concluida ? 100 : 0,
            status: compStatus,
            groupId: cat.id,
          });
        });
      }

      allTasks.push(group);
    });

    // Calculate timeline bounds
    const allDates: string[] = [];
    categorias.forEach(c => {
      [c.dataInicioPrevista, c.dataFimPrevista, c.dataInicioReal, c.dataFimReal].forEach(d => {
        if (d) allDates.push(d);
      });
      c.composicoes.forEach(comp => {
        [comp.dataInicioPrevista, comp.dataFimPrevista, comp.dataInicioReal, comp.dataFimReal].forEach(d => {
          if (d) allDates.push(d);
        });
      });
    });

    allDates.push(format(new Date(), 'yyyy-MM-dd'));

    if (allDates.length === 0) return { tasks: allTasks, timelineStart: new Date(), totalDays: 30 };

    const sorted = allDates.sort();
    const min = addDays(parseISO(sorted[0]), -3);
    const max = addDays(parseISO(sorted[sorted.length - 1]), 7);
    const days = Math.max(differenceInDays(max, min) + 1, 30);

    return { tasks: allTasks, timelineStart: min, totalDays: days };
  }, [categorias, expandedGroups]);

  const todayOffset = differenceInDays(new Date(), timelineStart) * dayWidth;

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Drag handling — update visual delta in real-time, confirm on release
  const handleDragStart = useCallback((state: GanttDragState) => {
    if (!editable) return;
    setDragState(state);
    setDragDelta(0);
    setSelectedTask(state.taskId);
  }, [editable]);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.startX;
      setDragDelta(deltaPx);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.startX;
      const deltaDays = Math.round(deltaPx / dayWidth);

      if (deltaDays !== 0) {
        const origStart = parseISO(dragState.originalStart);
        const origEnd = parseISO(dragState.originalEnd);
        let newStart: Date;
        let newEnd: Date;

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

        // Find task name
        const taskName = categorias.find(c => c.id === dragState.taskId)?.nome || 'Tarefa';

        setPendingChange({
          taskId: dragState.taskId,
          taskName,
          oldStart: dragState.originalStart,
          oldEnd: dragState.originalEnd,
          newStart: format(newStart, 'yyyy-MM-dd'),
          newEnd: format(newEnd, 'yyyy-MM-dd'),
        });
      }

      setDragState(null);
      setDragDelta(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, dayWidth, categorias]);

  // Confirm change
  const handleConfirm = useCallback(() => {
    if (!pendingChange || !onUpdateDates) return;
    const { taskId, taskName, oldStart, oldEnd, newStart, newEnd } = pendingChange;
    onUpdateDates(taskId, newStart, newEnd);
    setPendingChange(null);

    // Undo toast
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    toast.success(`Datas de "${taskName}" atualizadas`, {
      action: {
        label: 'Desfazer',
        onClick: () => {
          onUpdateDates(taskId, oldStart, oldEnd);
          toast.info('Alteração desfeita');
        },
      },
      duration: 8000,
    });
  }, [pendingChange, onUpdateDates]);

  const handleCancel = useCallback(() => {
    setPendingChange(null);
  }, []);

  // Compute preview offset for the dragged task
  const getPreviewOffset = useCallback((task: GanttTask): { left: number; width: number } | null => {
    if (!dragState || dragState.taskId !== task.id) return null;

    const origStart = parseISO(dragState.originalStart);
    const origEnd = parseISO(dragState.originalEnd);
    const snappedDays = Math.round(dragDelta / dayWidth);

    let newStart: Date, newEnd: Date;
    if (dragState.mode === 'move') {
      newStart = addDays(origStart, snappedDays);
      newEnd = addDays(origEnd, snappedDays);
    } else if (dragState.mode === 'resize-left') {
      newStart = addDays(origStart, snappedDays);
      newEnd = origEnd;
      if (newStart >= newEnd) return null;
    } else {
      newStart = origStart;
      newEnd = addDays(origEnd, snappedDays);
      if (newEnd <= newStart) return null;
    }

    const left = differenceInDays(newStart, timelineStart) * dayWidth;
    const width = Math.max((differenceInDays(newEnd, newStart) + 1) * dayWidth, dayWidth);
    return { left, width };
  }, [dragState, dragDelta, dayWidth, timelineStart]);

  if (!canView) {
    return (
      <div className="text-center py-12 space-y-3">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-medium">Este recurso está disponível apenas no plano avançado</p>
        <p className="text-xs text-muted-foreground">Faça upgrade do seu plano para acessar o Gantt interativo.</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma etapa para exibir.</div>;
  }

  const renderRow = (task: GanttTask, indent = 0) => {
    const preview = getPreviewOffset(task);
    return (
      <div
        key={task.id}
        className={cn(
          "flex items-stretch border-b border-border/30 transition-colors",
          selectedTask === task.id ? "bg-primary/5" : "hover:bg-muted/20",
          dragState?.taskId === task.id && "bg-primary/10",
        )}
        style={{ height: ROW_HEIGHT }}
        onClick={() => setSelectedTask(task.id)}
      >
        {/* Label column */}
        <div
          className="shrink-0 flex items-center gap-1 px-2 border-r border-border/50 bg-background"
          style={{ width: LABEL_WIDTH, paddingLeft: 8 + indent * 16 }}
        >
          {task.isGroup && (
            <button onClick={(e) => { e.stopPropagation(); toggleGroup(task.id); }} className="text-muted-foreground hover:text-foreground p-0.5">
              {expandedGroups.has(task.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
          <span className={cn("text-xs truncate", task.isGroup ? "font-semibold text-foreground" : "text-muted-foreground")} title={task.name}>
            {task.name}
          </span>
          {task.isGroup && (
            <Badge variant="secondary" className="ml-auto text-[8px] px-1 py-0 h-4 shrink-0">
              {task.progress}%
            </Badge>
          )}
        </div>

        {/* Timeline column */}
        <div className="relative flex-1 min-w-0" style={{ width: totalDays * dayWidth }}>
          <GanttBar
            task={task}
            dayWidth={dayWidth}
            timelineStart={timelineStart}
            editable={editable && !task.groupId}
            showBaseline={showBaseline}
            onDragStart={handleDragStart}
            previewOffset={preview}
            isSelected={selectedTask === task.id}
          />
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Edit mode indicator */}
        {!canEdit && canView && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Modo visualização — faça upgrade para editar o cronograma
          </div>
        )}

        <div ref={containerRef} className={cn("overflow-x-auto", dragState && "select-none")}>
          <div style={{ minWidth: LABEL_WIDTH + totalDays * dayWidth }}>
            {/* Header */}
            <div className="flex">
              <div className="shrink-0 border-r border-border/50 bg-muted/30 flex items-center px-2" style={{ width: LABEL_WIDTH }}>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Etapa</span>
              </div>
              <GanttTimelineHeader timelineStart={timelineStart} totalDays={totalDays} dayWidth={dayWidth} />
            </div>

            {/* Rows */}
            <div className="relative">
              {/* Today line */}
              {todayOffset > 0 && todayOffset < totalDays * dayWidth && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-destructive/50 z-10 pointer-events-none"
                  style={{ left: LABEL_WIDTH + todayOffset }}
                >
                  <div className="absolute -top-0 -left-2.5 bg-destructive text-destructive-foreground text-[8px] px-1.5 py-0.5 rounded-b font-medium">
                    Hoje
                  </div>
                </div>
              )}

              {tasks.map(task => (
                <div key={task.id}>
                  {renderRow(task)}
                  {task.isGroup && expandedGroups.has(task.id) && task.children?.map(child => renderRow(child, 1))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 px-3 py-2.5 border-t border-border bg-muted/20">
              {showBaseline && (
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-4 h-2 rounded-full bg-muted-foreground/10 border border-dashed border-muted-foreground/40 inline-block" /> Baseline (planejado)
                </span>
              )}
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-4 h-2.5 rounded-sm bg-primary inline-block" /> Em andamento
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-4 h-2.5 rounded-sm bg-success inline-block" /> Concluído
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-4 h-2.5 rounded-sm bg-destructive inline-block" /> Atrasado
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-4 h-2.5 rounded-sm bg-muted-foreground/40 inline-block" /> Não iniciado
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <GanttConfirmDialog
        change={pendingChange}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </TooltipProvider>
  );
}
