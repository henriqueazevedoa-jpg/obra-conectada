import { memo, useMemo } from 'react';
import { format, addDays, startOfMonth, differenceInDays, isBefore, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  timelineStart: Date;
  totalDays: number;
  dayWidth: number;
}

function GanttTimelineHeader({ timelineStart, totalDays, dayWidth }: Props) {
  const months = useMemo(() => {
    const result: { label: string; left: number; width: number }[] = [];
    const end = addDays(timelineStart, totalDays);
    let cur = startOfMonth(timelineStart);
    let safety = 0;

    while ((isBefore(cur, end) || cur.getMonth() === end.getMonth()) && safety < 48) {
      const next = addMonths(cur, 1);
      const mStart = isBefore(cur, timelineStart) ? timelineStart : cur;
      const mEnd = isBefore(next, end) ? next : end;
      const left = differenceInDays(mStart, timelineStart) * dayWidth;
      const width = differenceInDays(mEnd, mStart) * dayWidth;

      if (width > 0) {
        result.push({
          label: format(cur, 'MMM yyyy', { locale: ptBR }),
          left,
          width,
        });
      }
      cur = next;
      safety++;
    }
    return result;
  }, [timelineStart, totalDays, dayWidth]);

  return (
    <div className="relative h-8 border-b border-border bg-muted/30" style={{ width: totalDays * dayWidth }}>
      {months.map((m, i) => (
        <div
          key={i}
          className="absolute top-0 h-full border-r border-border/50 flex items-center px-2"
          style={{ left: m.left, width: m.width }}
        >
          <span className="text-[10px] font-medium text-muted-foreground uppercase truncate">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(GanttTimelineHeader);
