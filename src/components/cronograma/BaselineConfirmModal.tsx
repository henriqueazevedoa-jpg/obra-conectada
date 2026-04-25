import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock } from 'lucide-react';

interface BaselineConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export default function BaselineConfirmModal({
  open, onOpenChange, onConfirm,
  title = "Confirmar Baseline",
  description = "Após definir o baseline, as datas planejadas serão congeladas. Qualquer alteração futura nas datas reais será registrada como um desvio do plano original. Deseja confirmar?",
  loading = false,
}: BaselineConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-3">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 flex items-start gap-3 mt-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Esta ação é um marco importante no projeto. Certifique-se de que todas as durações estimadas foram revisadas.
          </p>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="gap-2">
            {loading ? 'Salvando...' : 'Definir Baseline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
