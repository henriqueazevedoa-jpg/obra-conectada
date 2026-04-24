import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutGroup {
  title: string;
  items: { desc: string; keys: string[] }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navegação',
    items: [
      { desc: 'Próximo campo', keys: ['Tab'] },
      { desc: 'Campo anterior', keys: ['Shift', 'Tab'] },
      { desc: 'Abaixo (mesma coluna)', keys: ['Enter', 'ou', '↓'] },
      { desc: 'Acima (mesma coluna)', keys: ['Shift', 'Enter', 'ou', '↑'] },
      { desc: 'Editar célula focada', keys: ['F2'] },
      { desc: 'Cancelar edição', keys: ['Esc'] },
    ]
  },
  {
    title: 'Edição',
    items: [
      { desc: 'Nova composição (na última linha)', keys: ['Tab'] },
      { desc: 'Nova composição na etapa atual', keys: ['Ctrl', 'Enter'] },
      { desc: 'Remover linha selecionada', keys: ['Del'] },
    ]
  },
  {
    title: 'Etapas',
    items: [
      { desc: 'Expandir/colapsar etapa', keys: ['Espaço'] },
      { desc: 'Expandir todas as etapas', keys: ['Ctrl', 'Shift', 'E'] },
      { desc: 'Recolher todas as etapas', keys: ['Ctrl', 'Shift', 'R'] },
    ]
  },
  {
    title: 'Seleção',
    items: [
      { desc: 'Seleção múltipla (Bulk)', keys: ['Ctrl', 'Shift', '↓'] },
      { desc: 'Ver todos os atalhos', keys: ['Ctrl', '/'] },
    ]
  }
];

interface OrcamentoShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrcamentoShortcutsModal({ open, onOpenChange }: OrcamentoShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => onOpenChange(false)}>
      <div 
        className="w-full max-w-[520px] bg-background border border-border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h2 className="text-lg font-semibold text-foreground">Atalhos do Orçamento</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 grid gap-6 overflow-y-auto max-h-[70vh]">
          {SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {group.title}
              </h3>
              <div className="grid gap-2">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                    <span className="text-sm text-foreground/80">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <React.Fragment key={i}>
                          {k === 'ou' ? (
                            <span className="text-xs text-muted-foreground px-1">ou</span>
                          ) : (
                            <kbd className="min-w-[24px] inline-flex justify-center items-center px-1.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted border border-border/60 rounded-md shadow-sm">
                              {k}
                            </kbd>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
