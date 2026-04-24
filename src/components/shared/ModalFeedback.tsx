import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface Props {
  origem: 'lastra' | 'calculadora';
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TIPOS = [
  { id: 'sugestao', label: 'Sugestão',   emoji: '💡' },
  { id: 'problema', label: 'Problema',   emoji: '🐛' },
  { id: 'elogio',   label: 'Elogio',     emoji: '👍' },
  { id: 'outro',    label: 'Outro',      emoji: '💬' },
] as const;

type TipoFeedback = typeof TIPOS[number]['id'];

const PLACEHOLDERS: Record<TipoFeedback, string> = {
  sugestao: 'O que você gostaria de ver no sistema?',
  problema: 'O que aconteceu? Como reproduzir?',
  elogio:   'O que está funcionando bem para você?',
  outro:    'Sua mensagem...',
};

export default function ModalFeedback({ origem, open, onOpenChange }: Props) {
  const { user, isAuthenticated } = useAuth();
  const { company } = useCompany();

  const [tipo, setTipo] = useState<TipoFeedback>('sugestao');
  const [mensagem, setMensagem] = useState('');
  const [pagina, setPagina] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) setPagina(window.location.pathname);
  }, [open]);

  const handleEnviar = async () => {
    if (mensagem.trim().length < 10) {
      toast({ title: 'Mensagem muito curta', description: 'Mínimo de 10 caracteres.', variant: 'destructive' });
      return;
    }
    setEnviando(true);
    try {
      const payload = {
        tipo,
        origem,
        mensagem: mensagem.trim(),
        email_resposta: email.trim() || null,
        pagina_contexto: pagina.trim() || null,
        user_id: isAuthenticated ? (user as any)?.id ?? null : null,
        company_id: isAuthenticated ? company?.id ?? null : null,
      };

      let error: any = null;
      if (isAuthenticated) {
        ({ error } = await (supabase as any).from('feedbacks').insert(payload));
      } else {
        ({ error } = await (supabase as any).rpc('insert_feedback_anonimo', { payload }));
      }
      if (error) throw error;

      toast({ title: 'Obrigado — leio tudo pessoalmente.' });
      onOpenChange(false);
      setMensagem('');
      setEmail('');
      setTipo('sugestao');
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar feedback</DialogTitle>
          <DialogDescription>Sua opinião ajuda a melhorar o produto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map(t => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all text-left',
                  tipo === t.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                )}
              >
                <span className="text-base">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Mensagem */}
          <div className="space-y-1.5">
            <Label htmlFor="fb-msg">Mensagem <span className="text-destructive">*</span></Label>
            <Textarea
              id="fb-msg"
              rows={4}
              placeholder={PLACEHOLDERS[tipo]}
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              className="resize-none"
            />
            {mensagem.length > 0 && mensagem.length < 10 && (
              <p className="text-xs text-muted-foreground">{10 - mensagem.length} caracteres restantes</p>
            )}
          </div>

          {/* Página */}
          <div className="space-y-1.5">
            <Label htmlFor="fb-page">Página ou funcionalidade <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              id="fb-page"
              placeholder="Ex: Orçamento, Cronograma..."
              value={pagina}
              onChange={e => setPagina(e.target.value)}
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1.5">
            <Label htmlFor="fb-email">
              Seu e-mail, se quiser que eu responda pessoalmente{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="fb-email"
              type="email"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleEnviar} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
