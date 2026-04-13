import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import { GanttTask, GanttDragState, STATUS_LABELS } from './types';
import GanttBar from './GanttBar';
import GanttTimelineHeader from './GanttTimelineHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { parseISO, differenceInDays, addDays, format, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';

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

export default function GanttEditorChart({ categorias, onUpdateDates, dayWidth: dayWidthProp }: Props) {
  const { allowed: canEdit } = useAddonAccess('gantt_edit');
  const editable = canEdit && !!onUpdateDates;

  const dayWidth = dayWidthProp || DAY_WIDTH_DEFAULT;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(categorias.map(c => c.id)));
  const [dragState, setDragState] = useState<GanttDragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    // Add today
    allDates.push(format(new Date(), 'yyyy-MM-dd'));

    if (allDates.length === 0) return { tasks: allTasks, timelineStart: new Date(), totalDays: 30 };

    const sorted = allDates.sort();
    const min = addDays(parseISO(sorted[0]), -3); // 3 day padding
    const max = addDays(parseISO(sorted[sorted.length - 1]), 7); // 7 day padding
    const days = Math.max(differenceInDays(max, min) + 1, 30);

    return { tasks: allTasks, timelineStart: min, totalDays: days };
  }, [categorias, expandedGroups]);

  // Today line position
  const todayOffset = differenceInDays(new Date(), timelineStart) * dayWidth;

  // Toggle group
  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Drag handling
  const handleDragStart = useCallback((state: GanttDragState) => {
    setDragState(state);
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const deltaPx = e.clientX - dragState.startX;
      const deltaDays = Math.round(deltaPx / dayWidth);
      if (deltaDays === 0) return;

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
        if (newStart >= newEnd) return;
      } else {
        newStart = origStart;
        newEnd = addDays(origEnd, deltaDays);
        if (newEnd <= newStart) return;
      }

      // Apply preview via CSS transform (no state update for perf)
      // We'll apply actual change on mouseUp
    };

    const handleMouseUp = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.startX;
      const deltaDays = Math.round(deltaPx / dayWidth);

      if (deltaDays !== 0 && onUpdateDates) {
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
          if (newStart >= newEnd) { setDragState(null); return; }
        } else {
          newStart = origStart;
          newEnd = addDays(origEnd, deltaDays);
          if (newEnd <= newStart) { setDragState(null); return; }
        }

        onUpdateDates(
          dragState.taskId,
          format(newStart, 'yyyy-MM-dd'),
          format(newEnd, 'yyyy-MM-dd')
        );
      }

      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, dayWidth, onUpdateDates]);

  if (tasks.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma etapa para exibir.</div>;
  }

  const renderRow = (task: GanttTask, indent = 0) => (
    <div key={task.id} className="flex items-stretch hover:bg-muted/20 transition-colors border-b border-border/30">
      {/* Label column */}
      <div
        className="shrink-0 flex items-center gap-1 px-2 py-1 border-r border-border/50 bg-background"
        style={{ width: LABEL_WIDTH, paddingLeft: 8 + indent * 16 }}
      >
        {task.isGroup && (
          <button onClick={() => toggleGroup(task.id)} className="text-muted-foreground hover:text-foreground p-0.5">
            {expandedGroups.has(task.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
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
          editable={editable && !task.groupId} // only edit top-level for now
          onDragStart={handleDragStart}
        />
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Edit mode indicator */}
        {!canEdit && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Modo visualização — ative o addon Gantt Edit para editar
          </div>
        )}

        <div ref={containerRef} className="overflow-x-auto">
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
                  className="absolute top-0 bottom-0 w-px bg-destructive/60 z-10 pointer-events-none"
                  style={{ left: LABEL_WIDTH + todayOffset }}
                >
                  <div className="absolute -top-0 -left-2 bg-destructive text-destructive-foreground text-[8px] px-1 rounded-b font-medium">
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
            <div className="flex items-center gap-4 px-3 py-2 border-t border-border bg-muted/20">
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-3 h-2 rounded-sm bg-muted-foreground/15 border border-dashed border-muted-foreground/30 inline-block" /> Baseline
              </span>
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
    </TooltipProvider>
  );
}
