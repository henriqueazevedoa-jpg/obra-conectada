import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CHECKOUT_URLS: Record<string, string> = {
  start: 'https://nexano.com.br/checkout/obra-conectada-start',
  pro: 'https://nexano.com.br/checkout/obra-conectada-pro',
  enterprise: 'https://nexano.com.br/checkout/obra-conectada-enterprise',
};

const plans = [
  {
    slug: 'start', name: 'Start', price: 'R$ 97', period: '/mês',
    subtitle: 'Ideal para começar',
    features: ['Até 2 obras ativas', 'Controle essencial', 'Todos os módulos', 'Suporte por email'],
    cta: 'Começar com Start', highlight: false,
  },
  {
    slug: 'pro', name: 'Pro', price: 'R$ 197', period: '/mês',
    subtitle: 'Para profissionais',
    features: ['Até 10 obras ativas', 'Controle completo', 'Financeiro + execução', 'Suporte prioritário', 'Relatórios avançados'],
    cta: 'Escolher Pro', highlight: true,
  },
  {
    slug: 'enterprise', name: 'Enterprise', price: 'R$ 397', period: '/mês',
    subtitle: 'Para empresas',
    features: ['Obras ilimitadas', 'Equipe ilimitada', 'Todos os módulos', 'Suporte dedicado', 'Relatórios avançados', 'Gestão multi-empresa'],
    cta: 'Falar com especialista', highlight: false,
  },
];

export default function PlansSection() {
  return (
    <section id="planos" className="py-16 px-4 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Escolha o plano ideal para a sua obra</h2>
        <p className="text-center text-muted-foreground mb-10">Sem contrato • Cancele quando quiser</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.slug} className={cn('relative overflow-hidden', plan.highlight && 'ring-2 ring-primary shadow-lg md:scale-[1.02]')}>
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs font-semibold py-1.5">
                  Mais escolhido
                </div>
              )}
              <CardContent className={cn('p-6 space-y-5', plan.highlight && 'pt-9')}>
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" variant={plan.highlight ? 'default' : 'outline'} onClick={() => window.open(CHECKOUT_URLS[plan.slug], '_blank')}>
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-muted-foreground mt-8 text-sm">
          Uma única decisão errada em uma obra pode custar milhares de reais. <span className="font-semibold text-foreground">Ter controle custa menos que um erro.</span>
        </p>
      </div>
    </section>
  );
}
