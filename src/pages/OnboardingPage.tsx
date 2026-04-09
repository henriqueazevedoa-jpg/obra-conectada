import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { HardHat, Building2, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const { plans, createCompany, refreshCompany } = useCompany();
  const navigate = useNavigate();

  const [step, setStep] = useState<'company' | 'plan'>('company');
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      setSelectedPlan(plans[0].slug);
    }
  }, [plans, selectedPlan]);

  const handleGoToPlanStep = () => {
    if (!nome.trim()) {
      toast({
        title: 'Informe o nome da empresa',
        variant: 'destructive',
      });
      return;
    }

    setStep('plan');
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast({
        title: 'Informe o nome da empresa',
        variant: 'destructive',
      });
      return;
    }

    if (plans.length === 0) {
      toast({
        title: 'Nenhum plano carregado',
        description: 'Verifique a configuração da busca de planos no sistema.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: 'Selecione um plano',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const companyId = await createCompany({
        nome: nome.trim(),
        cnpj: cnpj.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        planSlug: selectedPlan,
      });

      if (!companyId) {
        throw new Error('Não foi possível criar a empresa. Verifique os planos carregados e a lógica do createCompany.');
      }

      await refreshCompany();

      toast({
        title: 'Empresa criada com sucesso!',
      });

      navigate('/painel', { replace: true });
    } catch (error: any) {
      console.error('Erro no onboarding:', error);

      toast({
        title: 'Erro ao criar empresa',
        description: error?.message || 'Falha inesperada no onboarding.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const planFeatures: Record<string, string[]> = {
    start: ['Até 2 obras ativas', '1 gestor', '2 funcionários', '2 clientes'],
    pro: ['Até 5 obras ativas', '2 gestores', '4 funcionários', '4 clientes'],
    enterprise: ['Obras ilimitadas', 'Gestores ilimitados', 'Funcionários ilimitados', 'Clientes ilimitados'],
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <HardHat className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">ObraFácil</h1>
          </div>
          <p className="text-muted-foreground">
            Configure sua empresa para começar a usar o sistema
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div
            className={cn(
              'flex items-center gap-2 text-sm font-medium',
              step === 'company' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                step === 'company'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              1
            </div>
            Empresa
          </div>

          <div className="w-12 h-px bg-border" />

          <div
            className={cn(
              'flex items-center gap-2 text-sm font-medium',
              step === 'plan' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                step === 'plan'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              2
            </div>
            Plano
          </div>
        </div>

        {step === 'company' && (
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

              <Button className="w-full" onClick={handleGoToPlanStep}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'plan' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Escolha seu plano</h2>

            {plans.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center space-y-2">
                  <p className="font-medium">Nenhum plano foi carregado.</p>
                  <p className="text-sm text-muted-foreground">
                    Verifique a leitura da tabela de planos no CompanyContext.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <Card
                    key={p.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      selectedPlan === p.slug ? 'ring-2 ring-primary' : ''
                    )}
                    onClick={() => setSelectedPlan(p.slug)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">{p.nome_comercial}</h3>
                        {selectedPlan === p.slug && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      {p.slug === 'pro' && (
                        <Badge className="bg-primary/10 text-primary text-xs">
                          Mais popular
                        </Badge>
                      )}

                      <p className="text-xs text-muted-foreground">{p.descricao}</p>

                      <ul className="space-y-1.5">
                        {(planFeatures[p.slug] || []).map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('company')}
                className="flex-1"
              >
                Voltar
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={submitting || plans.length === 0}
                className="flex-1"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Criar Empresa
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
