import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardHat, BarChart3, Calendar, Wallet, Package, BookOpen, Users,
  FileText, ShieldCheck, TrendingUp, ArrowRight, Check,
  ChevronDown, DollarSign, AlertTriangle, Target,
  MessageCircle, Zap, Brain, HeartHandshake, Download, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import dashboardMock from '@/assets/dashboard-mock.jpg';
import paymentsMock from '@/assets/payments-mock.jpg';
import cronogramaMock from '@/assets/cronograma-mock.jpg';

const CHECKOUT_URLS: Record<string, string> = {
  start: 'https://nexano.com.br/checkout/obra-conectada-start',
  pro: 'https://nexano.com.br/checkout/obra-conectada-pro',
  enterprise: 'https://nexano.com.br/checkout/obra-conectada-enterprise',
};

const WHATSAPP_NUMBER = '5511999999999';

function buildWhatsAppUrl(name: string) {
  const msg = encodeURIComponent(
    `Olá! Sou ${name} e gostaria de receber o modelo gratuito de organização de obra.`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
}

/* ─── Sub-components ─── */

function NavBar({ onScrollTo, onLogin }: { onScrollTo: (id: string) => void; onLogin: () => void }) {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <HardHat className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold">Obra Conectada</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <button onClick={() => onScrollTo('modulos')} className="hover:text-foreground transition-colors">Módulos</button>
          <button onClick={() => onScrollTo('planos')} className="hover:text-foreground transition-colors">Planos</button>
          <button onClick={() => onScrollTo('beneficios')} className="hover:text-foreground transition-colors">Benefícios</button>
        </div>
        <Button size="sm" onClick={onLogin}>Entrar</Button>
      </div>
    </nav>
  );
}

function HeroSection({ onScrollTo }: { onScrollTo: (id: string) => void }) {
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
            Tenha clareza total de custos, pagamentos e andamento da obra — sem planilhas bagunçadas e sem decisões no escuro.
          </p>
          <ul className="space-y-2.5 text-sm">
            {[
              'Saiba exatamente quanto já gastou',
              'Evite estouro de orçamento',
              'Organize pagamentos e fornecedores',
              'Tenha controle real da obra',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button size="lg" onClick={() => onScrollTo('planos')} className="gap-2 text-base px-8">
              Quero organizar minha obra agora <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => onScrollTo('modulos')} className="gap-2 text-base px-8">
              Ver como funciona <ChevronDown className="h-4 w-4" />
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

function ImpactSection() {
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
      </div>
    </section>
  );
}

function ProblemSection() {
  const problems = [
    { icon: DollarSign, text: 'Você não sabe exatamente quanto já gastou' },
    { icon: AlertTriangle, text: 'O orçamento inicial já perdeu sentido' },
    { icon: MessageCircle, text: 'Informações espalhadas em planilhas e WhatsApp' },
    { icon: Wallet, text: 'Pagamentos sem organização' },
  ];
  return (
    <section className="py-16 px-4 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Se você não controla sua obra, ela controla você
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A maioria das obras perde dinheiro por falta de controle, não por falta de conhecimento técnico.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {problems.map((item, i) => (
            <Card key={i} className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-5 flex items-start gap-3">
                <item.icon className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeadCaptureSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsapp.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    setLoading(true);
    // Mock save — replace with real API later
    console.log('Lead captured:', { name, email, whatsapp });
    toast.success('Modelo enviado! Redirecionando para WhatsApp…');
    setTimeout(() => {
      window.open(buildWhatsAppUrl(name), '_blank');
      setLoading(false);
    }, 1200);
  };

  return (
    <section id="lead" className="py-16 px-4">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
            <Download className="h-3.5 w-3.5" /> Material gratuito
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">
            Baixe um modelo pronto de organização de obra
          </h2>
          <p className="text-muted-foreground">
            Receba um modelo simples + checklist para organizar sua obra e evitar prejuízo. Grátis e sem compromisso.
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Nome</Label>
                <Input id="lead-name" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-whatsapp">WhatsApp</Label>
                <Input id="lead-whatsapp" type="tel" placeholder="(11) 99999-9999" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} maxLength={20} />
              </div>
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                <Send className="h-4 w-4" /> Receber modelo gratuito
              </Button>
              <p className="text-xs text-center text-muted-foreground">Seus dados estão seguros. Não enviamos spam.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section className="py-16 px-4 bg-primary/5">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <Brain className="h-10 w-10 text-primary mx-auto" />
        <h2 className="text-2xl md:text-3xl font-bold">
          O Obra Conectada organiza toda a sua obra em um só lugar
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base">
          Tudo o que você precisa para controlar a obra, sem complicação. Simples de usar, completo quando você precisa.
        </p>
      </div>
    </section>
  );
}

function ModulesSection() {
  const modules = [
    { icon: BarChart3, title: 'Orçamento detalhado', desc: 'Estruture custos por categorias e composições' },
    { icon: Calendar, title: 'Cronograma físico', desc: 'Planeje e acompanhe o andamento' },
    { icon: TrendingUp, title: 'Controle de custos', desc: 'Compare previsto vs realizado' },
    { icon: Wallet, title: 'Gestão de pagamentos', desc: 'Parcelas, vencimentos e status' },
    { icon: Package, title: 'Estoque e materiais', desc: 'Movimentações e controle' },
    { icon: BookOpen, title: 'Diário de obra', desc: 'Atividades, clima e ocorrências' },
    { icon: Users, title: 'Fornecedores', desc: 'Cadastro e comparação de preços' },
    { icon: FileText, title: 'Documentos', desc: 'Organize e acesse documentos' },
  ];
  return (
    <section id="modulos" className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Tudo que você precisa em um só lugar</h2>
        <p className="text-center text-muted-foreground mb-10">Módulos integrados que cobrem cada aspecto da sua obra</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((mod, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <mod.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{mod.title}</h3>
                <p className="text-xs text-muted-foreground">{mod.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  const demos = [
    { img: dashboardMock, label: 'Dashboard com visão geral' },
    { img: paymentsMock, label: 'Lista de pagamentos organizada' },
    { img: cronogramaMock, label: 'Cronograma físico da obra' },
  ];
  return (
    <section className="py-16 px-4 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Você entende sua obra em minutos</h2>
        <p className="text-center text-muted-foreground mb-10">Veja como o sistema organiza cada aspecto da sua obra</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {demos.map((item, i) => (
            <div key={i} className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-border shadow-sm">
                <img src={item.img} alt={item.label} loading="lazy" width={1280} height={800} className="w-full h-auto" />
              </div>
              <p className="text-sm font-medium text-center">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    { icon: DollarSign, title: 'Controle financeiro total', desc: 'Visibilidade de gastos, receitas e compromissos' },
    { icon: ShieldCheck, title: 'Redução de prejuízos', desc: 'Identifique desvios antes que virem problema sério' },
    { icon: Target, title: 'Decisões com segurança', desc: 'Dados reais para decidir, não achismo' },
    { icon: TrendingUp, title: 'Profissionalismo', desc: 'Impressione clientes com organização e relatórios' },
    { icon: HeartHandshake, title: 'Menos estresse', desc: 'Pare de apagar incêndio e tenha tranquilidade' },
  ];
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

function PlansSection() {
  const plans = [
    {
      slug: 'start', name: 'Start', price: 'R$ 97', period: '/mês',
      subtitle: 'Ideal para começar',
      features: ['Até 2 obras ativas', 'Equipe pequena', 'Todos os módulos', 'Suporte por email'],
      cta: 'Começar com Start', highlight: false,
    },
    {
      slug: 'pro', name: 'Pro', price: 'R$ 197', period: '/mês',
      subtitle: 'Para profissionais',
      features: ['Até 10 obras ativas', 'Equipe completa', 'Todos os módulos', 'Suporte prioritário', 'Relatórios avançados'],
      cta: 'Escolher Pro', highlight: true,
    },
    {
      slug: 'enterprise', name: 'Enterprise', price: 'R$ 397', period: '/mês',
      subtitle: 'Para empresas',
      features: ['Obras ilimitadas', 'Equipe ilimitada', 'Todos os módulos', 'Suporte dedicado', 'Relatórios avançados', 'Gestão multi-empresa'],
      cta: 'Falar com especialista', highlight: false,
    },
  ];

  return (
    <section id="planos" className="py-16 px-4 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Escolha o plano ideal para a sua obra</h2>
        <p className="text-center text-muted-foreground mb-10">Sem contrato • Cancele quando quiser</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.slug} className={cn('relative overflow-hidden', plan.highlight && 'ring-2 ring-primary shadow-lg scale-[1.02]')}>
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
      </div>
    </section>
  );
}

function WhatsAppServiceSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-8 md:p-10 space-y-4 text-center">
            <MessageCircle className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-xl md:text-2xl font-bold">
              Quer que alguém organize sua obra pra você?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Solicite um diagnóstico gratuito e veja como aplicar o sistema na sua realidade. Sem compromisso.
            </p>
            <Button
              size="lg"
              className="gap-2 text-base"
              onClick={() => window.open(
                `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de um diagnóstico gratuito para organizar minha obra.')}`,
                '_blank'
              )}
            >
              <MessageCircle className="h-4 w-4" /> Quero ajuda para organizar minha obra
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FinalCTA({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  return (
    <section className="py-20 px-4 bg-primary">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground">
          Comece a ter controle real da sua obra hoje
        </h2>
        <p className="text-primary-foreground/80">
          Junte-se a centenas de profissionais que já organizam suas obras com o Obra Conectada.
        </p>
        <Button size="lg" variant="secondary" className="gap-2 text-base px-10" onClick={() => onScrollTo('planos')}>
          Quero organizar minha obra agora <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-primary-foreground/60 text-sm">Sem contrato • Cancele quando quiser</p>
      </div>
    </section>
  );
}

function Footer() {
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

/* ─── Main Page ─── */

export default function LandingPage() {
  const navigate = useNavigate();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar onScrollTo={scrollTo} onLogin={() => navigate('/login')} />
      <HeroSection onScrollTo={scrollTo} />
      <ImpactSection />
      <ProblemSection />
      <LeadCaptureSection />
      <SolutionSection />
      <ModulesSection />
      <DemoSection />
      <BenefitsSection />
      <PlansSection />
      <WhatsAppServiceSection />
      <FinalCTA onScrollTo={scrollTo} />
      <Footer />
    </div>
  );
}
