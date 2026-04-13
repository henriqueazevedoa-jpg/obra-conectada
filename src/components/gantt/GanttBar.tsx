import { memo, useCallback, useRef } from 'react';
import { GanttTask, STATUS_COLORS, STATUS_LABELS, GanttDragState } from './types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface GanttBarProps {
  task: GanttTask;
  dayWidth: number;
  timelineStart: Date;
  editable: boolean;
  onDragStart: (state: GanttDragState) => void;
}

function GanttBar({ task, dayWidth, timelineStart, editable, onDragStart }: GanttBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const colors = STATUS_COLORS[task.status] || STATUS_COLORS.nao_iniciada;

  const getBarStyle = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const s = parseISO(start);
    const e = parseISO(end);
    const left = differenceInDays(s, timelineStart) * dayWidth;
    const width = Math.max((differenceInDays(e, s) + 1) * dayWidth, dayWidth);
    return { left, width };
  };

  // Baseline (planned)
  const baseline = getBarStyle(task.startDate, task.endDate);
  // Actual bar
  const actualEnd = task.actualEnd || (task.actualStart ? format(new Date(), 'yyyy-MM-dd') : undefined);
  const actual = getBarStyle(task.actualStart, actualEnd);
  // Main bar is actual if exists, otherwise planned
  const mainBar = actual || baseline;
  const mainStart = task.actualStart || task.startDate;
  const mainEnd = actualEnd || task.endDate;

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: GanttDragState['mode']) => {
    if (!editable || !mainStart || !mainEnd) return;
    e.preventDefault();
    e.stopPropagation();
    onDragStart({
      taskId: task.id,
      mode,
      startX: e.clientX,
      originalStart: mainStart,
      originalEnd: mainEnd,
    });
  }, [editable, mainStart, mainEnd, task.id, onDragStart]);

  if (!mainBar) {
    return (
      <div className="h-8 flex items-center">
        <span className="text-[9px] text-muted-foreground italic ml-2">Sem datas</span>
      </div>
    );
  }

  const duration = mainStart && mainEnd
    ? differenceInDays(parseISO(mainEnd), parseISO(mainStart)) + 1
    : 0;

  return (
    <div className="h-8 relative">
      {/* Baseline bar (behind) */}
      {baseline && actual && (
        <div
          className="absolute top-0.5 h-3 rounded-sm bg-muted-foreground/15 border border-dashed border-muted-foreground/20"
          style={{ left: baseline.left, width: baseline.width }}
        />
      )}

      {/* Main bar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={barRef}
            className={cn(
              "absolute h-6 rounded-md shadow-sm transition-shadow",
              colors.bar,
              editable ? "cursor-grab active:cursor-grabbing hover:shadow-md" : "cursor-default",
              baseline && actual ? "top-2" : "top-1"
            )}
            style={{ left: mainBar.left, width: mainBar.width }}
            onMouseDown={e => handleMouseDown(e, 'move')}
          >
            {/* Progress fill */}
            {task.progress > 0 && task.progress < 100 && (
              <div
                className="absolute inset-y-0 left-0 rounded-l-md bg-foreground/10"
                style={{ width: `${task.progress}%` }}
              />
            )}

            {/* Progress text */}
            {mainBar.width > 40 && (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary-foreground drop-shadow-sm select-none">
                {task.progress}%
              </span>
            )}

            {/* Resize handles */}
            {editable && (
              <>
                <div
                  className="absolute left-0 top-0 w-2 h-full cursor-col-resize hover:bg-foreground/20 rounded-l-md"
                  onMouseDown={e => handleMouseDown(e, 'resize-left')}
                />
                <div
                  className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-foreground/20 rounded-r-md"
                  onMouseDown={e => handleMouseDown(e, 'resize-right')}
                />
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
          <p className="font-semibold">{task.name}</p>
          <p>Status: {STATUS_LABELS[task.status]}</p>
          <p>Progresso: {task.progress}%</p>
          {task.startDate && <p>Previsto: {format(parseISO(task.startDate), 'dd/MM/yy')} → {task.endDate ? format(parseISO(task.endDate), 'dd/MM/yy') : '—'}</p>}
          {task.actualStart && <p>Real: {format(parseISO(task.actualStart), 'dd/MM/yy')} → {task.actualEnd ? format(parseISO(task.actualEnd), 'dd/MM/yy') : 'hoje'}</p>}
          <p>Duração: {duration} dia{duration !== 1 ? 's' : ''}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default memo(GanttBar);
