import { DollarSign, AlertTriangle, MessageCircle, Wallet, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ProblemSection() {
  const problems = [
    { icon: DollarSign, text: 'Você não sabe exatamente quanto já gastou' },
    { icon: AlertTriangle, text: 'O orçamento inicial já perdeu sentido' },
    { icon: MessageCircle, text: 'Informações espalhadas entre planilhas e WhatsApp' },
    { icon: Wallet, text: 'Pagamentos sem organização' },
    { icon: Eye, text: 'Sensação de que o dinheiro está sumindo' },
  ];
  return (
    <section className="py-16 px-4 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Se você gerencia obra, provavelmente já passou por isso:
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {problems.map((item, i) => (
            <Card key={i} className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-5 flex items-start gap-3">
                <item.icon className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-muted-foreground mt-8 font-medium">
          Isso não é falta de conhecimento técnico. <span className="text-foreground font-semibold">É falta de sistema.</span>
        </p>
      </div>
    </section>
  );
}
