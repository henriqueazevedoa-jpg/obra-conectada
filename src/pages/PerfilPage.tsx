import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Building2, LogOut, Crown } from 'lucide-react';
import { useObras } from '@/contexts/ObrasContext';
import { useNavigate } from 'react-router-dom';

const roleLabels: Record<string, string> = { admin: 'Admin da Plataforma', gestor: 'Gestor da Obra', funcionario: 'Funcionário / Equipe de Campo', cliente: 'Dono da Obra / Cliente' };

export default function PerfilPage() {
  const { user, logout } = useAuth();
  const { company, plan, subscription } = useCompany();
  const navigate = useNavigate();
  if (!user) return null;
  const { obras } = useObras();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

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

      <Button variant="outline" onClick={handleLogout} className="w-full">
        <LogOut className="h-4 w-4 mr-2" />
        Sair do Sistema
      </Button>
    </div>
  );
}
