import { HardHat } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-border">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Obra Conectada</span>
        </div>
        <p>© {new Date().getFullYear()} Obra Conectada. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
