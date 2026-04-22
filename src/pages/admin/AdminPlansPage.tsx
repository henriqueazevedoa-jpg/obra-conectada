import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Edit2, Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface Plan {
  id: string; slug: string; nome_comercial: string; descricao: string;
  limite_obras: number; limite_gestores: number; limite_funcionarios: number; limite_clientes: number;
  ilimitado: boolean; ativo: boolean;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editPlanId, setEditPlanId] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from('plans').select('*').order('limite_obras', { ascending: true });
    if (data) setPlans(data as unknown as Plan[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const editPlan = plans.find(p => p.id === editPlanId);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Planos Editáveis</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => (
            <Card key={plan.id} className="group relative overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{plan.nome_comercial}</h3>
                  <Badge variant={plan.ativo ? 'default' : 'secondary'}>{plan.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{plan.descricao || '—'}</p>
                {plan.ilimitado ? (
                  <p className="text-sm font-medium text-primary">Acesso Ilimitado</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                    <div className="flex justify-between p-2 bg-muted/60 rounded border border-border/50"><span>Obras</span><span className="font-bold">{plan.limite_obras}</span></div>
                    <div className="flex justify-between p-2 bg-muted/60 rounded border border-border/50"><span>Gestores</span><span className="font-bold">{plan.limite_gestores}</span></div>
                    <div className="flex justify-between p-2 bg-muted/60 rounded border border-border/50"><span>Funcionários</span><span className="font-bold">{plan.limite_funcionarios}</span></div>
                    <div className="flex justify-between p-2 bg-muted/60 rounded border border-border/50"><span>Clientes</span><span className="font-bold">{plan.limite_clientes}</span></div>
                  </div>
                )}
                <div className="pt-2 border-t mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">{plan.slug}</p>
                  <Button variant="ghost" size="sm" onClick={() => setEditPlanId(plan.id)} className="h-8 group-hover:bg-primary/10">
                    <Edit2 className="h-4 w-4 mr-1.5" /> Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editPlan && (
        <EditPlanDialog 
          plan={editPlan} 
          onClose={() => setEditPlanId(null)} 
          onSuccess={() => { setEditPlanId(null); fetchPlans(); }} 
        />
      )}
    </div>
  );
}

function EditPlanDialog({ plan, onClose, onSuccess }: { plan: Plan; onClose: () => void; onSuccess: () => void; }) {
  const [formData, setFormData] = useState<Partial<Plan>>({
    nome_comercial: plan.nome_comercial,
    descricao: plan.descricao,
    slug: plan.slug,
    ativo: plan.ativo,
    ilimitado: plan.ilimitado,
    limite_obras: plan.limite_obras,
    limite_gestores: plan.limite_gestores,
    limite_funcionarios: plan.limite_funcionarios,
    limite_clientes: plan.limite_clientes,
  });
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('plans').update(formData as any).eq('id', plan.id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Plano atualizado.' });
      onSuccess();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5"/> Editar Plano</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome Comercial</Label>
              <Input value={formData.nome_comercial || ''} onChange={e => setFormData({ ...formData, nome_comercial: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (Referência interna)</Label>
              <Input value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={formData.descricao || ''} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
          </div>

          <div className="flex items-center gap-6 py-2">
            <div className="flex items-center gap-2">
              <Switch checked={formData.ativo || false} onCheckedChange={v => setFormData({ ...formData, ativo: v })} />
              <Label>Ativo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.ilimitado || false} onCheckedChange={v => setFormData({ ...formData, ilimitado: v })} />
              <Label>Acesso Ilimitado</Label>
            </div>
          </div>

          {!formData.ilimitado && (
            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <Label>Limite de Obras</Label>
                <Input type="number" value={formData.limite_obras || 0} onChange={e => setFormData({ ...formData, limite_obras: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Limite de Gestores</Label>
                <Input type="number" value={formData.limite_gestores || 0} onChange={e => setFormData({ ...formData, limite_gestores: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Limite de Funcionários</Label>
                <Input type="number" value={formData.limite_funcionarios || 0} onChange={e => setFormData({ ...formData, limite_funcionarios: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Limite de Clientes</Label>
                <Input type="number" value={formData.limite_clientes || 0} onChange={e => setFormData({ ...formData, limite_clientes: parseInt(e.target.value) })} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleUpdate} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
