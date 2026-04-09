import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';

interface Plan {
  id: string; slug: string; nome_comercial: string; descricao: string;
  limite_obras: number; limite_gestores: number; limite_funcionarios: number; limite_clientes: number;
  ilimitado: boolean; ativo: boolean;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('plans').select('*').then(({ data }) => {
      if (data) setPlans(data as unknown as Plan[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Planos</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map(plan => (
          <Card key={plan.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{plan.nome_comercial}</h3>
                <Badge variant={plan.ativo ? 'default' : 'secondary'}>{plan.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{plan.descricao || '—'}</p>
              {plan.ilimitado ? (
                <p className="text-sm font-medium text-primary">Ilimitado</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded"><span>Obras</span><span className="font-bold">{plan.limite_obras}</span></div>
                  <div className="flex justify-between p-2 bg-muted rounded"><span>Gestores</span><span className="font-bold">{plan.limite_gestores}</span></div>
                  <div className="flex justify-between p-2 bg-muted rounded"><span>Funcionários</span><span className="font-bold">{plan.limite_funcionarios}</span></div>
                  <div className="flex justify-between p-2 bg-muted rounded"><span>Clientes</span><span className="font-bold">{plan.limite_clientes}</span></div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">Slug: {plan.slug}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
