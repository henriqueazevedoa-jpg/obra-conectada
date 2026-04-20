import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  PenLine, LayoutTemplate, DatabaseZap, ClipboardPaste, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LS_KEY = 'oc:orcamento_started';

interface QuickStartModalProps {
  /** Abrir somente quando não há etapas nesta obra */
  hasNoEtapas: boolean;
  onStartManual: () => void;
  onOpenTemplates: () => void;
  onOpenSinapi: () => void;
  onOpenPaste: () => void;
}

interface Option {
  icon: React.ReactNode;
  label: string;
  description: string;
  action: () => void;
  color: string;
  border: string;
  bg: string;
  iconBg: string;
}

export default function QuickStartModal({
  hasNoEtapas,
  onStartManual,
  onOpenTemplates,
  onOpenSinapi,
  onOpenPaste,
}: QuickStartModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasNoEtapas && !localStorage.getItem(LS_KEY)) {
      // Pequeno delay para não interferir com o carregamento inicial
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [hasNoEtapas]);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(LS_KEY, '1');
  };

  const handleOption = (action: () => void) => {
    dismiss();
    action();
  };

  const options: Option[] = [
    {
      icon: <PenLine className="h-5 w-5" />,
      label: 'Do zero',
      description: 'Crie etapas e composições manualmente, com total controle da estrutura.',
      action: onStartManual,
      color: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
      bg: 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
      iconBg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      icon: <LayoutTemplate className="h-5 w-5" />,
      label: 'Modelos de Etapa',
      description: 'Comece com etapas pré-configuradas (ex: Fundação, Alvenaria, Cobertura).',
      action: onOpenTemplates,
      color: 'text-violet-700 dark:text-violet-400',
      border: 'border-violet-200 dark:border-violet-800/60',
      bg: 'hover:bg-violet-50 dark:hover:bg-violet-950/30',
      iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    },
    {
      icon: <DatabaseZap className="h-5 w-5" />,
      label: 'Importar do SINAPI',
      description: 'Adicione composições direto da tabela oficial de referência da CEF.',
      action: onOpenSinapi,
      color: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/60',
      bg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    {
      icon: <ClipboardPaste className="h-5 w-5" />,
      label: 'Colar do Excel',
      description: 'Copie colunas de uma planilha existente e importe composições em massa.',
      action: onOpenPaste,
      color: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary to-primary p-6 text-white">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📋</span>
            <DialogHeader className="p-0">
              <DialogTitle className="text-white text-lg font-bold">
                Como quer começar o orçamento?
              </DialogTitle>
            </DialogHeader>
          </div>
          <p className="text-primary/25 text-sm mt-1">
            Escolha uma das formas abaixo. Você pode combinar todas elas depois.
          </p>
        </div>

        {/* Opções */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleOption(opt.action)}
              className={cn(
                'flex flex-col gap-3 p-4 rounded-xl border text-left transition-all duration-150 group',
                opt.border,
                opt.bg
              )}
            >
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', opt.iconBg, opt.color)}>
                {opt.icon}
              </div>
              <div>
                <p className={cn('text-sm font-semibold leading-tight', opt.color)}>{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 -mt-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground h-8"
            onClick={dismiss}
          >
            Fechar — eu sei o que estou fazendo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
