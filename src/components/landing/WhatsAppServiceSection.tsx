import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const WHATSAPP_NUMBER = '5511999999999';

export default function WhatsAppServiceSection() {
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
              Solicite um diagnóstico gratuito e descubra onde você pode estar perdendo dinheiro.
            </p>
            <Button
              size="lg"
              className="gap-2 text-base"
              onClick={() => window.open(
                `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Quero entender como funciona o serviço de gestão de obra.')}`,
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
