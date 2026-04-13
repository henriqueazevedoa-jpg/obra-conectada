export interface GanttTask {
  id: string;
  name: string;
  code: string;
  startDate?: string;   // yyyy-MM-dd (planned)
  endDate?: string;      // yyyy-MM-dd (planned)
  actualStart?: string;
  actualEnd?: string;
  progress: number;      // 0-100
  status: 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada';
  groupId?: string;
  children?: GanttTask[];
  isGroup?: boolean;
}

export interface GanttDragState {
  taskId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  originalStart: string;
  originalEnd: string;
}

export const STATUS_COLORS: Record<string, { bar: string; bg: string }> = {
  nao_iniciada: { bar: 'bg-muted-foreground/40', bg: 'bg-muted-foreground/10' },
  em_andamento: { bar: 'bg-primary', bg: 'bg-primary/20' },
  concluida: { bar: 'bg-success', bg: 'bg-success/20' },
  atrasada: { bar: 'bg-destructive', bg: 'bg-destructive/20' },
};

export const STATUS_LABELS: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
};
