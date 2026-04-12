import { HelpCircle } from 'lucide-react';

export default function ObjectionSection() {
  return (
    <section className="py-16 px-4 bg-muted/50">
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <HelpCircle className="h-10 w-10 text-primary mx-auto" />
        <h2 className="text-xl md:text-2xl font-bold">
          E se eu não tiver tempo para usar o sistema?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Você pode usar sozinho ou contar com nosso <span className="font-semibold text-foreground">serviço assistido</span> onde organizamos tudo para você.
        </p>
      </div>
    </section>
  );
}
