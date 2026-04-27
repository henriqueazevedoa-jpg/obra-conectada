import React, { useRef, useMemo, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  format, parseISO, differenceInDays, addDays,
  eachWeekOfInterval, eachMonthOfInterval, endOfMonth,
  isToday, startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CronogramaTarefa, CronogramaDependencia, TipoDep } from '@/hooks/useCronograma';
import { toast } from '@/hooks/use-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

type ZoomLevel = 'days' | 'weeks' | 'months' | 'quarters';

interface DragState {
  type: 'move' | 'resize-right';
  tarefaId: string;
  startMouseX: number;
  originalStart: string;
  originalEnd: string;
  initialViewStart: Date;
}

type VisibleTarefa = CronogramaTarefa & { _nivel: number };

// ─── Constants ───────────────────────────────────────────────────────────────

const CELL_PX: Record<ZoomLevel, number> = { days: 28, weeks: 84, months: 130, quarters: 200 };
const ROW_H = 38;
const BAR_H = 22;
const SUB_BAR_H = 14;  // altura das barras de subetapas
const BAR_OFFSET_Y = (ROW_H - BAR_H) / 2;
const SUB_BAR_OFFSET_Y = (ROW_H - SUB_BAR_H) / 2;  // offset vertical das subetapas
const SUB_INDENT = 16;  // recuo horizontal das subetapas

const STATUS_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  nao_iniciada: { bar: '#94a3b8', bg: '#f1f5f9', text: '#64748b' },
  em_andamento: { bar: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
  concluida:    { bar: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  atrasada:     { bar: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
  critico:      { bar: '#f97316', bg: '#fff7ed', text: '#c2410c' },
};

// Cores fixas para subetapas (azul, independente do status)
const SUBTASK_COLOR = { done: '#3B82F6', pending: '#BFDBFE' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStatus(t: CronogramaTarefa): keyof typeof STATUS_COLORS {
  if (t.is_critico) return 'critico';
  if (t.percentual_concluido >= 100) return 'concluida';
  const now = new Date();
  if (t.data_fim && parseISO(t.data_fim) < now) return 'atrasada';
  if (t.data_inicio && parseISO(t.data_inicio) <= now) return 'em_andamento';
  return 'nao_iniciada';
}

function snapToDay(date: Date): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

// ─── Critical Path Algorithm (CPM) ──────────────────────────────────────────

export function computeCriticalPath(
  tarefas: CronogramaTarefa[],
  deps: CronogramaDependencia[],
): Set<string> {
  if (tarefas.length === 0) return new Set();

  // Forward pass: compute Early Finish for each task
  const ef = new Map<string, number>(); // days from project start
  const taskMap = new Map(tarefas.map(t => [t.id, t]));

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();
  tarefas.forEach(t => { inDegree.set(t.id, 0); successors.set(t.id, []); });
  deps.forEach(d => {
    inDegree.set(d.tarefa_destino_id, (inDegree.get(d.tarefa_destino_id) ?? 0) + 1);
    successors.get(d.tarefa_origem_id)?.push(d.tarefa_destino_id);
  });

  const queue = tarefas.filter(t => (inDegree.get(t.id) ?? 0) === 0).map(t => t.id);
  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    (successors.get(id) ?? []).forEach(s => {
      const deg = (inDegree.get(s) ?? 1) - 1;
      inDegree.set(s, deg);
      if (deg === 0) queue.push(s);
    });
  }

  // Forward pass
  const predecessors = new Map<string, string[]>();
  tarefas.forEach(t => predecessors.set(t.id, []));
  deps.forEach(d => predecessors.get(d.tarefa_destino_id)?.push(d.tarefa_origem_id));

  sorted.forEach(id => {
    const task = taskMap.get(id);
    const dur = task?.duracao_dias ?? 1;
    const preds = predecessors.get(id) ?? [];
    const maxPredEF = preds.length > 0
      ? Math.max(...preds.map(p => ef.get(p) ?? 0))
      : 0;
    ef.set(id, maxPredEF + dur);
  });

  // Project finish = max early finish
  const projectFinish = Math.max(...Array.from(ef.values()));

  // Backward pass: compute Late Finish
  const lf = new Map<string, number>();
  sorted.forEach(id => lf.set(id, projectFinish)); // initialize all to project finish

  [...sorted].reverse().forEach(id => {
    const succs = successors.get(id) ?? [];
    if (succs.length === 0) {
      lf.set(id, projectFinish);
    } else {
      // LF[i] = min(LS[successor]) = min(LF[succ] - dur[succ]) for FS
      lf.set(id, Math.min(...succs.map(s => (lf.get(s) ?? projectFinish) - (taskMap.get(s)?.duracao_dias ?? 1) + 1)));
    }
  });

  // Critical: tasks where slack = LF - EF == 0
  const critical = new Set<string>();
  sorted.forEach(id => {
    const earlyFinish = ef.get(id) ?? 0;
    const lateFinish = lf.get(id) ?? projectFinish;
    if (lateFinish - earlyFinish === 0) critical.add(id);
  });

  return critical;
}

// --- Dependency colors & routing ---

const DEP_COLORS: Record<string, string> = {
  FS: '#6366f1',
  SS: '#10b981',
  FF: '#f59e0b',
  SF: '#ef4444',
  critico: '#f97316',
};

function orthoPath(x1: number, y1: number, x2: number, y2: number, tipo: string): { d: string, mx: number, my: number } {
  const r = 5;
  const gap = 12;
  if (tipo === "FS") {
    if (x2 >= x1 + gap * 2) {
      const midX = (x1 + x2) / 2;
      if (Math.abs(y2 - y1) < 2) return { d: `M${x1},${y1} H${x2}`, mx: midX, my: y1 };
      const dy = y2 > y1 ? r : -r;
      return { 
        d: `M${x1},${y1} H${midX-r} Q${midX},${y1} ${midX},${y1+dy} V${y2-dy} Q${midX},${y2} ${midX+r},${y2} H${x2}`,
        mx: midX, my: (y1 + y2) / 2
      };
    }
    const ex = x1 + gap; const sx = x2 - gap;
    const midY = y2 > y1 ? Math.max(y1, y2) + ROW_H * 0.45 : Math.min(y1, y2) - ROW_H * 0.45;
    const yd1 = y2 > y1 ? r : -r;
    return {
      d: `M${x1},${y1} H${ex} Q${ex+r},${y1} ${ex+r},${y1+yd1} V${midY-yd1} Q${ex+r},${midY} ${ex},${midY} H${sx} Q${sx-r},${midY} ${sx-r},${midY+yd1} V${y2-yd1} Q${sx-r},${y2} ${sx},${y2} H${x2}`,
      mx: (ex + sx) / 2, my: midY
    };
  }
  if (tipo === "SS") {
    const lx = Math.min(x1, x2) - gap;
    if (Math.abs(y2 - y1) < 2) return { d: `M${x1},${y1} H${x2}`, mx: (x1 + x2)/2, my: y1 };
    const dy = y2 > y1 ? r : -r;
    return {
      d: `M${x1},${y1} H${lx+r} Q${lx},${y1} ${lx},${y1+dy} V${y2-dy} Q${lx},${y2} ${lx+r},${y2} H${x2}`,
      mx: lx, my: (y1 + y2) / 2
    };
  }
  if (tipo === "FF") {
    const rx = Math.max(x1, x2) + gap;
    if (Math.abs(y2 - y1) < 2) return { d: `M${x1},${y1} H${x2}`, mx: (x1 + x2)/2, my: y1 };
    const dy = y2 > y1 ? r : -r;
    return {
      d: `M${x1},${y1} H${rx-r} Q${rx},${y1} ${rx},${y1+dy} V${y2-dy} Q${rx},${y2} ${rx-r},${y2} H${x2}`,
      mx: rx, my: (y1 + y2) / 2
    };
  }
  const midX = (x1 + x2) / 2;
  if (Math.abs(y2 - y1) < 2) return { d: `M${x1},${y1} H${x2}`, mx: midX, my: y1 };
  const dy = y2 > y1 ? r : -r;
  return {
    d: `M${x1},${y1} H${midX-r} Q${midX},${y1} ${midX},${y1+dy} V${y2-dy} Q${midX},${y2} ${midX+r},${y2} H${x2}`,
    mx: midX, my: (y1 + y2) / 2
  };
}

// --- SVG Dependency Arrows ---

interface ArrowsProps {
  deps: CronogramaDependencia[];
  tarefas: CronogramaTarefa[];
  tarefaRows: Map<string, number>;
  dateToX: (d: string | null) => number;
  criticalIds: Set<string>;
  onRemoveDependencia: (id: string) => void;
  connectedNodes: Set<string> | null;
}

function DependencyArrows({ deps, tarefas, tarefaRows, dateToX, criticalIds, onRemoveDependencia, connectedNodes }: ArrowsProps) {
  const taskMap = new Map(tarefas.map(t => [t.id, t]));
  const totalHeight = (tarefas.length + 1) * ROW_H;
  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null);

  return (
    <svg
      className="absolute inset-0"
      style={{ width: "100%", height: totalHeight, overflow: "visible", pointerEvents: "none" }}
    >
      <defs>
        {Object.entries(DEP_COLORS).map(([tipo, color]) => (
          <marker key={tipo} id={`ah-${tipo}`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1.5 L8,5 L0,8.5 Z" fill={color} />
          </marker>
        ))}
        <filter id="dep-glow" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {deps.map(dep => {
        const origRow = tarefaRows.get(dep.tarefa_origem_id);
        const destRow = tarefaRows.get(dep.tarefa_destino_id);
        const orig = taskMap.get(dep.tarefa_origem_id);
        const dest = taskMap.get(dep.tarefa_destino_id);
        if (origRow === undefined || destRow === undefined || !orig || !dest) return null;

        const isCritical = criticalIds.has(dep.tarefa_origem_id) && criticalIds.has(dep.tarefa_destino_id);
        const isHov = hoveredDepId === dep.id;
        
        // Se há uma rede de nós conectados focada, diminua opacidade das linhas que não fazem parte do caminho
        const isDimmed = connectedNodes !== null && (!connectedNodes.has(dep.tarefa_origem_id) || !connectedNodes.has(dep.tarefa_destino_id));
        
        const colorKey = isCritical ? "critico" : dep.tipo;
        const color = DEP_COLORS[colorKey] ?? DEP_COLORS.FS;

        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        const cy1 = origRow * ROW_H + ROW_H / 2 + 8;
        const cy2 = destRow * ROW_H + ROW_H / 2 + 8;

        if (dep.tipo === "SS") {
          if (!orig.data_inicio || !dest.data_inicio) return null;
          x1 = dateToX(orig.data_inicio); x2 = dateToX(dest.data_inicio); y1 = cy1; y2 = cy2;
        } else if (dep.tipo === "FF") {
          if (!orig.data_fim || !dest.data_fim) return null;
          x1 = dateToX(orig.data_fim) + 8; x2 = dateToX(dest.data_fim) + 8; y1 = cy1; y2 = cy2;
        } else if (dep.tipo === "SF") {
          if (!orig.data_inicio || !dest.data_fim) return null;
          x1 = dateToX(orig.data_inicio); x2 = dateToX(dest.data_fim) + 8; y1 = cy1; y2 = cy2;
        } else {
          if (!orig.data_fim || !dest.data_inicio) return null;
          x1 = dateToX(orig.data_fim) + 8; x2 = dateToX(dest.data_inicio) - 8; y1 = cy1; y2 = cy2;
        }

        const { d, mx, my } = orthoPath(x1, y1, x2, y2, dep.tipo);

        return (
          <g key={dep.id}>
            {/* Wide invisible hit area — uses SVG presentation attr to override parent pointer-events:none */}
            <path
              d={d} fill="none" stroke="transparent" strokeWidth={14}
              pointerEvents="all"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredDepId(dep.id)}
              onMouseLeave={() => setHoveredDepId(null)}
            />
            {/* Glow on hover */}
            {isHov && (
              <path d={d} fill="none" stroke={color} strokeWidth={5} opacity={0.18}
                style={{ pointerEvents: "none" }} filter="url(#dep-glow)" />
            )}
            {/* Visible line */}
            <path
              d={d} fill="none" stroke={color}
              strokeWidth={isHov ? 2.5 : isCritical ? 2 : 1.5}
              strokeDasharray={dep.tipo === "FS" ? undefined : dep.tipo === "SS" ? "6 3" : "3 3"}
              markerEnd={`url(#ah-${colorKey})`}
              opacity={isDimmed ? 0.1 : isHov ? 1 : isCritical ? 0.9 : 0.6}
              style={{ pointerEvents: "none", transition: "opacity 0.2s" }}
            />
            {/* Type badge / Lag badge */}
            {(dep.tipo !== "FS" || dep.lag_dias !== 0) && (() => {
              const lagText = dep.lag_dias > 0 ? `+${dep.lag_dias}d` : dep.lag_dias < 0 ? `${dep.lag_dias}d` : "";
              const labelText = `${dep.tipo !== "FS" ? dep.tipo : ""}${dep.tipo !== "FS" && lagText ? " " : ""}${lagText}`.trim();
              const width = Math.max(20, labelText.length * 5 + 6);
              
              return (
                <g style={{ pointerEvents: "none", opacity: isDimmed ? 0.2 : 1, transition: "opacity 0.2s" }}>
                  <rect x={mx - width / 2} y={my - 7} width={width} height={14} rx={3} fill={color} opacity={isHov ? 1 : 0.85} />
                  <text x={mx} y={my + 3.5} fontSize={7.5} fill="white" textAnchor="middle"
                    fontWeight="700" style={{ userSelect: "none" }}>{labelText}</text>
                </g>
              );
            })()}
            {/* Delete button — visible on hover, uses SVG attr to capture clicks */}
            {isHov && (
              <g
                pointerEvents="all"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredDepId(dep.id)}
                onMouseLeave={() => setHoveredDepId(null)}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onRemoveDependencia(dep.id);
                }}
                transform={`translate(${mx + ((dep.tipo !== "FS" || dep.lag_dias !== 0) ? 18 : 0)}, ${my - ((dep.tipo !== "FS" || dep.lag_dias !== 0) ? 12 : 0)})`}
              >
                <circle r={9} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                <line x1={-3.5} y1={-3.5} x2={3.5} y2={3.5} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
                <line x1={3.5} y1={-3.5} x2={-3.5} y2={3.5} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const DependencyArrowsMemo = React.memo(DependencyArrows, (prev, next) => {
  return prev.deps === next.deps && 
         prev.tarefas === next.tarefas &&
         prev.tarefaRows === next.tarefaRows &&
         prev.criticalIds === next.criticalIds &&
         prev.connectedNodes === next.connectedNodes &&
         prev.dateToX === next.dateToX;
});


interface GanttBarProps {
  tarefa: CronogramaTarefa;
  x: number;
  width: number;
  baselineX: number | null;
  baselineWidth: number;
  isSelected: boolean;
  statusKey: string;
  nivel?: number;
  isHovered: boolean;
  isDropTarget: boolean;
  dropHintSide?: "start" | "end";
  onBarMouseEnter: (e?: React.MouseEvent) => void;
  onBarMouseLeave: () => void;
  onPointerDownMove: (e: React.PointerEvent) => void;
  onPointerDownResize: (e: React.PointerEvent) => void;
  onPointerDownDragDepEnd: (e: React.PointerEvent) => void;
  onPointerDownDragDepStart: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  onClick: () => void;
  isAutoSchedule: boolean;
  isDimmed: boolean;
}

function GanttBar({ tarefa, x, width, baselineX, baselineWidth, isSelected, statusKey, nivel = 1, isHovered, isDropTarget, dropHintSide, onBarMouseEnter, onBarMouseLeave, onPointerDownMove, onPointerDownResize, onPointerDownDragDepEnd, onPointerDownDragDepStart, onDoubleClick, onClick, isAutoSchedule, isDimmed }: GanttBarProps) {
  const isSubtask = nivel > 1;
  const colors = STATUS_COLORS[statusKey] ?? STATUS_COLORS.nao_iniciada;
  const isMilestone = tarefa.tipo_tarefa === 'MARCO';

  // Subetapas usam cores azuis fixas e altura reduzida
  const barH     = isSubtask ? SUB_BAR_H : BAR_H;
  const offsetY  = isSubtask ? SUB_BAR_OFFSET_Y : BAR_OFFSET_Y;
  const barColor = isSubtask ? SUBTASK_COLOR.done : colors.bar;
  const bgOpacity = isSubtask ? 0.25 : 0.22;
  const progressOpacity = isSubtask ? 0.9 : 0.85;

  const progressWidth = Math.max(0, (tarefa.percentual_concluido / 100) * width);
  // Subetapa: parte pendente em azul claro, parte executada em azul médio
  const pendingColor = isSubtask ? SUBTASK_COLOR.pending : barColor;

  return (
    <g className="gantt-bar-group" onMouseEnter={e => onBarMouseEnter(e)} onMouseLeave={onBarMouseLeave} style={{ opacity: isDimmed ? 0.3 : 1, transition: "opacity 0.2s" }}>
      {/* Baseline ghost bar (Sombra total do plano original) */}
      {baselineX !== null && baselineWidth > 0 && (
        <g>
          <rect
            x={baselineX}
            y={offsetY}
            width={Math.max(baselineWidth, 4)}
            height={barH}
            rx={4}
            fill="hsl(var(--muted-foreground))"
            opacity={0.15}
            style={{ mixBlendMode: 'multiply' }}
          />
          {Math.abs(x - baselineX) > 4 && (() => {
            const isDelay = x > baselineX;
            const c = isDelay ? '#ef4444' : '#10b981';
            const yLine = offsetY - 3; 
            const dir = isDelay ? 1 : -1;
            return (
              <g style={{ pointerEvents: 'none', opacity: 0.85 }}>
                <line x1={baselineX} y1={yLine} x2={x} y2={yLine} stroke={c} strokeWidth={1.5} strokeDasharray="2 2" />
                <path d={`M ${x - dir*4} ${yLine - 3} L ${x} ${yLine} L ${x - dir*4} ${yLine + 3}`} fill="none" stroke={c} strokeWidth={1.5} />
              </g>
            );
          })()}
        </g>
      )}

      {isMilestone ? (
        /* Diamond milestone */
        <g
          transform={`translate(${x + 8}, ${ROW_H / 2 + 4}) rotate(45)`}
          style={{ cursor: 'pointer' }}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        >
          <rect x={-7} y={-7} width={14} height={14} fill={colors.bar}
            stroke={isSelected ? '#fff' : 'none'} strokeWidth={2}
          />
        </g>
      ) : (
        <g style={{ cursor: 'grab' }}>
          {/* Selection glow */}
          {isSelected && (
            <rect
              x={x - 2} y={offsetY - 2}
              width={Math.max(width + 4, 8)} height={barH + 4}
              rx={5} fill="none"
              stroke="#3b82f6" strokeWidth={1.5} opacity={0.6}
            />
          )}

          {/* Pending fill (full bar — azul claro para subetapa, normal para etapa) */}
          <rect
            x={x} y={offsetY}
            width={Math.max(width, 6)} height={barH}
            rx={4}
            fill={isSubtask ? pendingColor : barColor}
            opacity={isSubtask ? 0.5 : bgOpacity}
          />

          {/* Progress fill (parte executada) */}
          {progressWidth > 0 && (
            <rect
              x={x} y={offsetY}
              width={progressWidth} height={barH}
              rx={4}
              fill={barColor}
              opacity={progressOpacity}
            />
          )}

          {/* Bar outline */}
          <rect
            x={x} y={offsetY}
            width={Math.max(width, 6)} height={barH}
            rx={4}
            fill="none"
            stroke={barColor}
            strokeWidth={isSelected ? 2 : 1}
            opacity={0.9}
          />

          {/* Drag handle (full bar) */}
          <rect
            x={x} y={offsetY}
            width={Math.max(width - 8, 4)} height={barH}
            rx={4}
            fill="transparent"
            style={{ cursor: 'grab' }}
            onPointerDown={onPointerDownMove}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
          />

          {/* Resize handle (right edge) */}
          {(!isAutoSchedule || tarefa.tipo_tarefa !== 'RESUMO') && (
            <rect
              x={x + Math.max(width - 8, 0)} y={offsetY}
              width={8} height={barH}
              fill="transparent"
              className="cursor-ew-resize"
              onPointerDown={onPointerDownResize}
            />
          )}

          {/* END handle (Finish side) — outside right edge, indigo */}
          <circle
            cx={x + width + 11} cy={offsetY + barH / 2} r={5}
            fill={isHovered ? "#6366f1" : "transparent"}
            stroke={isHovered ? "#ffffff" : "transparent"}
            strokeWidth={1.5}
            style={{ cursor: "crosshair", opacity: isHovered ? 0.85 : 0, transition: "opacity 0.12s" }}
            onPointerDown={onPointerDownDragDepEnd}
          />
          {/* START handle (Start side) — outside left edge, emerald */}
          <circle
            cx={x - 11} cy={offsetY + barH / 2} r={5}
            fill={isHovered ? "#10b981" : "transparent"}
            stroke={isHovered ? "#ffffff" : "transparent"}
            strokeWidth={1.5}
            style={{ cursor: "crosshair", opacity: isHovered ? 0.85 : 0, transition: "opacity 0.12s" }}
            onPointerDown={onPointerDownDragDepStart}
          />
          {/* Drop target halo */}
          {isDropTarget && (
            <rect
              x={x - 3} y={offsetY - 3}
              width={Math.max(width + 6, 12)} height={barH + 6}
              rx={6} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.7}
              style={{ pointerEvents: "none" }}
            />
          )}

          {/* Label — apenas se barra larga o suficiente */}
          {width > 50 && (
            <text
              x={x + 8}
              y={offsetY + barH / 2 + 1}
              fontSize={isSubtask ? 9 : 10}
              fill={tarefa.percentual_concluido > 40 ? '#fff' : barColor}
              dominantBaseline="middle"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {tarefa.nome.length > Math.floor(width / 7)
                ? tarefa.nome.slice(0, Math.floor(width / 7) - 1) + '…'
                : tarefa.nome}
            </text>
          )}

          {/* Critical path indicator (dashed outline) */}
          {tarefa.is_critico && (
            <rect
              x={x} y={offsetY}
              width={Math.max(width, 6)} height={barH}
              rx={4} fill="none"
              stroke="#f97316" strokeWidth={1.5}
              strokeDasharray="4 2"
              opacity={0.6}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      )}
    </g>
  );
}

const GanttBarMemo = React.memo(GanttBar, (prev, next) => {
  return prev.tarefa.id === next.tarefa.id &&
         prev.tarefa.updated_at === next.tarefa.updated_at &&
         prev.x === next.x &&
         prev.width === next.width &&
         prev.baselineX === next.baselineX &&
         prev.baselineWidth === next.baselineWidth &&
         prev.isSelected === next.isSelected &&
         prev.isHovered === next.isHovered &&
         prev.isDropTarget === next.isDropTarget &&
         prev.isAutoSchedule === next.isAutoSchedule &&
         prev.isDimmed === next.isDimmed &&
         prev.nivel === next.nivel &&
         prev.statusKey === next.statusKey;
});

// ─── Main Component ───────────────────────────────────────────────────────────

interface GanttCanvasPanelProps {
  tarefas: CronogramaTarefa[];
  dependencias: CronogramaDependencia[];
  selectedId: string | null;
  onSelectTarefa: (id: string) => void;
  onOpenDrawer: (tarefa: CronogramaTarefa) => void;
  onUpdateTarefa: (id: string, updates: Partial<CronogramaTarefa>) => void;
  onShiftTree?: (parentId: string, deltaDays: number) => void;
  onAddDependencia: (origemId: string, destinoId: string, tipo: TipoDep, lag: number) => void;
  onRemoveDependencia?: (id: string) => void;
  childrenOf?: (parentId: string) => CronogramaTarefa[];
  scrollRef?: React.RefObject<HTMLDivElement>;
  isAutoSchedule?: boolean;
}

export default function GanttCanvasPanel({
  tarefas, dependencias, selectedId, onSelectTarefa, onOpenDrawer, onUpdateTarefa, onShiftTree, childrenOf, onAddDependencia, onRemoveDependencia, scrollRef, isAutoSchedule = true
}: GanttCanvasPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [zoom, setZoom] = useState<ZoomLevel>('weeks');
  const fitApplied = useRef(false);
  const lastObraId = useRef<string | undefined>(undefined);
  const [fitSpanDays, setFitSpanDays] = useState<number | null>(null);

  const [viewStart, setViewStart] = useState<Date>(() => {
    const earliest = tarefas
      .filter(t => t.data_inicio)
      .map(t => parseISO(t.data_inicio!))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const d = earliest ?? new Date();
    d.setDate(1);
    return d;
  });
  
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragDep, setDragDep] = useState<{ tarefaId: string; fromSide: 'start' | 'end'; startX: number; startY: number; initialViewStart: Date } | null>(null);
  const dragDepLineRef = useRef<SVGPathElement>(null);
  const [hoverDepDrop, setHoverDepDrop] = useState<{ id: string; toSide: 'start' | 'end' } | null>(null);
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null);
  const [pendingDep, setPendingDep] = useState<{ origemId: string; destinoId: string; x: number; y: number } | null>(null);
  const [previewDates, setPreviewDates] = useState<Record<string, { start: string; end: string }>>({});
  const [tooltip, setTooltip] = useState<{ tarefa: CronogramaTarefa; x: number; y: number } | null>(null);
  const [todayHovered, setTodayHovered] = useState(false);

  // ── Drag to Pan State ──
  const [isPanning, setIsPanning] = useState(false);
  const dragPanStart = useRef<{ startX: number; viewStart: Date } | null>(null);

  const cellPx = CELL_PX[zoom];
  const defaultSpanDays = zoom === 'days' ? 30 : zoom === 'weeks' ? 70 : zoom === 'months' ? 180 : 365;
  const viewSpanDays = fitSpanDays ?? defaultSpanDays;
  const viewEnd = addDays(viewStart, viewSpanDays);

  const columns = useMemo(() => {
    if (zoom === 'months' || zoom === 'quarters') {
      return eachMonthOfInterval({ start: viewStart, end: viewEnd }).map(m => ({
        label: format(m, zoom === 'quarters' ? 'MMM yy' : 'MMM yyyy', { locale: ptBR }),
        start: m,
        spanDays: differenceInDays(endOfMonth(m), m) + 1,
      }));
    }
    if (zoom === 'weeks') {
      return eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 }).map(w => ({
        label: `Sem ${format(w, 'w')} · ${format(w, 'dd/MM')}`,
        start: w,
        spanDays: 7,
      }));
    }
    const days: { label: string; start: Date; spanDays: number; isWeekend: boolean }[] = [];
    let cur = new Date(viewStart);
    cur.setHours(0, 0, 0, 0);
    while (cur <= viewEnd) {
      const dow = cur.getDay();
      days.push({ label: format(cur, 'dd'), start: new Date(cur), spanDays: 1, isWeekend: dow === 0 || dow === 6 });
      cur = addDays(cur, 1);
    }
    return days;
  }, [zoom, viewStart, viewEnd]);

  // Month groups for the top header row
  const monthGroups = useMemo(() => {
    const ppd = Math.max(canvasWidth, 200) / (fitSpanDays ?? (zoom === 'days' ? 30 : zoom === 'weeks' ? 70 : zoom === 'months' ? 180 : 365));
    const groups: { label: string; x: number; width: number }[] = [];
    const months = eachMonthOfInterval({ start: viewStart, end: viewEnd });
    months.forEach((m, i) => {
      const nextM = months[i + 1] ?? addDays(viewEnd, 1);
      const startDays = Math.max(0, differenceInDays(m, viewStart));
      const endDays = differenceInDays(nextM, viewStart);
      groups.push({
        label: format(m, 'MMMM yyyy', { locale: ptBR }),
        x: startDays * ppd,
        width: (endDays - startDays) * ppd,
      });
    });
    return groups;
  }, [zoom, viewStart, viewEnd, canvasWidth, fitSpanDays]);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setCanvasWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pxPerDay = useCallback((): number => {
    return Math.max(canvasWidth, 200) / viewSpanDays;
  }, [canvasWidth, viewSpanDays]);

  const dateToX = useCallback((dateStr: string | null): number => {
    if (!dateStr) return 0;
    const d = parseISO(dateStr);
    const ppd = pxPerDay();
    return differenceInDays(d, viewStart) * ppd;
  }, [viewStart, pxPerDay]);

  const latestState = useRef({ zoom, canvasWidth, viewSpanDays });
  useEffect(() => { latestState.current = { zoom, canvasWidth, viewSpanDays }; }, [zoom, canvasWidth, viewSpanDays]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Zoom se usar Pinch (ctrlKey) OU se for um scroll vertical comum (deltaY > deltaX)
      if (e.ctrlKey || (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX))) {
        // Pinch-to-zoom / Mouse scroll zoom
        if (e.cancelable) e.preventDefault();
        const zoomDelta = e.deltaY * 0.01;
        
        // Ponto de foco (0 a 1 em relação à largura do canvas)
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const P = mouseX / Math.max(rect.width, 1);

        setFitSpanDays(prev => {
          let currentSpan = prev;
          if (currentSpan === null) {
            const { zoom } = latestState.current;
            currentSpan = zoom === 'days' ? 30 : zoom === 'weeks' ? 70 : zoom === 'months' ? 180 : 365;
          }
          const newSpan = currentSpan * (1 + zoomDelta);
          const clampedSpan = Math.max(5, Math.min(newSpan, 3650));
          
          // Compensa o viewStart para manter a data sob o mouse parada
          if (clampedSpan !== currentSpan) {
            setViewStart(prevStart => {
              const daysShift = (currentSpan! - clampedSpan) * P;
              return addDays(prevStart, daysShift);
            });
          }
          
          return clampedSpan;
        });
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal pan
        if (e.cancelable) e.preventDefault();
        const scrollAmount = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        const ppd = Math.max(latestState.current.canvasWidth, 200) / latestState.current.viewSpanDays;
        const daysToShift = scrollAmount / ppd;
        setViewStart(prev => addDays(prev, daysToShift));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click
    const target = e.target as HTMLElement;
    // Prevent panning if clicking on a task bar or control
    if (target.closest('.gantt-bar-group') || target.closest('button')) return;

    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    setIsPanning(true);
    dragPanStart.current = { startX: e.clientX, viewStart };
  }, [viewStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !dragPanStart.current) return;
    
    const deltaX = dragPanStart.current.startX - e.clientX;
    if (Math.abs(deltaX) > 1) { // Apply a small threshold to avoid micro-jitters
      const ppd = Math.max(latestState.current.canvasWidth, 200) / latestState.current.viewSpanDays;
      const daysToShift = deltaX / ppd;
      setViewStart(addDays(dragPanStart.current.viewStart, daysToShift));
    }
  }, [isPanning]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      setIsPanning(false);
      dragPanStart.current = null;
    }
  }, [isPanning]);

  const criticalIds = useMemo(() => computeCriticalPath(tarefas, dependencias), [tarefas, dependencias]);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((parentId: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  // GANTT-2: traversal recursivo N-níveis
  const collectVisible = useCallback((
    parentId: string | null,
    nivel: number,
  ): VisibleTarefa[] => {
    const nodes = parentId === null
      ? tarefas.filter(t => !t.parent_tarefa_id).sort((a, b) => a.ordem - b.ordem)
      : (childrenOf ? childrenOf(parentId) : tarefas.filter(t => t.parent_tarefa_id === parentId)).sort((a, b) => a.ordem - b.ordem);
    const result: VisibleTarefa[] = [];
    for (const node of nodes) {
      result.push({ ...node, _nivel: nivel });
      const hasChildren = (childrenOf ? childrenOf(node.id) : tarefas.filter(t => t.parent_tarefa_id === node.id)).length > 0;
      if (hasChildren && !collapsedParents.has(node.id)) {
        result.push(...collectVisible(node.id, nivel + 1));
      }
    }
    return result;
  }, [tarefas, collapsedParents, childrenOf]);

  const visibleTarefas = useMemo(() => collectVisible(null, 1), [collectVisible]);

  const tarefaRows = useMemo(() => {
    const m = new Map<string, number>();
    visibleTarefas.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [visibleTarefas]);

  // Glow Focus logic: acha todos predecessors e successors da hoveredBarId
  const connectedNodes = useMemo(() => {
    if (!hoveredBarId) return null;
    const nodes = new Set<string>();
    nodes.add(hoveredBarId);
    
    const addPredecessors = (id: string) => {
      dependencias.forEach(d => {
        if (d.tarefa_destino_id === id && !nodes.has(d.tarefa_origem_id)) {
          nodes.add(d.tarefa_origem_id);
          addPredecessors(d.tarefa_origem_id);
        }
      });
    };

    const addSuccessors = (id: string) => {
      dependencias.forEach(d => {
        if (d.tarefa_origem_id === id && !nodes.has(d.tarefa_destino_id)) {
          nodes.add(d.tarefa_destino_id);
          addSuccessors(d.tarefa_destino_id);
        }
      });
    };

    addPredecessors(hoveredBarId);
    addSuccessors(hoveredBarId);
    return nodes;
  }, [hoveredBarId, dependencias]);

  const totalCanvasHeight = Math.max(visibleTarefas.length * ROW_H + 32, 200);
  const todayX = dateToX(format(new Date(), 'yyyy-MM-dd'));



  const goToToday = () => {
    const d = new Date();
    d.setDate(1);
    setViewStart(d);
  };

  const goToActive = () => {
    if (tarefas.length === 0) return;
    const ativa = tarefas.find(t => t.data_inicio && t.data_fim && new Date() >= parseISO(t.data_inicio) && new Date() <= parseISO(t.data_fim));
    if (ativa?.data_inicio) {
      setViewStart(addDays(parseISO(ativa.data_inicio), -3));
    } else {
      goToToday();
    }
  };

  const fitToTasks = useCallback(() => {
    if (tarefas.length === 0) { goToToday(); return; }
    const dates = tarefas.flatMap(t => [t.data_inicio, t.data_fim].filter(Boolean) as string[]).map(s => parseISO(s));
    if (dates.length === 0) { goToToday(); return; }
    const min = dates.reduce((a, b) => a < b ? a : b);
    const max = dates.reduce((a, b) => a > b ? a : b);
    const span = differenceInDays(max, min);
    const margin = Math.max(7, Math.round(span * 0.05));
    const totalSpan = span + margin * 2;
    if (totalSpan <= 35) setZoom('days');
    else if (totalSpan <= 120) setZoom('weeks');
    else if (totalSpan <= 500) setZoom('months');
    else setZoom('quarters');
    setFitSpanDays(totalSpan);
    setViewStart(addDays(min, -margin));
  }, [tarefas]);

  useEffect(() => {
    if (tarefas.length === 0) return;
    const currentObraId = tarefas[0]?.obra_id;
    if (lastObraId.current !== undefined && lastObraId.current !== currentObraId) {
      fitApplied.current = false;
      setFitSpanDays(null);
    }
    lastObraId.current = currentObraId;
    if (!fitApplied.current) {
      const hasDatedTasks = tarefas.some(t => t.data_inicio);
      if (hasDatedTasks) {
        fitApplied.current = true;
        fitToTasks();
      }
    }
  }, [tarefas, fitToTasks]);

  const handlePointerDownMove = (e: React.PointerEvent, tarefa: CronogramaTarefa) => {
    if (!tarefa.pode_editar_datas || e.button !== 0 || !tarefa.data_inicio || !tarefa.data_fim) return;
    e.stopPropagation();
    setDrag({ type: 'move', tarefaId: tarefa.id, startMouseX: e.clientX, originalStart: tarefa.data_inicio, originalEnd: tarefa.data_fim, initialViewStart: viewStart });
  };

  const handlePointerDownResize = (e: React.PointerEvent, tarefa: CronogramaTarefa) => {
    if (!tarefa.pode_editar_datas || e.button !== 0 || !tarefa.data_inicio || !tarefa.data_fim) return;
    e.stopPropagation();
    setDrag({ type: 'resize-right', tarefaId: tarefa.id, startMouseX: e.clientX, originalStart: tarefa.data_inicio, originalEnd: tarefa.data_fim, initialViewStart: viewStart });
  };

  const handlePointerDownDragDep = (e: React.PointerEvent, tarefa: CronogramaTarefa, rowIdx: number, fromSide: 'start' | 'end') => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const barStart = tarefa.data_inicio ? dateToX(tarefa.data_inicio) : 0;
    const barEnd   = tarefa.data_fim   ? dateToX(tarefa.data_fim) + 8 : barStart + 40;
    const startX = fromSide === 'end' ? barEnd : barStart;
    const startY = rowIdx * ROW_H + ROW_H / 2 + 8;
    setDragDep({ tarefaId: tarefa.id, fromSide, startX, startY, initialViewStart: viewStart });
    setTooltip(null);
    
    // Inicia a linha visual imediatamente
    setTimeout(() => {
      if (dragDepLineRef.current) {
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        dragDepLineRef.current.setAttribute('d', `M ${startX} ${startY} C ${(startX + currentX)/2} ${startY}, ${(startX + currentX)/2} ${currentY}, ${currentX} ${currentY}`);
      }
    }, 0);
  };

  const getAllDescendants = useCallback((parentId: string) => {
    const descendants: CronogramaTarefa[] = [];
    const findDescendants = (pid: string) => {
      const children = tarefas.filter(t => t.parent_tarefa_id === pid);
      children.forEach(c => {
        descendants.push(c);
        findDescendants(c.id);
      });
    };
    findDescendants(parentId);
    return descendants;
  }, [tarefas]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragDep) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !dragDepLineRef.current) return;
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const viewShiftDays = differenceInDays(viewStart, dragDep.initialViewStart);
      const shiftX = viewShiftDays * pxPerDay();
      const { startX, startY } = dragDep;
      const adjustedStartX = startX - shiftX;
      
      dragDepLineRef.current.setAttribute('d', `M ${adjustedStartX} ${startY} C ${(adjustedStartX + currentX)/2} ${startY}, ${(adjustedStartX + currentX)/2} ${currentY}, ${currentX} ${currentY}`);
      return;
    }
    if (!drag) return;
    const deltaX = e.clientX - drag.startMouseX;
    const viewShiftDays = differenceInDays(viewStart, drag.initialViewStart);
    const deltaDays = Math.round(deltaX / pxPerDay()) + viewShiftDays;
    if (deltaDays === 0) { setPreviewDates({}); return; }

    const draggedTask = tarefas.find(t => t.id === drag.tarefaId);
    if (!draggedTask) return;

    if (drag.type === 'move') {
      let finalDelta = deltaDays;

      // Clamping logic for Top-Down (Manual)
      if (!isAutoSchedule && draggedTask.parent_tarefa_id) {
        const parentTask = tarefas.find(t => t.id === draggedTask.parent_tarefa_id);
        if (parentTask && parentTask.data_inicio && parentTask.data_fim) {
          const parentStart = parseISO(parentTask.data_inicio);
          const parentEnd = parseISO(parentTask.data_fim);
          const currentStart = parseISO(drag.originalStart);
          const dur = differenceInDays(parseISO(drag.originalEnd), currentStart);
          
          let minDelta = differenceInDays(parentStart, currentStart);
          let maxDelta = differenceInDays(parentEnd, addDays(currentStart, dur));
          
          finalDelta = Math.max(minDelta, Math.min(finalDelta, maxDelta));
        }
      }

      const newStart = format(addDays(parseISO(drag.originalStart), finalDelta), 'yyyy-MM-dd');
      const dur = differenceInDays(parseISO(drag.originalEnd), parseISO(drag.originalStart));
      const newEnd = format(addDays(parseISO(newStart), dur), 'yyyy-MM-dd');
      
      const newPreviews: Record<string, { start: string; end: string }> = {
        [drag.tarefaId]: { start: newStart, end: newEnd }
      };

      // Preview block movement for RESUMO in manual mode
      if (!isAutoSchedule && draggedTask.tipo_tarefa === 'RESUMO') {
        const descendants = getAllDescendants(drag.tarefaId);
        descendants.forEach(d => {
          if (d.data_inicio && d.data_fim) {
            newPreviews[d.id] = {
              start: format(addDays(parseISO(d.data_inicio), finalDelta), 'yyyy-MM-dd'),
              end: format(addDays(parseISO(d.data_fim), finalDelta), 'yyyy-MM-dd')
            };
          }
        });
      }

      setPreviewDates(newPreviews);
    } else {
      let finalDelta = deltaDays;
      // Constraint parent resize to not crush children
      if (!isAutoSchedule && draggedTask.tipo_tarefa === 'RESUMO') {
        const descendants = getAllDescendants(drag.tarefaId);
        let maxChildEnd = parseISO(drag.originalStart);
        descendants.forEach(d => {
          if (d.data_fim) {
            const dEnd = parseISO(d.data_fim);
            if (dEnd > maxChildEnd) maxChildEnd = dEnd;
          }
        });
        const currentEnd = parseISO(drag.originalEnd);
        const minDelta = differenceInDays(maxChildEnd, currentEnd);
        finalDelta = Math.max(minDelta, finalDelta);
      }

      const newEnd = format(addDays(parseISO(drag.originalEnd), finalDelta), 'yyyy-MM-dd');
      if (newEnd <= drag.originalStart) return;
      setPreviewDates({ [drag.tarefaId]: { start: drag.originalStart, end: newEnd } });
    }
  }, [drag, dragDep, pxPerDay, tarefas, isAutoSchedule, getAllDescendants, viewStart]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!drag) return;
    const preview = previewDates[drag.tarefaId];
    if (preview) {
      const draggedTask = tarefas.find(t => t.id === drag.tarefaId);
      if (!isAutoSchedule && draggedTask?.tipo_tarefa === 'RESUMO' && drag.type === 'move') {
        const deltaDays = differenceInDays(parseISO(preview.start), parseISO(drag.originalStart));
        if (onShiftTree && deltaDays !== 0) {
          onShiftTree(drag.tarefaId, deltaDays);
        }
      } else {
        const start = parseISO(preview.start);
        const end = parseISO(preview.end);
        const duracao_dias = Math.max(1, differenceInDays(end, start) + 1);
        onUpdateTarefa(drag.tarefaId, { data_inicio: preview.start, data_fim: preview.end, duracao_dias });
      }
    }
    setDrag(null);
    setPreviewDates({});
  }, [drag, previewDates, onUpdateTarefa, onShiftTree, tarefas, isAutoSchedule]);

  const handleMouseUpLocal = useCallback((e: MouseEvent) => {
    if (dragDep) {
      if (hoverDepDrop && hoverDepDrop.id !== dragDep.tarefaId) {
        // Determine type from drag sides: fromSide(end->start=FS, end->end=FF, start->start=SS, start->end=SF)
        const fromEnd = dragDep.fromSide === 'end';
        const toEnd   = hoverDepDrop.toSide === 'end';
        const tipo: TipoDep = fromEnd && !toEnd ? 'FS' : fromEnd && toEnd ? 'FF' : !fromEnd && !toEnd ? 'SS' : 'SF';
        onAddDependencia(dragDep.tarefaId, hoverDepDrop.id, tipo, 0);
      }
      setDragDep(null);
      setHoverDepDrop(null);
    } else {
      handleMouseUp(e);
    }
  }, [dragDep, hoverDepDrop, handleMouseUp, onAddDependencia]);

  // ── Global Mouse Pos & Edge Panning ──
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (drag || dragDep) {
      // For edge panning when mouse is still
      if (mousePosRef.current.x > 0) {
        handleMouseMove({ clientX: mousePosRef.current.x, clientY: mousePosRef.current.y } as any);
      }
    }
  }, [viewStart]);

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    if (drag || dragDep) {
      window.addEventListener('mousemove', handleMouseMoveGlobal);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUpLocal);

      const interval = setInterval(() => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) {
          const edgeThreshold = 60;
          const { x } = mousePosRef.current;
          let panDir = 0;
          if (x > 0 && x < rect.left + edgeThreshold) panDir = -1;
          else if (x > 0 && x > rect.right - edgeThreshold) panDir = 1;

          if (panDir !== 0) {
            const shiftDays = panDir * (zoom === 'days' ? 1 : zoom === 'weeks' ? 3 : zoom === 'months' ? 10 : 30);
            setViewStart(prev => addDays(prev, shiftDays));
          }
        }
      }, 50);

      return () => {
        window.removeEventListener('mousemove', handleMouseMoveGlobal);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUpLocal);
        clearInterval(interval);
      };
    }
  }, [drag, dragDep, handleMouseMove, handleMouseUpLocal, zoom]);

  // ── Semantic Zoom ──
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomLevels: ZoomLevel[] = ['days', 'weeks', 'months', 'quarters'];
      const currentIndex = zoomLevels.indexOf(zoom);
      
      let nextIndex = currentIndex;
      if (e.deltaY > 0) {
        nextIndex = Math.min(currentIndex + 1, zoomLevels.length - 1);
      } else if (e.deltaY < 0) {
        nextIndex = Math.max(currentIndex - 1, 0);
      }
      
      if (nextIndex !== currentIndex) {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const ppd = pxPerDay();
          const daysFromStart = mouseX / ppd;
          const mouseDate = addDays(viewStart, Math.round(daysFromStart));
          
          const nextZoom = zoomLevels[nextIndex];
          const newSpanDays = nextZoom === 'days' ? 30 : nextZoom === 'weeks' ? 70 : nextZoom === 'months' ? 180 : 365;
          const newPpd = Math.max(latestState.current.canvasWidth, 200) / newSpanDays;
          
          const newDaysFromStart = mouseX / newPpd;
          const newViewStart = addDays(mouseDate, -Math.round(newDaysFromStart));
          
          setZoom(nextZoom);
          setFitSpanDays(null);
          setViewStart(newViewStart);
        }
      }
    }
  }, [zoom, viewStart, pxPerDay]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const colPositions = useMemo(() => {
    const ppd = pxPerDay();
    return columns.map(col => ({
      x: Math.max(0, differenceInDays(col.start, viewStart) * ppd),
      width: col.spanDays * ppd,
      label: col.label,
      isWeekend: (col as any).isWeekend
    }));
  }, [columns, viewStart, pxPerDay]);

  const navigate = useCallback((dir: 1 | -1) => {
    const step = Math.max(1, Math.round(viewSpanDays / 4));
    setViewStart(prev => addDays(prev, dir * step));
    setFitSpanDays(null);
  }, [viewSpanDays]);

  const renderPortalTools = () => {
    const portalElement = document.getElementById('gantt-toolbar-portal');
    if (!portalElement) return null;
    return createPortal(
      <div className="flex items-center justify-between px-4 py-2 h-full">
        <div className="flex items-center gap-1 text-xs">
          {/* Nav arrows */}
          <button
            onClick={() => navigate(-1)}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
            title="Navegar para trás"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            onClick={() => navigate(1)}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
            title="Navegar para frente"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={fitToTasks}>Fit</Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={goToToday}>Hoje</Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={goToActive}>Ativo</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background rounded-md border border-border">
            {(['days', 'weeks', 'months', 'quarters'] as ZoomLevel[]).map(z => (
              <button
                key={z} onClick={() => { setZoom(z); setFitSpanDays(null); }}
                className={cn('px-3 py-1 text-xs font-medium transition-colors', zoom === z ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}
              >
                {z === 'days' ? 'Dias' : z === 'weeks' ? 'Semanas' : z === 'months' ? 'Meses' : 'Trim.'}
              </button>
            ))}
          </div>
        </div>
      </div>,
      portalElement
    );
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {renderPortalTools()}
      {/* ── Banner: modo de edição de dependências ── */}
      {dragDep && (
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          height: 30, padding: '0 12px',
          background: 'rgba(99,102,241,0.10)',
          borderBottom: '1px solid rgba(99,102,241,0.22)',
          color: '#4f46e5', fontSize: 11, fontWeight: 600,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          Modo de Dependência — Arraste até a tarefa destino
          <button
            onPointerDown={() => setDragDep(null)}
            style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.35)', background: 'transparent', color: '#4f46e5', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
          >
            Esc
          </button>
        </div>
      )}
      {/* ── Double header: month row + col row — sits OUTSIDE scroll area ── */}

      <div className="flex-none border-b border-border z-20" style={{ height: 50, background: 'hsl(var(--muted)/0.92)', backdropFilter: 'blur(6px)' }}>
        <svg width="100%" height={50} className="overflow-visible">
          {/* Month band (top row) */}
          {monthGroups.map((mg, i) => (
            <g key={i}>
              <line x1={mg.x} y1={0} x2={mg.x} y2={22} stroke="hsl(var(--border))" strokeWidth={1} />
              <text
                x={mg.x + Math.min(mg.width / 2, 80)}
                y={14}
                fontSize="10" fontWeight="600"
                fill="hsl(var(--foreground))"
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >{mg.label}</text>
            </g>
          ))}
          {/* Divider between month and col rows */}
          <line x1={0} y1={22} x2="100%" y2={22} stroke="hsl(var(--border))" strokeWidth={0.5} />
          {/* Col band (bottom row) — hoje fica em vermelho */}
          {colPositions.map((col, i) => {
            const isToday = todayX > 0 && col.x <= todayX && todayX < col.x + (col.width ?? 60);
            return (
              <g key={i}>
                {col.isWeekend && <rect x={col.x} y={22} width={col.width} height={28} fill="hsl(var(--muted))" opacity={0.6} />}
                <line x1={col.x} y1={22} x2={col.x} y2={50} stroke="hsl(var(--border))" strokeWidth={0.5} />
                <text
                  x={col.x + 4} y={40}
                  fontSize="8.5"
                  fill={isToday ? '#ef4444' : 'hsl(var(--muted-foreground))'}
                  fontWeight={isToday ? '700' : '500'}
                  style={{ userSelect: 'none' }}
                >{col.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {/* ── Scrollable canvas area ── */}
      <div 
        ref={(el) => {
          // @ts-ignore
          wrapperRef.current = el;
          if (scrollRef) {
            if (typeof scrollRef === 'function') scrollRef(el);
            else (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        className={cn("flex-1 overflow-auto scrollbar-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
        style={{ minHeight: 0 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div ref={canvasRef} className="gantt-canvas-inner relative" style={{ minWidth: '100%', height: totalCanvasHeight + 20 }}>
          <svg width="100%" height={totalCanvasHeight} style={{ display: 'block', overflow: 'visible' }}>
            {colPositions.map((col, i) => (
              <g key={i}>
                {col.isWeekend && <rect x={col.x} y={0} width={col.width} height={totalCanvasHeight} fill="hsl(var(--muted))" opacity={0.3} />}
                <line x1={col.x} y1={0} x2={col.x} y2={totalCanvasHeight} stroke="hsl(var(--border))" strokeWidth={0.4} opacity={0.4} />
              </g>
            ))}
            {visibleTarefas.map((_, i) => (
              <rect key={i} x={0} y={i * ROW_H} width="100%" height={ROW_H} fill={i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)'} />
            ))}
            {/* ── Today line ── */}
            {todayX > 0 && visibleTarefas.length > 0 && (
              <g
                style={{ cursor: 'default' }}
                onMouseEnter={() => setTodayHovered(true)}
                onMouseLeave={() => setTodayHovered(false)}
              >
                {/* Wide invisible hit area */}
                <rect x={todayX - 8} y={0} width={16} height={totalCanvasHeight} fill="transparent" pointerEvents="all" />
                {/* Glow */}
                <line x1={todayX} y1={0} x2={todayX} y2={totalCanvasHeight}
                  stroke="#ef4444" strokeWidth={todayHovered ? 8 : 6} opacity={todayHovered ? 0.12 : 0.06}
                  style={{ transition: 'opacity 0.15s' }}
                />
                {/* Main dashed line */}
                <line x1={todayX} y1={0} x2={todayX} y2={totalCanvasHeight}
                  stroke="#ef4444" strokeWidth={todayHovered ? 2 : 1.5}
                  opacity={todayHovered ? 0.95 : 0.7}
                  strokeDasharray="4 3"
                  style={{ transition: 'opacity 0.15s' }}
                />
                {/* Small dot INSIDE canvas, away from header boundary */}
                <circle cx={todayX} cy={12} r={3.5} fill="#ef4444" opacity={0.85} />
              </g>
            )}
            <DependencyArrowsMemo deps={dependencias} tarefas={visibleTarefas} tarefaRows={tarefaRows} dateToX={dateToX} criticalIds={criticalIds} onRemoveDependencia={id => onRemoveDependencia?.(id)} connectedNodes={connectedNodes} />
            {visibleTarefas.map((tarefa, rowIdx) => {
              const nivel = (tarefa as VisibleTarefa)._nivel ?? 1;
              const indent = (nivel - 1) * SUB_INDENT;
              const preview = previewDates[tarefa.id];
              const displayStart = preview?.start ?? tarefa.data_inicio;
              const displayEnd = preview?.end ?? tarefa.data_fim;
              const hasChildren = (childrenOf ? childrenOf(tarefa.id) : tarefas.filter(t => t.parent_tarefa_id === tarefa.id)).length > 0;
              const isCollapsed = collapsedParents.has(tarefa.id);
              const isHovered = hoveredBarId === tarefa.id;
              const isDropTarget = !!dragDep && hoverDepDrop?.id === tarefa.id && hoverDepDrop?.id !== dragDep?.tarefaId;
              if (!displayStart || !displayEnd) return (
                <g key={tarefa.id} transform={`translate(0, ${rowIdx * ROW_H})`}>
                  {hasChildren && <text x={indent + 4} y={ROW_H / 2 + 4} fontSize="8" fill="#94a3b8" dominantBaseline="middle" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleCollapse(tarefa.id)}>{isCollapsed ? '▶' : '▼'}</text>}
                </g>
              );
              const x = dateToX(displayStart) + indent;
              const width = Math.max(dateToX(displayEnd) - x + pxPerDay() - indent, 8);
              const baseX = tarefa.baseline_inicio ? dateToX(tarefa.baseline_inicio) + indent : null;
              const baseX2 = tarefa.baseline_fim ? dateToX(tarefa.baseline_fim) : null;
              const baselineWidth = baseX !== null && baseX2 !== null ? Math.max(baseX2 - baseX + pxPerDay() - indent, 4) : 0;
              const statusKey = criticalIds.has(tarefa.id) ? 'critico' : computeStatus(tarefa);
              return (
                <g key={tarefa.id} transform={`translate(0, ${rowIdx * ROW_H})`}>
                  {/* Linha vertical de hierarquia */}
                  {nivel > 1 && (
                    <line
                      x1={indent - 4} y1={0}
                      x2={indent - 4} y2={ROW_H / 2}
                      stroke="#cbd5e1" strokeWidth={1} opacity={0.5}
                    />
                  )}

                  <GanttBarMemo
                    tarefa={tarefa}
                    x={x}
                    width={width}
                    baselineX={baseX}
                    baselineWidth={baselineWidth}
                    isSelected={selectedId === tarefa.id}
                    statusKey={statusKey}
                    nivel={nivel}
                    isHovered={isHovered}
                    isDropTarget={isDropTarget}
                    isDimmed={connectedNodes !== null && !connectedNodes.has(tarefa.id)}
                    onBarMouseEnter={(e?: React.MouseEvent) => {
                      setHoveredBarId(tarefa.id);
                      if (e && !dragDep) setTooltip({ tarefa, x: e.clientX, y: e.clientY });
                      if (dragDep && e) {
                        const rect = canvasRef.current?.getBoundingClientRect();
                        const dragX = rect ? e.clientX - rect.left : 0;
                        const toSide: 'start' | 'end' = dragX < (x + width / 2) ? 'start' : 'end';
                        setHoverDepDrop({ id: tarefa.id, toSide });
                      }
                    }}
                    onBarMouseLeave={() => {
                      setHoveredBarId(prev => prev === tarefa.id ? null : prev);
                      setTooltip(null);
                    }}
                    onPointerDownMove={e => handlePointerDownMove(e, tarefa)}
                    onPointerDownResize={e => handlePointerDownResize(e, tarefa)}
                    onPointerDownDragDepEnd={e => handlePointerDownDragDep(e, tarefa, rowIdx, 'end')}
                    onPointerDownDragDepStart={e => handlePointerDownDragDep(e, tarefa, rowIdx, 'start')}
                    onDoubleClick={() => onOpenDrawer(tarefa)}
                    onClick={() => onSelectTarefa(tarefa.id)}
                    isAutoSchedule={isAutoSchedule}
                  />
                </g>
              );
            })}

            {/* Render drag line preview */}
            <path
              ref={dragDepLineRef}
              d=""
              fill="none"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="5 3"
              opacity={dragDep ? 0.8 : 0}
              pointerEvents="none"
            />
          </svg>

          {/* ── Today label card — só no hover (GANTT-7) ── */}
          {todayX > 0 && todayHovered && visibleTarefas.length > 0 && (
            <div
              style={{
                position: 'absolute',
                left: todayX,
                top: 12,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <div style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
                letterSpacing: '0.02em',
              }}>
                Hoje · {format(new Date(), 'dd/MM/yyyy')}
              </div>
              {/* caret */}
              <div style={{
                width: 0, height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid #ef4444',
                margin: '0 auto',
              }} />
            </div>
          )}

          {/* ── Rich Tooltip Portal (GANTT-6) ── */}
          {tooltip && typeof document !== 'undefined' && createPortal(
            <div
              style={{
                position: 'fixed',
                left: Math.min(tooltip.x + 14, window.innerWidth - 240),
                top: Math.max(tooltip.y - 10, 8),
                zIndex: 9999,
                pointerEvents: 'none',
                minWidth: 220,
              }}
            >
              <div style={{
                background: 'hsl(222 47% 11%)',
                color: '#e2e8f0',
                borderRadius: 10,
                padding: '10px 13px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                fontSize: 11,
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#f8fafc', marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 5 }}>
                  {tooltip.tarefa.nome}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', color: '#94a3b8' }}>
                  <span>Início</span>
                  <span style={{ color: '#f1f5f9' }}>{tooltip.tarefa.data_inicio ? format(parseISO(tooltip.tarefa.data_inicio), 'dd/MM/yy') : '—'}</span>
                  <span>Fim</span>
                  <span style={{ color: '#f1f5f9' }}>{tooltip.tarefa.data_fim ? format(parseISO(tooltip.tarefa.data_fim), 'dd/MM/yy') : '—'}</span>
                  <span>Duração</span>
                  <span style={{ color: '#f1f5f9' }}>{tooltip.tarefa.duracao_dias ?? '—'} dias</span>
                  <span>Progresso</span>
                  <span style={{ color: tooltip.tarefa.percentual_concluido >= 100 ? '#34d399' : tooltip.tarefa.percentual_concluido > 0 ? '#60a5fa' : '#f1f5f9' }}>
                    {tooltip.tarefa.percentual_concluido}%
                  </span>
                  {tooltip.tarefa.baseline_inicio && (
                    <>
                      <span>Baseline</span>
                      <span style={{ color: '#fbbf24' }}>
                        {format(parseISO(tooltip.tarefa.baseline_inicio), 'dd/MM')} → {tooltip.tarefa.baseline_fim ? format(parseISO(tooltip.tarefa.baseline_fim), 'dd/MM/yy') : '?'}
                      </span>
                    </>
                  )}
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: tooltip.tarefa.percentual_concluido >= 100 ? '#34d399' : '#60a5fa', width: `${tooltip.tarefa.percentual_concluido}%`, transition: 'width 0.2s' }} />
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Empty state */}
          {visibleTarefas.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground pointer-events-none">
              <div className="text-xs">Adicione tarefas na lista para visualizar o Gantt</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
