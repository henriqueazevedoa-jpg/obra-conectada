import { useState } from 'react';
import { Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const WHATSAPP_NUMBER = '5511999999999';

export default function LeadCaptureSection() {
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
    const msg = encodeURIComponent(
      `Olá! Sou ${name.trim()} e acabei de solicitar o modelo de organização de obra.`
    );
    setTimeout(() => {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
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
            Receba um modelo pronto de organização de obra
          </h2>
          <p className="text-muted-foreground">
            Baixe gratuitamente um modelo simples + checklist de controle financeiro para organizar sua obra e evitar prejuízo.
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardContent className="p-4 sm:p-6">
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
