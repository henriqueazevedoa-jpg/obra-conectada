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
  showBaseline?: boolean;
  onDragStart: (state: GanttDragState) => void;
  previewOffset?: { left: number; width: number } | null;
  isSelected?: boolean;
}

const ROW_HEIGHT = 44;
const BAR_HEIGHT = 28;
const BASELINE_HEIGHT = 8;

function GanttBarComponent({ task, dayWidth, timelineStart, editable, showBaseline = true, onDragStart, previewOffset, isSelected }: GanttBarProps) {
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
      <div className="flex items-center" style={{ height: ROW_HEIGHT }}>
        <span className="text-[9px] text-muted-foreground italic ml-2">Sem datas</span>
      </div>
    );
  }

  // Apply preview offset during drag
  const displayBar = previewOffset || mainBar;

  const duration = mainStart && mainEnd
    ? differenceInDays(parseISO(mainEnd), parseISO(mainStart)) + 1
    : 0;

  const hasBaseline = showBaseline && baseline && actual;

  // Baseline difference for tooltip
  let baselineDiff = '';
  if (hasBaseline && task.startDate && task.endDate && task.actualStart) {
    const planned = differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1;
    const diffDays = differenceInDays(parseISO(task.actualStart), parseISO(task.startDate));
    if (diffDays > 0) baselineDiff = `${diffDays}d atrasado vs planejado`;
    else if (diffDays < 0) baselineDiff = `${Math.abs(diffDays)}d adiantado vs planejado`;
  }

  return (
    <div className="relative" style={{ height: ROW_HEIGHT }}>
      {/* Baseline bar */}
      {hasBaseline && (
        <div
          className="absolute rounded-full border border-dashed border-muted-foreground/40 bg-muted-foreground/10"
          style={{
            left: baseline.left,
            width: baseline.width,
            height: BASELINE_HEIGHT,
            top: 4,
          }}
        />
      )}

      {/* Main bar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={barRef}
            className={cn(
              "absolute rounded-md shadow-sm transition-shadow group",
              colors.bar,
              editable ? "cursor-grab active:cursor-grabbing hover:shadow-lg hover:brightness-110" : "cursor-default",
              isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
            )}
            style={{
              left: displayBar.left,
              width: displayBar.width,
              height: BAR_HEIGHT,
              top: hasBaseline ? 14 : 8,
            }}
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
            {displayBar.width > 36 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-foreground drop-shadow-sm select-none">
                {task.progress}%
              </span>
            )}

            {/* Resize handles — wider hit area */}
            {editable && (
              <>
                <div
                  className="absolute left-0 top-0 w-3 h-full cursor-col-resize rounded-l-md z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={e => handleMouseDown(e, 'resize-left')}
                >
                  <div className="w-0.5 h-3 bg-primary-foreground/60 rounded-full" />
                </div>
                <div
                  className="absolute right-0 top-0 w-3 h-full cursor-col-resize rounded-r-md z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={e => handleMouseDown(e, 'resize-right')}
                >
                  <div className="w-0.5 h-3 bg-primary-foreground/60 rounded-full" />
                </div>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs space-y-1 p-3">
          <p className="font-semibold text-sm">{task.name}</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground">
            <span>Status:</span><span className="text-foreground">{STATUS_LABELS[task.status]}</span>
            <span>Progresso:</span><span className="text-foreground">{task.progress}%</span>
            {task.startDate && (
              <>
                <span>Previsto:</span>
                <span className="text-foreground">
                  {format(parseISO(task.startDate), 'dd/MM/yy')} → {task.endDate ? format(parseISO(task.endDate), 'dd/MM/yy') : '—'}
                </span>
              </>
            )}
            {task.actualStart && (
              <>
                <span>Real:</span>
                <span className="text-foreground">
                  {format(parseISO(task.actualStart), 'dd/MM/yy')} → {task.actualEnd ? format(parseISO(task.actualEnd), 'dd/MM/yy') : 'hoje'}
                </span>
              </>
            )}
            <span>Duração:</span><span className="text-foreground">{duration} dia{duration !== 1 ? 's' : ''}</span>
            {baselineDiff && (
              <>
                <span>Baseline:</span><span className="text-foreground">{baselineDiff}</span>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default memo(GanttBarComponent);
