import { HardHat } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavBarProps {
  onScrollTo: (id: string) => void;
  onLogin: () => void;
}

export default function NavBar({ onScrollTo, onLogin }: NavBarProps) {
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
        <Button size="sm" onClick={onLogin}>Entrar</Button>
      </div>
    </nav>
  );
}
