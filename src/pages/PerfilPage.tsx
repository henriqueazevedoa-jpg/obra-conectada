import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Mail, Building2, LogOut, Crown, Sparkles, Check } from 'lucide-react';
import { useObras } from '@/contexts/ObrasContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const roleLabels: Record<string, string> = {
  admin: 'Admin da Plataforma',
  gestor: 'Gestor da Obra',
  funcionario: 'Funcionário / Equipe de Campo',
  cliente: 'Dono da Obra / Cliente',
};

// ── Opções de critério histórico ──────────────────────────────────────────────

const CRITERIOS = [
  {
    value: 'ultimo',
    label: 'Último preço usado',
    desc: 'Preenche com o preço mais recente registrado para a composição',
  },
  {
    value: 'menor',
    label: 'Menor preço registrado',
    desc: 'Preenche com o menor valor histórico — conservador em relação ao orçamento',
  },
  {
    value: 'media_simples',
    label: 'Média simples',
    desc: 'Média aritmética de todos os preços históricos',
  },
  {
    value: 'media_ponderada',
    label: 'Média ponderada por uso',
    desc: 'Composições mais usadas têm maior peso na média',
  },
];

export default function PerfilPage() {
  const { user, logout } = useAuth();
  const { company, plan, subscription } = useCompany();
  const navigate = useNavigate();
  const { obras } = useObras();

  // ── Configuração de critério histórico ──────────────────────────────────────
  const [criterio, setCriterio] = useState<string>('ultimo');
  const [savingCriterio, setSavingCriterio] = useState(false);

  useEffect(() => {
    if ((company as any)?.preco_criterio) {
      setCriterio((company as any).preco_criterio);
    }
  }, [company]);

  const handleSaveCriterio = async (valor: string) => {
    if (!company?.id) return;
    setCriterio(valor);
    setSavingCriterio(true);
    try {
      const { error } = await (supabase as any)
        .from('companies')
        .update({ preco_criterio: valor })
        .eq('id', company.id);
      if (error) throw error;
      toast({ title: '✅ Critério salvo', description: `Preço histórico agora usa: ${CRITERIOS.find(c => c.value === valor)?.label}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
    } finally {
      setSavingCriterio(false);
    }
  };

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

      {/* ── Dados do usuário ─────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
              <Badge variant="secondary">{roleLabels[user.role]}</Badge>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{user.email}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs mb-1">Obras vinculadas</p>
                {obras.map(o => (
                  <p key={o.id} className="text-foreground">{o.nome}</p>
                ))}
              </div>
            </div>
          </div>

          {company && (
            <div className="flex items-start gap-3 text-sm pt-2 border-t">
              <Crown className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{company.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Plano {plan?.nome_comercial || '—'}
                  {subscription && <> · {subscription.status === 'trial' ? 'Período de teste' : subscription.status === 'active' ? 'Ativo' : subscription.status}</>}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Configurações do Orçamento (Sprint 3) ────────────────────────── */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Configurações do Orçamento</h3>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Critério de preço histórico
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Define qual valor é usado quando a sugestão de preços encontra histórico da empresa
              </p>

              <RadioGroup
                value={criterio}
                onValueChange={handleSaveCriterio}
                disabled={savingCriterio}
                className="space-y-2"
              >
                {CRITERIOS.map(opt => (
                  <div
                    key={opt.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      criterio === opt.value
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-border hover:bg-muted/30'
                    )}
                    onClick={() => handleSaveCriterio(opt.value)}
                  >
                    <RadioGroupItem value={opt.value} id={`criterio-${opt.value}`} className="mt-0.5 accent-amber-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`criterio-${opt.value}`} className="text-sm font-medium cursor-pointer">
                          {opt.label}
                        </Label>
                        {criterio === opt.value && (
                          <Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={handleLogout} className="w-full">
        <LogOut className="h-4 w-4 mr-2" />
        Sair do Sistema
      </Button>
    </div>
  );
}
