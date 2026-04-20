import { useRef, useMemo, useState, useCallback, useEffect, useLayoutEffect } from 'react';
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
}

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

// ─── SVG Dependency Arrows ───────────────────────────────────────────────────

interface ArrowsProps {
  deps: CronogramaDependencia[];
  tarefas: CronogramaTarefa[];
  tarefaRows: Map<string, number>; // tarefaId → rowIndex
  dateToX: (d: string | null) => number;
  criticalIds: Set<string>;
}

function DependencyArrows({ deps, tarefas, tarefaRows, dateToX, criticalIds }: ArrowsProps) {
  const taskMap = new Map(tarefas.map(t => [t.id, t]));
  const totalHeight = (tarefas.length + 1) * ROW_H;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: totalHeight, overflow: 'visible' }}
    >
      <defs>
        <marker id="arrow-normal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
        </marker>
        <marker id="arrow-critical" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#f97316" />
        </marker>
        <marker id="arrow-selected" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" />
        </marker>
      </defs>

      {deps.map(dep => {
        const origRow = tarefaRows.get(dep.tarefa_origem_id);
        const destRow = tarefaRows.get(dep.tarefa_destino_id);
        const orig = taskMap.get(dep.tarefa_origem_id);
        const dest = taskMap.get(dep.tarefa_destino_id);

        if (origRow === undefined || destRow === undefined || !orig || !dest) return null;

        const isCritical = criticalIds.has(dep.tarefa_origem_id) && criticalIds.has(dep.tarefa_destino_id);
        const color = isCritical ? '#f97316' : '#94a3b8';
        const markerId = isCritical ? 'arrow-critical' : 'arrow-normal';
        const isFFOrSF = dep.tipo === 'FF' || dep.tipo === 'SF';

        // Geometry by dependency type (Bloco 1.2)
        let x1: number, x2: number;
        if (dep.tipo === 'SS') {
          // SS: origin = start of predecessor bar, destination = start of successor bar
          if (!orig.data_inicio || !dest.data_inicio) return null;
          x1 = dateToX(orig.data_inicio) + 2;
          x2 = dateToX(dest.data_inicio) - 2;
        } else {
          // FS (and FF/SF visual fallback): origin = end of predecessor, dest = start of successor
          if (!orig.data_fim || !dest.data_inicio) return null;
          x1 = dateToX(orig.data_fim) + 8;
          x2 = dateToX(dest.data_inicio) - 2;
        }

        const y1 = (origRow * ROW_H) + ROW_H / 2 + 8;
        const y2 = (destRow * ROW_H) + ROW_H / 2 + 8;
        const cx = (x1 + x2) / 2;
        const isDashed = dep.tipo !== 'FS';

        return (
          <g key={dep.id}>
            <path
              d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth={isCritical ? 1.5 : 1}
              strokeDasharray={isDashed ? '4 2' : undefined}
              markerEnd={`url(#${markerId})`}
              opacity={0.7}
            />
            {/* FF/SF tooltip hint — small label on midpoint */}
            {isFFOrSF && (
              <text
                x={cx}
                y={(y1 + y2) / 2 - 4}
                fontSize="7"
                fill="#94a3b8"
                textAnchor="middle"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {dep.tipo}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Gantt Bar ────────────────────────────────────────────────────────────────

interface GanttBarProps {
  tarefa: CronogramaTarefa;
  x: number;
  width: number;
  baselineX: number | null;
  baselineWidth: number;
  isSelected: boolean;
  statusKey: string;
  isSubtask?: boolean;  // subetapa: cor azul + altura reduzida
  onMouseDownMove: (e: React.MouseEvent) => void;
  onMouseDownResize: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onClick: () => void;
}

function GanttBar({ tarefa, x, width, baselineX, baselineWidth, isSelected, statusKey, isSubtask, onMouseDownMove, onMouseDownResize, onDoubleClick, onClick }: GanttBarProps) {
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
    <g>
      {/* Baseline ghost bar */}
      {baselineX !== null && baselineWidth > 0 && (
        <rect
          x={baselineX}
          y={offsetY + barH + 4}
          width={Math.max(baselineWidth, 4)}
          height={4}
          rx={2}
          fill="#1E3A5F"
          opacity={0.85}
        />
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
            onMouseDown={onMouseDownMove}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
          />

          {/* Resize handle (right edge) */}
          <rect
            x={x + Math.max(width - 8, 0)} y={offsetY}
            width={8} height={barH}
            rx={4}
            fill="transparent"
            style={{ cursor: 'col-resize' }}
            onMouseDown={onMouseDownResize}
          />

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

// ─── Main Component ───────────────────────────────────────────────────────────

interface GanttCanvasPanelProps {
  tarefas: CronogramaTarefa[];
  dependencias: CronogramaDependencia[];
  selectedId: string | null;
  onSelectTarefa: (id: string) => void;
  onOpenDrawer: (tarefa: CronogramaTarefa) => void;
  onUpdateDates: (id: string, start: string, end: string) => void;
  onAddDependencia: (origemId: string, destinoId: string, tipo: TipoDep, lag: number) => void;
  /** Bloco 6: retorna filhos de uma tarefa (para barra de composição de tarefas RESUMO) */
  childrenOf?: (parentId: string) => CronogramaTarefa[];
}

export default function GanttCanvasPanel({
  tarefas, dependencias, selectedId, onSelectTarefa, onOpenDrawer, onUpdateDates, childrenOf,
}: GanttCanvasPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // Largura real do canvas medida via ResizeObserver — evita leitura imperativa com clientWidth=0
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [zoom, setZoom] = useState<ZoomLevel>('weeks');
  // Bloco 3: flag para aplicar Fit apenas uma vez ao carregar
  const fitApplied = useRef(false);
  // Rastreia a obra atual para detectar troca e re-aplicar Fit
  const lastObraId = useRef<string | undefined>(undefined);
  // Bloco 3: span real em dias quando Fit está ativo (null = usa padrão do zoom)
  const [fitSpanDays, setFitSpanDays] = useState<number | null>(null);

  // Bloco 3: Fit mode — inicializa viewStart na data mais cedo das tarefas (ou hoje)
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
  const [previewDates, setPreviewDates] = useState<Record<string, { start: string; end: string }>>({})
;

  const cellPx = CELL_PX[zoom];
  // Quando Fit está ativo usa o span real; senão usa o padrão do nível de zoom
  const defaultSpanDays = zoom === 'days' ? 30 : zoom === 'weeks' ? 70 : zoom === 'months' ? 180 : 365;
  const viewSpanDays = fitSpanDays ?? defaultSpanDays;
  const viewEnd = addDays(viewStart, viewSpanDays);

  // ── Time columns ───────────────────────────────────────────────────────────
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
    // days
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

  const totalWidth = columns.reduce((s, c) => s + (c.spanDays / viewSpanDays) * (cellPx * (viewSpanDays / (zoom === 'weeks' ? 7 : zoom === 'days' ? 1 : 30))), 0);

  // ── Pixel conversion ───────────────────────────────────────────────────────
  const dateToX = useCallback((dateStr: string | null): number => {
    if (!dateStr) return 0;
    const d = parseISO(dateStr);
    const totalDays = differenceInDays(viewEnd, viewStart) || 1;
    const pxPerDay = (cellPx * (viewSpanDays / 7)) / totalDays * (totalDays / viewSpanDays);
    const pixelsPerDay = (containerRef.current?.scrollWidth ?? 800) / viewSpanDays;
    return Math.max(0, differenceInDays(d, viewStart) * pixelsPerDay);
  }, [viewStart, viewEnd, viewSpanDays, cellPx]);

  // ResizeObserver — mede a largura do canvas uma vez disponível e reage a mudanças
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

  // pxPerDay agora usa o state canvasWidth (reativo) em vez de leitura imperativa
  const pxPerDay = useCallback((): number => {
    return Math.max(canvasWidth, 200) / viewSpanDays;
  }, [canvasWidth, viewSpanDays]);

  const dateToXv2 = useCallback((dateStr: string | null): number => {
    if (!dateStr) return 0;
    const d = parseISO(dateStr);
    const ppd = pxPerDay();
    return Math.max(0, differenceInDays(d, viewStart) * ppd);
  }, [viewStart, pxPerDay]);

  const xToDate = useCallback((x: number): string => {
    const ppd = pxPerDay();
    const daysOffset = Math.round(x / ppd);
    return format(addDays(viewStart, daysOffset), 'yyyy-MM-dd');
  }, [viewStart, pxPerDay]);

  // ── Critical path ──────────────────────────────────────────────────────────
  const criticalIds = useMemo(() => computeCriticalPath(tarefas, dependencias), [tarefas, dependencias]);

  // ── Collapse state — persiste por sessão nos pais com filhos ───────────────
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((parentId: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  // ── Visible tasks — raízes + filhas de pais não colapsados ────────────────
  const visibleTarefas = useMemo(() => {
    const rootTasks = tarefas
      .filter(t => !t.parent_tarefa_id)
      .sort((a, b) => a.ordem - b.ordem);

    const result: (CronogramaTarefa & { _isSubtask?: boolean })[] = [];
    for (const root of rootTasks) {
      result.push(root);
      // Se o pai NÃO está colapsado, inserir filhas com data definida
      if (!collapsedParents.has(root.id)) {
        const children = (childrenOf ? childrenOf(root.id) : []).sort((a, b) => a.ordem - b.ordem);
        for (const child of children) {
          // Subetapas sem data de início/fim são ocultas do Gantt
          if (child.data_inicio && child.data_fim) {
            result.push({ ...child, _isSubtask: true });
          }
        }
      }
    }
    return result;
  }, [tarefas, collapsedParents, childrenOf]);

  const tarefaRows = useMemo(() => {
    const m = new Map<string, number>();
    visibleTarefas.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [visibleTarefas]);

  const totalCanvasHeight = Math.max(visibleTarefas.length * ROW_H + 32, 200);

  // ── Today position ─────────────────────────────────────────────────────────
  const todayX = dateToXv2(format(new Date(), 'yyyy-MM-dd'));

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigate = (dir: number) => {
    const step = zoom === 'days' ? 14 : zoom === 'weeks' ? 28 : 60;
    setViewStart(prev => addDays(prev, dir * step));
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(1);
    setViewStart(d);
  };

  // Bloco 3: Fit — ajusta a janela para cobrir TODAS as tarefas com margem
  const fitToTasks = useCallback(() => {
    if (tarefas.length === 0) { goToToday(); return; }
    const dates = tarefas.flatMap(t => [t.data_inicio, t.data_fim].filter(Boolean) as string[]).map(s => parseISO(s));
    if (dates.length === 0) { goToToday(); return; }
    const min = dates.reduce((a, b) => a < b ? a : b);
    const max = dates.reduce((a, b) => a > b ? a : b);
    const span = differenceInDays(max, min);
    // Margem de 10% (mínimo 7 dias) de cada lado
    const margin = Math.max(7, Math.round(span * 0.05));
    const totalSpan = span + margin * 2;
    // Escolher quião de zoom que melhor se encaixa no span
    if (totalSpan <= 35) setZoom('days');
    else if (totalSpan <= 120) setZoom('weeks');
    else if (totalSpan <= 500) setZoom('months');
    else setZoom('quarters');
    // Salvar o span real para que viewSpanDays use esse valor
    setFitSpanDays(totalSpan);
    setViewStart(addDays(min, -margin));
  }, [tarefas]);

  // Bloco 3: Fit mode como padrão — aplica automaticamente ao carregar e ao trocar de obra
  useEffect(() => {
    if (tarefas.length === 0) return;

    const currentObraId = tarefas[0]?.obra_id;

    // Detecta troca de obra: reseta o flag para re-aplicar o Fit
    if (lastObraId.current !== undefined && lastObraId.current !== currentObraId) {
      fitApplied.current = false;
      setFitSpanDays(null); // limpa span customizado da obra anterior
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

  // Bloco 3: Ir para a primeira tarefa em andamento
  const goToAtivo = () => {
    const ativa = tarefas.find(t => t.data_inicio && t.data_fim && new Date() >= parseISO(t.data_inicio) && new Date() <= parseISO(t.data_fim));
    if (ativa?.data_inicio) {
      setViewStart(addDays(parseISO(ativa.data_inicio), -3));
    } else {
      goToToday();
    }
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleMouseDownMove = useCallback((e: React.MouseEvent, tarefa: CronogramaTarefa) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tarefa.data_inicio || !tarefa.data_fim) return;
    setDrag({
      type: 'move',
      tarefaId: tarefa.id,
      startMouseX: e.clientX,
      originalStart: tarefa.data_inicio,
      originalEnd: tarefa.data_fim,
    });
  }, []);

  const handleMouseDownResize = useCallback((e: React.MouseEvent, tarefa: CronogramaTarefa) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tarefa.data_inicio || !tarefa.data_fim) return;
    setDrag({
      type: 'resize-right',
      tarefaId: tarefa.id,
      startMouseX: e.clientX,
      originalStart: tarefa.data_inicio,
      originalEnd: tarefa.data_fim,
    });
  }, []);

  useEffect(() => {
    if (!drag) return;

    const ppd = pxPerDay();

    const handleMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - drag.startMouseX;
      const deltaDays = Math.round(deltaPx / ppd);

      if (deltaDays === 0) { setPreviewDates({}); return; }

      if (drag.type === 'move') {
        const newStart = format(addDays(parseISO(drag.originalStart), deltaDays), 'yyyy-MM-dd');
        const dur = differenceInDays(parseISO(drag.originalEnd), parseISO(drag.originalStart));
        const newEnd = format(addDays(parseISO(newStart), dur), 'yyyy-MM-dd');
        setPreviewDates({ [drag.tarefaId]: { start: newStart, end: newEnd } });
      } else {
        // resize-right: only extend the end date
        const newEnd = format(addDays(parseISO(drag.originalEnd), deltaDays), 'yyyy-MM-dd');
        if (newEnd <= drag.originalStart) return;
        setPreviewDates({ [drag.tarefaId]: { start: drag.originalStart, end: newEnd } });
      }
    };

    const handleMouseUp = () => {
      const preview = previewDates[drag.tarefaId];
      if (preview) {
        onUpdateDates(drag.tarefaId, preview.start, preview.end);
        toast({
          title: 'Datas atualizadas',
          description: `Tarefa movida para ${format(parseISO(preview.start), 'dd/MM/yy')} → ${format(parseISO(preview.end), 'dd/MM/yy')}`,
        });
      }
      setDrag(null);
      setPreviewDates({});
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drag, pxPerDay, previewDates, onUpdateDates]);

  // ── Column pixel positions (for the header) ────────────────────────────────
  const colPositions = useMemo(() => {
    const ppd = pxPerDay();
    const positions: { x: number; width: number; label: string; isWeekend?: boolean }[] = [];
    columns.forEach(col => {
      const x = differenceInDays(col.start, viewStart) * ppd;
      const w = col.spanDays * ppd;
      positions.push({ x: Math.max(0, x), width: w, label: col.label, isWeekend: (col as any).isWeekend });
    });
    return positions;
  }, [columns, viewStart, pxPerDay]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col h-full select-none', drag && 'cursor-grabbing')}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-card shrink-0">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[11px] text-muted-foreground w-28 text-center font-medium">
          {format(viewStart, 'MMM yyyy', { locale: ptBR })} – {format(viewEnd, 'MMM yyyy', { locale: ptBR })}
        </span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigate(1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />

        {/* Bloco 3: Fit, Ativo, Hoje — agrupados e visíveis */}
        <div className="flex border border-border rounded-md overflow-hidden shrink-0">
          <button
            onClick={fitToTasks}
            title="Ajustar visualização para cobrir todas as tarefas"
            className="px-2 h-6 text-[10px] font-medium text-primary bg-primary/5 hover:bg-primary/15 transition-colors border-r border-border"
          >
            Fit
          </button>
          <button
            onClick={goToAtivo}
            title="Ir para a tarefa ativa"
            className="px-2 h-6 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-r border-border"
          >
            Ativo
          </button>
          <button
            onClick={goToToday}
            title="Ir para hoje"
            className="px-2 h-6 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Hoje
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex border border-border rounded-md overflow-hidden">
          {([['days', 'Dias'], ['weeks', 'Sem.'], ['months', 'Meses'], ['quarters', 'Trim.']] as [ZoomLevel, string][]).map(([z, label]) => (
            <button
              key={z}
              onClick={() => { setZoom(z); setFitSpanDays(null); }}
              className={cn(
                'px-2 h-6 text-[10px] transition-colors',
                zoom === z ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="hidden xl:flex items-center gap-2 border-l border-border pl-2 ml-1">
          {criticalIds.size > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm bg-orange-500" />
              <span className="text-[9px] text-muted-foreground">Caminho Crítico</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ background: '#10b981' }} />
            <span className="text-[9px] text-muted-foreground">Etapa normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ background: '#3B82F6' }} />
            <span className="text-[9px] text-muted-foreground">Subetapa</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rotate-45" style={{ background: '#94a3b8', display: 'inline-block' }} />
            <span className="text-[9px] text-muted-foreground">Marco</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 rounded-full bg-[#1E3A5F]" />
            <span className="text-[9px] text-muted-foreground">Baseline</span>
          </div>
        </div>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto scrollbar-none">
        <div
          ref={canvasRef}
          className="gantt-canvas-inner relative"
          style={{ minWidth: '100%', height: totalCanvasHeight + 32 }}
        >
          {/* Time header */}
          <div className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm border-b border-border" style={{ height: 28 }}>
            <svg width="100%" height={28} className="overflow-visible">
              {colPositions.map((col, i) => (
                <g key={i}>
                  {col.isWeekend && (
                    <rect x={col.x} y={0} width={col.width} height={28} fill="#f1f5f9" opacity={0.5} />
                  )}
                  <line x1={col.x} y1={0} x2={col.x} y2={28} stroke="hsl(var(--border))" strokeWidth={0.5} />
                  <text x={col.x + 4} y={17} fontSize="9" fill="hsl(var(--muted-foreground))" fontWeight="500">
                    {col.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* SVG canvas for bars + arrows */}
          <svg
            width="100%"
            height={totalCanvasHeight}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* Grid columns (weekends + lines) */}
            {colPositions.map((col, i) => (
              <g key={i}>
                {col.isWeekend && (
                  <rect x={col.x} y={0} width={col.width} height={totalCanvasHeight} fill="#f8fafc" opacity={0.6} />
                )}
                <line x1={col.x} y1={0} x2={col.x} y2={totalCanvasHeight} stroke="hsl(var(--border))" strokeWidth={0.4} opacity={0.5} />
              </g>
            ))}

            {/* Row alternating backgrounds */}
            {visibleTarefas.map((_, i) => (
              <rect key={i} x={0} y={i * ROW_H} width="100%" height={ROW_H}
                fill={i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)'}
              />
            ))}

            {/* Row horizontal lines */}
            {visibleTarefas.map((_, i) => (
              <line key={i} x1={0} y1={(i + 1) * ROW_H} x2="100%" y2={(i + 1) * ROW_H}
                stroke="hsl(var(--border))" strokeWidth={0.4} opacity={0.4}
              />
            ))}

            {/* Today line */}
            {todayX > 0 && (
              <g>
                <line x1={todayX} y1={0} x2={todayX} y2={totalCanvasHeight}
                  stroke="#ef4444" strokeWidth={1.5} opacity={0.5}
                />
                <circle cx={todayX} cy={4} r={3} fill="#ef4444" opacity={0.7} />
                {/* Label "hoje" no topo da linha */}
                <g transform={`translate(${todayX}, 0)`}>
                  <rect x={-15} y={6} width={30} height={13} rx={3}
                    fill="var(--color-background-primary)" stroke="#F09595" strokeWidth={0.5}
                  />
                  <text x={0} y={15.5} textAnchor="middle"
                    fontSize={9} fontWeight={500} fill="#A32D2D"
                    style={{ fontFamily: 'inherit', userSelect: 'none', pointerEvents: 'none' }}
                  >
                    hoje
                  </text>
                </g>
              </g>
            )}

            {/* Dependency arrows */}
            <DependencyArrows
              deps={dependencias}
              tarefas={visibleTarefas}
              tarefaRows={tarefaRows}
              dateToX={dateToXv2}
              criticalIds={criticalIds}
            />

            {/* Task bars */}
            {visibleTarefas.map((tarefa, rowIdx) => {
              const isSubtask = !!(tarefa as any)._isSubtask;
              const indent = isSubtask ? SUB_INDENT : 0;
              const preview = previewDates[tarefa.id];
              const displayStart = preview?.start ?? tarefa.data_inicio;
              const displayEnd = preview?.end ?? tarefa.data_fim;

              // Barra de composição para tarefas RESUMO (Agrupador) — só em raízes
              const isResumo = !isSubtask && tarefa.tipo_tarefa === 'RESUMO';
              const children = isResumo && childrenOf ? childrenOf(tarefa.id) : [];
              const childDates = children
                .flatMap(c => [c.data_inicio, c.data_fim].filter(Boolean) as string[])
                .map(s => parseISO(s));
              const compStart = childDates.length > 0 ? childDates.reduce((a, b) => a < b ? a : b) : null;
              const compEnd   = childDates.length > 0 ? childDates.reduce((a, b) => a > b ? a : b) : null;
              const compX  = compStart ? dateToXv2(format(compStart, 'yyyy-MM-dd')) : null;
              const compX2 = compEnd   ? dateToXv2(format(compEnd,   'yyyy-MM-dd')) : null;
              const compWidth = compX !== null && compX2 !== null ? Math.max(compX2 - compX + pxPerDay(), 8) : 0;

              // Verificar se este pai tem filhas (para ícone de toggle)
              const hasChildren = !isSubtask && (childrenOf ? childrenOf(tarefa.id) : []).length > 0;
              const isCollapsed = collapsedParents.has(tarefa.id);

              if (!displayStart || !displayEnd) {
                return (
                  <g key={tarefa.id} transform={`translate(0, ${rowIdx * ROW_H})`}>
                    {/* Composition bar even without own dates */}
                    {compX !== null && compWidth > 0 && (
                      <g>
                        <rect x={compX} y={BAR_OFFSET_Y + 4} width={compWidth} height={BAR_H - 8} rx={3} fill="#64748b" opacity={0.15} />
                        <rect x={compX} y={BAR_OFFSET_Y + 4} width={compWidth} height={BAR_H - 8} rx={3} fill="none" stroke="#64748b" strokeWidth={1} opacity={0.5} />
                      </g>
                    )}
                    {/* Ícone collapse/expand para pais sem data */}
                    {hasChildren && (
                      <text
                        x={4} y={ROW_H / 2 + 4} fontSize="8" fill="#94a3b8"
                        dominantBaseline="middle" style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleCollapse(tarefa.id)}
                      >{isCollapsed ? '▶' : '▼'}</text>
                    )}
                  </g>
                );
              }

              const x = dateToXv2(displayStart) + indent;
              const x2 = dateToXv2(displayEnd);
              const width = Math.max(x2 - x + pxPerDay() - indent, 8);

              const baseX = tarefa.baseline_inicio ? dateToXv2(tarefa.baseline_inicio) + indent : null;
              const baseX2 = tarefa.baseline_fim ? dateToXv2(tarefa.baseline_fim) : null;
              const baselineWidth = baseX !== null && baseX2 !== null ? Math.max(baseX2 - baseX + pxPerDay() - indent, 4) : 0;

              const statusKey = criticalIds.has(tarefa.id) ? 'critico' : computeStatus(tarefa);
              const isDragging = drag?.tarefaId === tarefa.id;

              return (
                <g
                  key={tarefa.id}
                  transform={`translate(0, ${rowIdx * ROW_H})`}
                  opacity={isDragging ? 0.7 : 1}
                >
                  {/* Bracket de agrupador só quando o RESUMO NÃO tem datas próprias
                      — quando tem datas, a GanttBar já representa o agrupador visualmente */}

                  {/* Ícone colapsar/expandir — pais com filhas */}
                  {hasChildren && (
                    <text
                      x={4} y={ROW_H / 2 + 4} fontSize="8" fill="#94a3b8"
                      dominantBaseline="middle" style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleCollapse(tarefa.id)}
                    >{isCollapsed ? '▶' : '▼'}</text>
                  )}

                  {/* Linha de conexão vertical — subetapa */}
                  {isSubtask && (
                    <line
                      x1={SUB_INDENT - 4} y1={0}
                      x2={SUB_INDENT - 4} y2={ROW_H / 2}
                      stroke="#cbd5e1" strokeWidth={1} opacity={0.5}
                    />
                  )}

                  <GanttBar
                    tarefa={tarefa}
                    x={x}
                    width={width}
                    baselineX={baseX}
                    baselineWidth={baselineWidth}
                    isSelected={selectedId === tarefa.id}
                    statusKey={statusKey}
                    isSubtask={isSubtask}
                    onMouseDownMove={e => handleMouseDownMove(e, tarefa)}
                    onMouseDownResize={e => handleMouseDownResize(e, tarefa)}
                    onDoubleClick={() => onOpenDrawer(tarefa)}
                    onClick={() => onSelectTarefa(tarefa.id)}
                  />
                </g>
              );
            })}
          </svg>

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
