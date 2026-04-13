import { Zap, Check, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dashboardMock from '@/assets/dashboard-mock.jpg';

interface HeroSectionProps {
  onScrollTo: (id: string) => void;
}

export default function HeroSection({ onScrollTo }: HeroSectionProps) {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-sm font-medium px-4 py-1.5">
            <Zap className="h-4 w-4" /> Gestão de obras simplificada
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Pare de perder dinheiro na sua obra por falta de controle
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Tenha clareza total dos custos, pagamentos e andamento da obra — sem planilhas bagunçadas e sem decisões no escuro.
          </p>
          <ul className="space-y-2.5 text-sm">
            {[
              'Saiba exatamente quanto já gastou e quanto ainda vai gastar',
              'Evite estouro de orçamento',
              'Organize pagamentos e fornecedores',
              'Tenha controle real da sua obra',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button size="lg" onClick={() => onScrollTo('planos')} className="gap-2 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              Quero organizar minha obra agora <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => onScrollTo('modulos')} className="gap-2 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              Ver como funciona <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-xl overflow-hidden shadow-2xl border border-border">
            <img src={dashboardMock} alt="Dashboard do Obra Conectada" width={1280} height={800} className="w-full h-auto" />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold shadow-lg hidden md:block">
            +500 obras controladas
          </div>
        </div>
      </div>
    </section>
  );
}
