import { XCircle } from 'lucide-react';

export default function BeliefBreakSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold">
          Você não precisa trabalhar mais.
        </h2>
        <p className="text-xl md:text-2xl font-semibold text-primary">
          Você precisa ter controle.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[
            'Decisões são tomadas no escuro',
            'Erros viram prejuízo',
            'O controle da obra não existe',
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
