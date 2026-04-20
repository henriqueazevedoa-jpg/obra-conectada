import { memo, useMemo } from 'react';
import { GanttTask } from './types';
import { GanttDependency } from '@/hooks/useGanttDependencies';
import { parseISO, differenceInDays } from 'date-fns';

interface Props {
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  dayWidth: number;
  timelineStart: Date;
  labelWidth: number;
  rowHeight: number;
}

/**
 * Renders SVG arrows between dependent tasks in the Gantt chart.
 */
function GanttDependencyArrows({ tasks, dependencies, dayWidth, timelineStart, labelWidth, rowHeight }: Props) {
  const arrows = useMemo(() => {
    // Build a flat ordered list of visible task ids with their row index
    const taskIndex = new Map<string, { task: GanttTask; rowIdx: number }>();
    let idx = 0;
    tasks.forEach(t => {
      taskIndex.set(t.id, { task: t, rowIdx: idx });
      idx++;
      if (t.isGroup && t.children) {
        t.children.forEach(child => {
          taskIndex.set(child.id, { task: child, rowIdx: idx });
          idx++;
        });
      }
    });

    return dependencies.map(dep => {
      const src = taskIndex.get(dep.source_cat_id);
      const tgt = taskIndex.get(dep.target_cat_id);
      if (!src || !tgt) return null;

      const srcEnd = src.task.actualEnd || src.task.endDate;
      const srcStart = src.task.actualStart || src.task.startDate;
      const tgtStart = tgt.task.actualStart || tgt.task.startDate;

      if (!tgtStart) return null;

      let fromX: number;
      if (dep.tipo === 'FS') {
        if (!srcEnd) return null;
        const endOffset = differenceInDays(parseISO(srcEnd), timelineStart);
        fromX = (endOffset + 1) * dayWidth; // right edge of source bar
      } else {
        // SS
        if (!srcStart) return null;
        const startOffset = differenceInDays(parseISO(srcStart), timelineStart);
        fromX = startOffset * dayWidth; // left edge of source bar
      }

      const tgtStartOffset = differenceInDays(parseISO(tgtStart), timelineStart);
      const toX = tgtStartOffset * dayWidth; // left edge of target bar

      const fromY = src.rowIdx * rowHeight + rowHeight / 2;
      const toY = tgt.rowIdx * rowHeight + rowHeight / 2;

      return { fromX, fromY, toX, toY, id: dep.id };
    }).filter(Boolean) as { fromX: number; fromY: number; toX: number; toY: number; id: string }[];
  }, [tasks, dependencies, dayWidth, timelineStart, rowHeight]);

  if (arrows.length === 0) return null;

  const totalRows = tasks.reduce((n, t) => n + 1 + (t.isGroup && t.children ? t.children.length : 0), 0);
  const svgHeight = totalRows * rowHeight;
  const svgWidth = 5000; // large enough

  return (
    <svg
      className="absolute top-0 pointer-events-none z-[5]"
      style={{ left: labelWidth, width: svgWidth, height: svgHeight }}
    >
      <defs>
        <marker
          id="dep-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary/70" />
        </marker>
      </defs>
      {arrows.map(({ fromX, fromY, toX, toY, id }) => {
        let path = '';

        if (toX > fromX + 20) {
          // Curva Bezier principal (S-curve suave)
          // Limita o arco a um máximo flexível para não ficar muito largo em vãos enormes
          const ctrlOffset = Math.max(Math.min((toX - fromX) / 2, 80), 30);
          path = `M ${fromX} ${fromY} C ${fromX + ctrlOffset} ${fromY}, ${toX - ctrlOffset} ${toY}, ${toX} ${toY}`;
        } else {
          // Bypass suave para deps retroativas/curtas
          const dropY = toY + (toY > fromY ? -18 : 18); // Meio exato entre as linhas pra evitar cruzamento das barras
          
          path = `M ${fromX} ${fromY} 
                  C ${fromX + 24} ${fromY}, ${fromX + 24} ${dropY}, ${fromX} ${dropY}
                  L ${toX - 16} ${dropY}
                  C ${toX - 24} ${dropY}, ${toX - 24} ${toY}, ${toX} ${toY}`;
        }

        return (
          <g key={id}>
            {/* Ponto âncora (circle) conectando à barra de origem */}
            <circle cx={fromX} cy={fromY} r={2.5} className="fill-primary/80" />
            
            <path
              d={path}
              className="stroke-primary/60 hover:stroke-primary transition-colors"
              strokeWidth={1.5}
              fill="none"
              markerEnd="url(#dep-arrow)"
            />
          </g>
        );
      })}
    </svg>
  );
}

export default memo(GanttDependencyArrows);
