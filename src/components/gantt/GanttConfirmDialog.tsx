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

export interface GanttChangeInfo {
  taskId: string;
  taskName: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
  isBaseline?: boolean;
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
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmar alteração</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
