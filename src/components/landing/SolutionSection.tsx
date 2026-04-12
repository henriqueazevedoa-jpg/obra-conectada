import { Brain } from 'lucide-react';

export default function SolutionSection() {
  return (
    <section className="py-16 px-4 bg-primary/5">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <Brain className="h-10 w-10 text-primary mx-auto" />
        <h2 className="text-2xl md:text-3xl font-bold">
          O Obra Conectada organiza toda a sua obra em um só lugar
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base">
          Sem planilhas. Sem bagunça. Sem complicação.
        </p>
      </div>
    </section>
  );
}
