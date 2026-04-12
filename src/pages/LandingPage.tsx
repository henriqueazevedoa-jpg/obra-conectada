import { useNavigate } from 'react-router-dom';
import { HardHat, BarChart3, Calendar, Wallet, Package, BookOpen, Users, FileText, ShieldCheck, TrendingUp, Eye, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CHECKOUT_URLS: Record<string, string> = {
  start: 'https://nexano.com.br/checkout/obra-conectada-start',
  pro: 'https://nexano.com.br/checkout/obra-conectada-pro',
  enterprise: 'https://nexano.com.br/checkout/obra-conectada-enterprise',
};

export default function LandingPage() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <HardHat className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">Obra Conectada</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('modulos')} className="hover:text-foreground transition-colors">Módulos</button>
            <button onClick={() => scrollTo('planos')} className="hover:text-foreground transition-colors">Planos</button>
          </div>
          <Button size="sm" onClick={() => navigate('/login')}>Entrar</Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="text-sm px-4 py-1">Gestão de obras simplificada</Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Pare de perder dinheiro na sua obra por falta de controle
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Controle financeiro, cronograma, pagamentos e execução em um único sistema feito para quem constrói.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button size="lg" onClick={() => scrollTo('planos')} className="gap-2 text-base px-8">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo('modulos')} className="gap-2 text-base px-8">
              Ver como funciona <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Você reconhece algum desses problemas?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '📊', text: 'Planilhas desorganizadas que ninguém entende' },
              { icon: '💸', text: 'Perda de controle financeiro ao longo da obra' },
              { icon: '📅', text: 'Pagamentos esquecidos ou duplicados' },
              { icon: '👁️', text: 'Falta de visibilidade sobre o andamento real' },
            ].map((item, i) => (
              <Card key={i} className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-5 flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <p className="text-sm font-medium">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">A central de controle da sua obra</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            O Obra Conectada reúne tudo o que você precisa para gerenciar suas obras com clareza, organização e controle total — do orçamento à entrega.
          </p>
        </div>
      </section>

      {/* MÓDULOS */}
      <section id="modulos" className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Tudo que você precisa em um só lugar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: BarChart3, title: 'Orçamento', desc: 'Estruture custos por categorias, composições e subitens' },
              { icon: Calendar, title: 'Cronograma', desc: 'Planeje e acompanhe o andamento físico da obra' },
              { icon: Wallet, title: 'Pagamentos', desc: 'Controle pagamentos, parcelas e vencimentos' },
              { icon: Package, title: 'Estoque', desc: 'Gerencie materiais e movimentações' },
              { icon: BookOpen, title: 'Diário de Obra', desc: 'Registre atividades, ocorrências e clima diariamente' },
              { icon: Users, title: 'Fornecedores', desc: 'Cadastre fornecedores e compare preços' },
              { icon: FileText, title: 'Documentos', desc: 'Armazene e organize documentos da obra' },
            ].map((mod, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-2">
                  <mod.icon className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold">{mod.title}</h3>
                  <p className="text-sm text-muted-foreground">{mod.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Por que usar o Obra Conectada?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: 'Controle total', desc: 'Tenha todas as informações da obra na palma da mão' },
              { icon: TrendingUp, title: 'Reduza prejuízos', desc: 'Identifique desvios financeiros antes que virem problema' },
              { icon: Eye, title: 'Clareza e transparência', desc: 'Visibilidade real do andamento para toda a equipe' },
            ].map((b, i) => (
              <Card key={i}>
                <CardContent className="p-6 text-center space-y-3">
                  <b.icon className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold text-lg">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Escolha o plano ideal</h2>
          <p className="text-center text-muted-foreground mb-10">Comece com teste grátis. Cancele quando quiser.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([
              {
                slug: 'start',
                name: 'Start',
                price: 'R$ 49',
                period: '/mês',
                features: ['Até 2 obras ativas', '1 gestor', '2 funcionários', '2 clientes', 'Todos os módulos'],
                highlight: false,
              },
              {
                slug: 'pro',
                name: 'Pro',
                price: 'R$ 99',
                period: '/mês',
                features: ['Até 5 obras ativas', '2 gestores', '4 funcionários', '4 clientes', 'Todos os módulos', 'Suporte prioritário'],
                highlight: true,
              },
              {
                slug: 'enterprise',
                name: 'Enterprise',
                price: 'R$ 199',
                period: '/mês',
                features: ['Obras ilimitadas', 'Gestores ilimitados', 'Funcionários ilimitados', 'Clientes ilimitados', 'Todos os módulos', 'Suporte dedicado'],
                highlight: false,
              },
            ]).map((plan) => (
              <Card
                key={plan.slug}
                className={cn(
                  'relative overflow-hidden',
                  plan.highlight && 'ring-2 ring-primary shadow-lg'
                )}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs font-semibold py-1">
                    Mais popular
                  </div>
                )}
                <CardContent className={cn('p-6 space-y-4', plan.highlight && 'pt-8')}>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? 'default' : 'outline'}
                    onClick={() => window.open(CHECKOUT_URLS[plan.slug], '_blank')}
                  >
                    Começar agora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Obra Conectada</span>
          </div>
          <p>© {new Date().getFullYear()} Obra Conectada. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
