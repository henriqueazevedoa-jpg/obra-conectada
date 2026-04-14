import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CascadeResult } from '@/hooks/useGanttDependencies';

export interface GanttChangeInfo {
  taskId: string;
  taskName: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
  isBaseline?: boolean;
  cascadeResults?: CascadeResult[];
}

interface Props {
  change: GanttChangeInfo | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function fmtDate(d: string) {
  return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
}

export default function GanttConfirmDialog({ change, onConfirm, onCancel }: Props) {
  if (!change) return null;

  const oldDuration = differenceInDays(parseISO(change.oldEnd), parseISO(change.oldStart)) + 1;
  const newDuration = differenceInDays(parseISO(change.newEnd), parseISO(change.newStart)) + 1;
  const startDiff = differenceInDays(parseISO(change.newStart), parseISO(change.oldStart));
  const endDiff = differenceInDays(parseISO(change.newEnd), parseISO(change.oldEnd));
  const hasCascade = change.cascadeResults && change.cascadeResults.length > 0;

  return (
    <AlertDialog open={!!change} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {change.isBaseline ? 'Confirmar alteração da baseline' : 'Confirmar alteração de datas'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="font-medium text-foreground">{change.taskName}</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground" />
                <span className="text-muted-foreground font-medium text-center">Anterior</span>
                <span className="text-muted-foreground font-medium text-center">Nova</span>

                <span className="text-muted-foreground">Início</span>
                <span className="text-center">{fmtDate(change.oldStart)}</span>
                <span className="text-center font-medium text-foreground">{fmtDate(change.newStart)}</span>

                <span className="text-muted-foreground">Fim</span>
                <span className="text-center">{fmtDate(change.oldEnd)}</span>
                <span className="text-center font-medium text-foreground">{fmtDate(change.newEnd)}</span>

                <span className="text-muted-foreground">Duração</span>
                <span className="text-center">{oldDuration} dia{oldDuration !== 1 ? 's' : ''}</span>
                <span className="text-center font-medium text-foreground">{newDuration} dia{newDuration !== 1 ? 's' : ''}</span>
              </div>

              {(startDiff !== 0 || endDiff !== 0) && (
                <div className="text-xs bg-muted/50 rounded-md p-2 space-y-0.5">
                  {startDiff !== 0 && (
                    <p>Início {startDiff > 0 ? 'adiado' : 'antecipado'} em <strong>{Math.abs(startDiff)}</strong> dia{Math.abs(startDiff) !== 1 ? 's' : ''}</p>
                  )}
                  {endDiff !== 0 && (
                    <p>Fim {endDiff > 0 ? 'adiado' : 'antecipado'} em <strong>{Math.abs(endDiff)}</strong> dia{Math.abs(endDiff) !== 1 ? 's' : ''}</p>
                  )}
                </div>
              )}

              {/* Cascade impact */}
              {hasCascade && (
                <div className="border border-primary/20 bg-primary/5 rounded-md p-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-primary">⚡ Impacto em etapas dependentes:</p>
                  {change.cascadeResults!.map(cr => {
                    const daysDiff = differenceInDays(parseISO(cr.newStart), parseISO(cr.oldStart));
                    return (
                      <div key={cr.catId} className="text-xs text-foreground bg-background/50 rounded p-1.5">
                        <p className="font-medium">{cr.catName}</p>
                        <p className="text-muted-foreground">
                          {fmtDate(cr.oldStart)} → {fmtDate(cr.newStart)}
                          {daysDiff > 0 && <span className="text-destructive ml-1">(+{daysDiff}d)</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {hasCascade ? `Confirmar (${change.cascadeResults!.length + 1} etapas)` : 'Confirmar alteração'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
