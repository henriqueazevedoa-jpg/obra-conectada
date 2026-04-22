import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, HardHat, Shield, ArrowLeft, KeySquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AdminCompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState<any>(null);
  const [obras, setObras] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchCompanyData = async () => {
      const { data: comp } = await supabase.from('companies').select('*').eq('id', id).single();
      if (!comp) {
        toast({ title: 'Empresa não encontrada', variant: 'destructive' });
        navigate('/admin/companies');
        return;
      }
      setCompany(comp);

      const [
        { data: obrasList },
        { data: userRoles },
        { data: planData }
      ] = await Promise.all([
        supabase.from('obras').select('*').eq('company_id', id),
        supabase.from('user_roles').select('id, user_id, role, profile:profiles(nome, email, telefone)').eq('company_id', id),
        comp.plan_id ? supabase.from('plans').select('*').eq('id', comp.plan_id).single() : Promise.resolve({ data: null })
      ]);

      setObras(obrasList || []);
      setUsers(userRoles || []);
      setPlan(planData);
      setLoading(false);
    };

    fetchCompanyData();
  }, [id, navigate]);

  const handleImpersonate = () => {
    if (!company) return;
    localStorage.setItem('lastra_impersonated_company_id', company.id);
    
    // Hard refresh into the panel to completely initialize contexts
    window.location.href = '/painel';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/companies" className="text-muted-foreground hover:text-foreground mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground truncate">{company?.nome}</h1>
          <Badge variant={company?.status === 'ativo' ? 'default' : 'secondary'} className="ml-2">
            {company?.status}
          </Badge>
        </div>
        
        <Button onClick={handleImpersonate} className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg gap-2">
          <KeySquare className="h-4 w-4" />
          Impersonar e Acessar Painel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">Resumo da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Nome Fantasia</p>
              <p className="font-medium">{company.nome}</p>
            </div>
            {company.cnpj && (
              <div>
                <p className="text-xs text-muted-foreground">CNPJ</p>
                <p className="font-medium">{company.cnpj}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Responsável / E-mail</p>
              <p className="font-medium">{company.email || '—'}</p>
              <p className="text-sm">{company.telefone || '—'}</p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Plano Atual</p>
              <p className="font-semibold text-primary">{plan?.nome_comercial || 'Nenhum'}</p>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><HardHat className="h-4 w-4 text-muted-foreground" />Obras ({obras.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {obras.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma obra cadastrada</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {obras.map(obra => (
                    <div key={obra.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{obra.nome}</p>
                        {obra.endereco && <p className="text-sm text-muted-foreground">{obra.endereco}</p>}
                      </div>
                      <Badge variant="outline">{obra.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Usuários ({users.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {users.map(u => {
                    const prof = Array.isArray(u.profile) ? u.profile[0] : u.profile;
                    return (
                      <div key={u.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{prof?.nome || 'Usuário Sem Nome'}</p>
                          <p className="text-xs text-muted-foreground">{prof?.email || '—'}</p>
                        </div>
                        <Badge variant="secondary" className="capitalize text-[10px]">{u.role}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
