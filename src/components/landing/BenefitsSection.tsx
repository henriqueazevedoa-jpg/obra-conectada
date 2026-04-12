import { DollarSign, ShieldCheck, Target, TrendingUp, HeartHandshake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const benefits = [
  { icon: DollarSign, title: 'Controle financeiro total', desc: 'Você sabe exatamente onde está o dinheiro' },
  { icon: ShieldCheck, title: 'Redução de prejuízos', desc: 'Evita prejuízos antes que aconteçam' },
  { icon: Target, title: 'Decisões com segurança', desc: 'Dados reais para decidir, não achismo' },
  { icon: TrendingUp, title: 'Profissionalismo', desc: 'Impressione clientes com organização e relatórios' },
  { icon: HeartHandshake, title: 'Menos estresse', desc: 'Pare de apagar incêndio e tenha tranquilidade' },
];

export default function BenefitsSection() {
  return (
    <section id="beneficios" className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">O que muda quando você tem controle</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
