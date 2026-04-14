import { useState } from 'react';
import { HardHat, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavBarProps {
  onScrollTo: (id: string) => void;
  onLogin: () => void;
}

export default function NavBar({ onScrollTo, onLogin }: NavBarProps) {
  const [open, setOpen] = useState(false);

  const handleNav = (id: string) => {
    setOpen(false);
    onScrollTo(id);
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <HardHat className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold">Obra Conectada</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <button onClick={() => onScrollTo('modulos')} className="hover:text-foreground transition-colors">Módulos</button>
          <button onClick={() => onScrollTo('planos')} className="hover:text-foreground transition-colors">Planos</button>
          <button onClick={() => onScrollTo('beneficios')} className="hover:text-foreground transition-colors">Benefícios</button>
          <button onClick={() => onScrollTo('lead')} className="hover:text-foreground transition-colors">Material gratuito</button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onLogin}>Entrar</Button>
          <button className="md:hidden p-1.5" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-3 text-sm">
          <button onClick={() => handleNav('modulos')} className="block w-full text-left py-1.5 text-muted-foreground hover:text-foreground">Módulos</button>
          <button onClick={() => handleNav('planos')} className="block w-full text-left py-1.5 text-muted-foreground hover:text-foreground">Planos</button>
          <button onClick={() => handleNav('beneficios')} className="block w-full text-left py-1.5 text-muted-foreground hover:text-foreground">Benefícios</button>
          <button onClick={() => handleNav('lead')} className="block w-full text-left py-1.5 text-muted-foreground hover:text-foreground">Material gratuito</button>
        </div>
      )}
    </nav>
  );
}
