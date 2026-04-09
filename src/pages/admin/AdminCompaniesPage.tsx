import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Users, HardHat, Shield, Settings, Puzzle, Mic } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdminCompany {
  id: string; nome: string; cnpj: string; email: string; status: string;
  plan_id: string | null; plan_nome?: string;
  obra_count: number; gestor_count: number; funcionario_count: number; cliente_count: number;
  addons: CompanyAddon[]; override?: PermOverride | null;
}
interface AdminPlan { id: string; slug: string; nome_comercial: string; }
interface PermOverride {
  id: string; company_id: string;
  max_obras: number | null; max_gestores: number | null;
  max_funcionarios: number | null; max_clientes: number | null; ilimitado: boolean;
}
interface AddonCatalogItem { code: string; nome: string; descricao: string; ativo: boolean; }
interface CompanyAddon {
  id: string; company_id: string; addon_code: string; status: string;
  trial_start: string | null; trial_end: string | null;
}

const statusLabels: Record<string, string> = { ativo: 'Ativo', inativo: 'Inativo', suspenso: 'Suspenso', teste: 'Teste' };
const statusColors: Record<string, string> = {
  ativo: 'bg-green-100 text-green-800', inativo: 'bg-gray-100 text-gray-800',
  suspenso: 'bg-red-100 text-red-800', teste: 'bg-blue-100 text-blue-800',
};
const addonStatusLabels: Record<string, string> = { inactive: 'Inativo', trial: 'Trial', active: 'Ativo', expired: 'Expirado' };

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [addonCatalog, setAddonCatalog] = useState<AddonCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [{ data: companiesData }, { data: plansData }, { data: addonsData }, { data: overridesData }, { data: catalogData }] = await Promise.all([
      supabase.from('companies').select('*'),
      supabase.from('plans').select('id, slug, nome_comercial'),
      supabase.from('company_addons').select('*'),
      supabase.from('company_permission_overrides').select('*'),
      supabase.from('addon_catalog').select('*'),
    ]);
    if (plansData) setPlans(plansData as unknown as AdminPlan[]);
    if (catalogData) setAddonCatalog(catalogData as unknown as AddonCatalogItem[]);
    if (companiesData) {
      const enriched: AdminCompany[] = [];
      for (const c of companiesData as any[]) {
        const [{ count: obraCount }, { count: gestorCount }, { count: funcCount }, { count: clienteCount }] = await Promise.all([
          supabase.from('obras').select('*', { count: 'exact', head: true }).eq('company_id', c.id),
          supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('company_id', c.id).eq('role', 'gestor'),
          supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('company_id', c.id).eq('role', 'funcionario'),
          supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('company_id', c.id).eq('role', 'cliente'),
        ]);
        const matchPlan = plansData?.find((p: any) => p.id === c.plan_id) as any;
        const companyAddons = (addonsData as any[] || []).filter((a: any) => a.company_id === c.id);
        const override = (overridesData as any[] || []).find((o: any) => o.company_id === c.id) || null;
        enriched.push({
          ...c, plan_nome: matchPlan?.nome_comercial || '—',
          obra_count: obraCount || 0, gestor_count: gestorCount || 0,
          funcionario_count: funcCount || 0, cliente_count: clienteCount || 0,
          addons: companyAddons, override,
        });
      }
      setCompanies(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateCompanyPlan = async (companyId: string, planId: string) => {
    await supabase.from('companies').update({ plan_id: planId } as any).eq('id', companyId);
    toast({ title: 'Plano atualizado' }); fetchData();
  };
  const updateCompanyStatus = async (companyId: string, status: string) => {
    await supabase.from('companies').update({ status } as any).eq('id', companyId);
    toast({ title: 'Status atualizado' }); fetchData();
  };

  const editingCompany = companies.find(c => c.id === editCompanyId);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Building2 className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{companies.length}</p>
          <p className="text-xs text-muted-foreground">Empresas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <HardHat className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{companies.reduce((s, c) => s + c.obra_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Obras Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{companies.reduce((s, c) => s + c.gestor_count + c.funcionario_count + c.cliente_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Usuários Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Puzzle className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{addonCatalog.length}</p>
          <p className="text-xs text-muted-foreground">Add-ons</p>
        </CardContent></Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Empresas Cadastradas</h2>
        {companies.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{c.nome}</h3>
                    <Badge className={statusColors[c.status] || ''}>{statusLabels[c.status] || c.status}</Badge>
                    {c.override?.ilimitado && <Badge variant="outline" className="text-xs">Override Ilimitado</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.email} {c.cnpj ? `· ${c.cnpj}` : ''}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{c.obra_count} obras</span>
                    <span>{c.gestor_count} gestores</span>
                    <span>{c.funcionario_count} funcionários</span>
                    <span>{c.cliente_count} clientes</span>
                  </div>
                  {c.addons.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {c.addons.map(a => (
                        <Badge key={a.id} variant="secondary" className="text-[10px]">
                          <Mic className="h-3 w-3 mr-1" />
                          {a.addon_code} ({addonStatusLabels[a.status] || a.status})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={c.plan_id || ''} onValueChange={v => updateCompanyPlan(c.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Plano" /></SelectTrigger>
                    <SelectContent>
                      {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_comercial}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={c.status} onValueChange={v => updateCompanyStatus(c.id, v)}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setEditCompanyId(c.id)}>
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {companies.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma empresa cadastrada.</p>}
      </div>

      {editingCompany && (
        <CompanyEditDialog
          company={editingCompany}
          plans={plans}
          addonCatalog={addonCatalog}
          onClose={() => { setEditCompanyId(null); fetchData(); }}
        />
      )}
    </div>
  );
}

function CompanyEditDialog({ company, plans, addonCatalog, onClose }: {
  company: AdminCompany; plans: AdminPlan[]; addonCatalog: AddonCatalogItem[]; onClose: () => void;
}) {
  const [override, setOverride] = useState<PermOverride>(
    company.override || { id: '', company_id: company.id, max_obras: null, max_gestores: null, max_funcionarios: null, max_clientes: null, ilimitado: false }
  );
  const [addons, setAddons] = useState<CompanyAddon[]>(company.addons);
  const [saving, setSaving] = useState(false);

  const saveOverride = async () => {
    setSaving(true);
    const hasValues = override.max_obras !== null || override.max_gestores !== null ||
      override.max_funcionarios !== null || override.max_clientes !== null || override.ilimitado;
    if (company.override?.id && !hasValues) {
      await supabase.from('company_permission_overrides').delete().eq('id', company.override.id);
    } else if (company.override?.id) {
      await supabase.from('company_permission_overrides').update({
        max_obras: override.max_obras, max_gestores: override.max_gestores,
        max_funcionarios: override.max_funcionarios, max_clientes: override.max_clientes, ilimitado: override.ilimitado,
      } as any).eq('id', company.override.id);
    } else if (hasValues) {
      await supabase.from('company_permission_overrides').insert({
        company_id: company.id, max_obras: override.max_obras, max_gestores: override.max_gestores,
        max_funcionarios: override.max_funcionarios, max_clientes: override.max_clientes, ilimitado: override.ilimitado,
      } as any);
    }
    toast({ title: 'Limites salvos' }); setSaving(false);
  };

  const toggleAddon = async (addonCode: string, currentStatus: string | undefined) => {
    const existing = addons.find(a => a.addon_code === addonCode);
    if (existing) {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await supabase.from('company_addons').update({ status: newStatus } as any).eq('id', existing.id);
      setAddons(addons.map(a => a.id === existing.id ? { ...a, status: newStatus } : a));
    } else {
      const { data } = await supabase.from('company_addons').insert({
        company_id: company.id, addon_code: addonCode, status: 'active',
      } as any).select().single();
      if (data) setAddons([...addons, data as unknown as CompanyAddon]);
    }
    toast({ title: 'Add-on atualizado' });
  };

  const startTrial = async (addonCode: string) => {
    const existing = addons.find(a => a.addon_code === addonCode);
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const trialStart = new Date().toISOString().split('T')[0];
    if (existing) {
      await supabase.from('company_addons').update({ status: 'trial', trial_start: trialStart, trial_end: trialEnd } as any).eq('id', existing.id);
      setAddons(addons.map(a => a.id === existing.id ? { ...a, status: 'trial', trial_start: trialStart, trial_end: trialEnd } : a));
    } else {
      const { data } = await supabase.from('company_addons').insert({
        company_id: company.id, addon_code: addonCode, status: 'trial', trial_start: trialStart, trial_end: trialEnd,
      } as any).select().single();
      if (data) setAddons([...addons, data as unknown as CompanyAddon]);
    }
    toast({ title: 'Trial de 14 dias iniciado' });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />{company.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">Uso Atual</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded"><span>Obras</span><span className="font-bold">{company.obra_count}</span></div>
              <div className="flex justify-between p-2 bg-muted rounded"><span>Gestores</span><span className="font-bold">{company.gestor_count}</span></div>
              <div className="flex justify-between p-2 bg-muted rounded"><span>Funcionários</span><span className="font-bold">{company.funcionario_count}</span></div>
              <div className="flex justify-between p-2 bg-muted rounded"><span>Clientes</span><span className="font-bold">{company.cliente_count}</span></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Limites Customizados (Override)</h3>
            <p className="text-xs text-muted-foreground mb-3">Deixe vazio para usar os limites do plano</p>
            <div className="flex items-center gap-2 mb-3">
              <Switch checked={override.ilimitado} onCheckedChange={v => setOverride({ ...override, ilimitado: v })} />
              <Label className="text-sm">Ilimitado</Label>
            </div>
            {!override.ilimitado && (
              <div className="grid grid-cols-2 gap-3">
                {(['max_obras', 'max_gestores', 'max_funcionarios', 'max_clientes'] as const).map(field => (
                  <div key={field}>
                    <Label className="text-xs">Máx. {field.replace('max_', '').charAt(0).toUpperCase() + field.replace('max_', '').slice(1)}</Label>
                    <Input type="number" className="h-8" placeholder="Plano" value={override[field] ?? ''} onChange={e => setOverride({ ...override, [field]: e.target.value ? parseInt(e.target.value) : null })} />
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" className="mt-3" onClick={saveOverride} disabled={saving}>Salvar Limites</Button>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Add-ons</h3>
            <div className="space-y-2">
              {addonCatalog.map(addon => {
                const compAddon = addons.find(a => a.addon_code === addon.code);
                const isActive = compAddon?.status === 'active' || compAddon?.status === 'trial';
                return (
                  <div key={addon.code} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{addon.nome}</span>
                        {compAddon && <Badge variant="secondary" className="text-[10px]">{addonStatusLabels[compAddon.status] || compAddon.status}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{addon.descricao}</p>
                      {compAddon?.trial_end && <p className="text-[10px] text-muted-foreground">Trial até: {compAddon.trial_end}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => startTrial(addon.code)}>Trial 14d</Button>
                      <Switch checked={isActive} onCheckedChange={() => toggleAddon(addon.code, compAddon?.status)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
