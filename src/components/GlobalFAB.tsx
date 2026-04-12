import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useObras } from '@/contexts/ObrasContext';
import { Plus, DollarSign, Package, Wallet, BookOpen, FolderOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const fabActions = [
  { label: 'Pagamento', icon: Wallet, route: '/pagamentos', query: '?novo=1', color: 'bg-primary' },
  { label: 'Material', icon: Package, route: '/estoque', query: '?novo=1', color: 'bg-emerald-500' },
  { label: 'Diário', icon: BookOpen, route: '/diario', query: '?novo=1', color: 'bg-amber-500' },
  { label: 'Gasto', icon: DollarSign, route: '/custo-real', query: '?novo=1', color: 'bg-violet-500' },
  { label: 'Documento', icon: FolderOpen, route: '/documentos', query: '?novo=1', color: 'bg-sky-500' },
];

export default function GlobalFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();

  if (!selectedObraId || obras.length === 0) return null;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-[60] md:z-[45]" onClick={() => setOpen(false)} />
      )}

      {/* Action items */}
      {open && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[61] md:z-[46] flex flex-col-reverse gap-3 items-end">
          {fabActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => {
                  setOpen(false);
                  navigate(`${action.route}${action.query}`);
                }}
                className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
              >
                <span className="bg-card text-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg border border-border">
                  {action.label}
                </span>
                <span className={cn('h-10 w-10 rounded-full flex items-center justify-center text-white shadow-lg', action.color)}>
                  <Icon className="h-5 w-5" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[62] md:z-[47] h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200',
          open
            ? 'bg-muted text-foreground rotate-45'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </>
  );
}
