import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinalCTAProps {
  onScrollTo: (id: string) => void;
}

export default function FinalCTA({ onScrollTo }: FinalCTAProps) {
  return (
    <section className="py-20 px-4 bg-primary">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground">
          Quanto mais você demora para organizar sua obra, mais dinheiro você perde.
        </h2>
        <Button size="lg" variant="secondary" className="gap-2 text-base px-10" onClick={() => onScrollTo('planos')}>
          Quero organizar minha obra agora <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-primary-foreground/60 text-sm">Sem contrato • Cancele quando quiser</p>
      </div>
    </section>
  );
}
