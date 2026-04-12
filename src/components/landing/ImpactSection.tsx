import { AlertTriangle } from 'lucide-react';

export default function ImpactSection() {
  return (
    <section className="py-16 px-4 bg-destructive/5 border-y border-destructive/10">
      <div className="max-w-3xl mx-auto text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-2xl md:text-3xl font-bold">
          Uma obra desorganizada não perde só tempo.
        </h2>
        <p className="text-xl md:text-2xl font-semibold text-destructive">
          Ela perde dinheiro todos os dias.
        </p>
        <p className="text-muted-foreground">
          E o pior: na maioria das vezes você nem percebe onde está perdendo.
        </p>
      </div>
    </section>
  );
}
