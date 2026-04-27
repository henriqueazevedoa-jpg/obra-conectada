import { cn } from '@/lib/utils';
import { CELL_DESC, CELL_TIPO, CELL_UN, CELL_QTD, CELL_PUNIT, CELL_TOTAL, CELL_ACOES, PLANILHA_FLEX_ROW } from './planilhaGrid';

interface Props {
  count?: number;
}

export default function InsumoSkeletonRow({ count = 3 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(PLANILHA_FLEX_ROW, 'border-b border-border/20')}
          style={{ height: '32px', animationDelay: `${i * 80}ms` }}
          aria-hidden="true"
        >
          {/* DESC */}
          <div className={cn(CELL_DESC, 'px-3 items-center gap-2')}>
            <div
              className="h-2.5 rounded-full bg-muted-foreground/15 animate-pulse"
              style={{ width: `${45 + (i % 3) * 15}%` }}
            />
          </div>

          {/* TIPO */}
          <div className={cn(CELL_TIPO)}>
            <div className="h-4 w-8 rounded bg-muted-foreground/10 animate-pulse mx-auto" />
          </div>

          {/* UN */}
          <div className={cn(CELL_UN)}>
            <div className="h-2.5 w-8 rounded-full bg-muted-foreground/10 animate-pulse mx-auto" />
          </div>

          {/* QTD */}
          <div className={cn(CELL_QTD, 'justify-end px-3')}>
            <div className="h-2.5 w-10 rounded-full bg-muted-foreground/10 animate-pulse" />
          </div>

          {/* PUNIT */}
          <div className={cn(CELL_PUNIT, 'justify-end px-3')}>
            <div className="h-2.5 w-14 rounded-full bg-muted-foreground/10 animate-pulse" />
          </div>

          {/* TOTAL */}
          <div className={cn(CELL_TOTAL, 'justify-end px-3')}>
            <div className="h-2.5 w-16 rounded-full bg-muted-foreground/10 animate-pulse" />
          </div>

          {/* AÇÕES */}
          <div className={cn(CELL_ACOES)} />
        </div>
      ))}
    </>
  );
}
