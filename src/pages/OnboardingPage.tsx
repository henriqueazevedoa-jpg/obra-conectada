import { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { HardHat, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const { completeOnboarding } = useCompany();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome da empresa', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const result = await completeOnboarding({
        nome: nome.trim(),
        cnpj: cnpj.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
      });

      if (!result.success) {
        toast({
          title: 'Erro ao salvar dados',
          description: result.error || 'Falha inesperada.',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Dados salvos com sucesso!' });
      navigate('/obras', { replace: true });
    } catch (error: any) {
      console.error('Erro no onboarding:', error);
      toast({
        title: 'Erro ao salvar dados',
        description: error?.message || 'Falha inesperada.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <HardHat className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Obra Conectada</h1>
          </div>
          <p className="text-muted-foreground">
            Complete os dados da sua empresa para começar
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Dados da Empresa</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nome da Empresa *</label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Construtora Silva"
                />
              </div>

              <div>
                <label className="text-sm font-medium">CNPJ</label>
                <Input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">E-mail</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Salvar e continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
