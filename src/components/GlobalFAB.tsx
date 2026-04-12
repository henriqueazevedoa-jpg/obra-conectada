import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useObras } from '@/contexts/ObrasContext';
import {
  Plus, Wallet, ListChecks, BookOpen, Package, FolderOpen,
  Pencil, DollarSign, CalendarDays, Receipt,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const entryActions = [
  { label: 'Pagamento', icon: Wallet, route: '/pagamentos', query: '?novo=1', color: 'bg-primary' },
  { label: 'Pendência', icon: ListChecks, route: '/pendencias', query: '?novo=1', color: 'bg-rose-500' },
  { label: 'Diário', icon: BookOpen, route: '/diario', query: '?novo=1', color: 'bg-amber-500' },
  { label: 'Material', icon: Package, route: '/estoque', query: '?novo=1', color: 'bg-emerald-500' },
  { label: 'Documento', icon: FolderOpen, route: '/documentos', query: '?novo=1', color: 'bg-sky-500' },
];

const editActions = [
  { label: 'Orçamento', icon: DollarSign, route: '/orcamento', query: '', color: 'bg-blue-600' },
  { label: 'Cronograma', icon: CalendarDays, route: '/cronograma', query: '', color: 'bg-orange-500' },
  { label: 'Custo Real', icon: Receipt, route: '/custo-real', query: '', color: 'bg-violet-500' },
];

type OpenFab = null | 'entry' | 'edit';

export default function GlobalFAB() {
  const [openFab, setOpenFab] = useState<OpenFab>(null);
  const navigate = useNavigate();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();

  if (!selectedObraId || obras.length === 0) return null;

  const toggle = (fab: 'entry' | 'edit') => {
    setOpenFab(prev => (prev === fab ? null : fab));
  };

  const actions = openFab === 'entry' ? entryActions : openFab === 'edit' ? editActions : [];

  // Position the menu above the active FAB button
  // Entry FAB: bottom-20 (5rem) on mobile, bottom-6 (1.5rem) on desktop → menu starts above it
  // Edit FAB: bottom-36 (9rem) on mobile, bottom-[5.5rem] on desktop → menu starts above it
  const menuBottomMobile = openFab === 'entry' ? 'calc(5rem + 3.75rem)' : 'calc(9rem + 3.5rem)';
  const menuBottomDesktop = openFab === 'entry' ? 'calc(1.5rem + 4.25rem)' : 'calc(5.5rem + 3.75rem)';

  return (
    <>
      {/* Overlay */}
      {openFab && (
        <div className="fixed inset-0 bg-black/30 z-[60] md:z-[45]" onClick={() => setOpenFab(null)} />
      )}

      {/* Action items — positioned above the active FAB */}
      {openFab && (
        <div
          className="fixed right-4 md:right-8 z-[63] md:z-[48] flex flex-col-reverse gap-3 items-end"
          style={{
            bottom: menuBottomMobile,
          }}
        >
          <style>{`@media (min-width: 768px) { .fab-menu-pos { bottom: ${menuBottomDesktop} !important; } }`}</style>
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => {
                  setOpenFab(null);
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

      {/* Edit FAB */}
      <button
        onClick={() => toggle('edit')}
        className={cn(
          'fixed bottom-36 md:bottom-[5.5rem] right-4 md:right-6 z-[62] md:z-[47] h-12 w-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-200',
          openFab === 'edit'
            ? 'bg-muted text-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        )}
        title="Editar"
      >
        {openFab === 'edit' ? <X className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
      </button>

      {/* Entry FAB (main) */}
      <button
        onClick={() => toggle('entry')}
        className={cn(
          'fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[62] md:z-[47] h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200',
          openFab === 'entry'
            ? 'bg-muted text-foreground rotate-45'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
        title="Novo registro"
      >
        {openFab === 'entry' ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </>
  );
}
