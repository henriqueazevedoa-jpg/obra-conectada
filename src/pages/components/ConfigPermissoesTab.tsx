import React, { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/untyped';
import { ShieldCheck, Mail, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface UserData {
  user_id: string;
  role: UserRole;
  nome: string;
}

const MODULES_CATEGORIES = [
  {
    title: 'Financeiro',
    items: [
      { id: 'financeiro_pagamentos', label: 'Pagamentos' },
      { id: 'financeiro_custo_real', label: 'Custo Real' },
      { id: 'financeiro_fluxo_caixa', label: 'Fluxo de Caixa' },
      { id: 'financeiro_dre', label: 'DRE' },
      { id: 'financeiro_recebiveis', label: 'Recebíveis' },
    ]
  },
  {
    title: 'Contratos e Relatórios',
    items: [
      { id: 'contratos', label: 'Contratos' },
      { id: 'relatorios_exportar', label: 'Exportar Relatórios' },
      { id: 'relatorios_cliente', label: 'Relatório para Cliente' },
    ]
  },
  {
    title: 'Operação',
    items: [
      { id: 'diario_aprovar', label: 'Aprovar Diário de Campo' },
      { id: 'configuracoes_obra', label: 'Configurações da Obra' },
      { id: 'equipe_gestao', label: 'Gestão de Equipe' },
    ]
  }
];

export default function ConfigPermissoesTab() {
  const { company } = useCompany();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Defaults por role (mesma logica do AuthContext)
  const getDefaults = (role: UserRole): Record<string, boolean> => {
    const allModules = MODULES_CATEGORIES.flatMap(c => c.items.map(i => i.id));
    const map: Record<string, boolean> = {};
    if (role === 'admin' || role === 'gestor') {
      allModules.forEach(m => map[m] = true);
    } else if (role === 'engenheiro') {
      allModules.forEach(m => map[m] = true);
      map['financeiro_fluxo_caixa'] = false;
      map['financeiro_dre'] = false;
      map['financeiro_recebiveis'] = false;
    } else {
      allModules.forEach(m => map[m] = false);
      map['diario_aprovar'] = true;
    }
    return map;
  };

  const loadData = async () => {
    if (!company) return;
    setLoading(true);
    try {
      // 1. Roles
      const { data: rolesUser } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('company_id', company.id)
        .neq('role', 'gestor');

      if (!rolesUser || rolesUser.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // 2. Profiles
      const userIds = rolesUser.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, nome')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.nome]) || []);

      const usersCombined: UserData[] = rolesUser.map(r => ({
        user_id: r.user_id,
        role: r.role as UserRole,
        nome: profilesMap.get(r.user_id) || 'Usuário',
      }));
      setUsers(usersCombined);

      // 3. Permissoes (banco)
      const { data: permsData } = await supabase
        .from('user_module_permissions')
        .select('user_id, modulo, permitido')
        .eq('company_id', company.id);

      const permMap: Record<string, Record<string, boolean>> = {};
      usersCombined.forEach(u => {
        const userDbPerms = permsData?.filter(p => p.user_id === u.user_id) || [];
        const fallbacks = getDefaults(u.role);
        
        if (userDbPerms.length === 0) {
          permMap[u.user_id] = fallbacks;
        } else {
          const map = { ...fallbacks };
          userDbPerms.forEach(p => map[p.modulo] = p.permitido);
          permMap[u.user_id] = map;
        }
      });
      setPermissions(permMap);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [company]);

  const handleToggle = async (userId: string, modulo: string, newValue: boolean) => {
    if (!company) return;
    const actionKey = `${userId}-${modulo}`;
    setSavingKey(actionKey);

    // Otmistic UI
    setPermissions(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [modulo]: newValue }
    }));

    try {
      // Upsert
      const { error } = await supabase
        .from('user_module_permissions')
        .upsert({
          company_id: company.id,
          user_id: userId,
          modulo: modulo,
          permitido: newValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,user_id,modulo' });

      if (error) throw error;
      // success invisível ou toast muito discreto se quiser
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
      // revert optimistic
      setPermissions(prev => ({
        ...prev,
        [userId]: { ...prev[userId], [modulo]: !newValue }
      }));
    } finally {
      setSavingKey(null);
    }
  };

  const handleRedefinirPadroes = async (userId: string, role: UserRole) => {
    if (!company) return;
    setSavingKey(`${userId}-reset`);
    try {
      const { error } = await supabase
        .from('user_module_permissions')
        .delete()
        .eq('company_id', company.id)
        .eq('user_id', userId);

      if (error) throw error;
      
      setPermissions(prev => ({
        ...prev,
        [userId]: getDefaults(role)
      }));
      toast({ title: 'Permissões redefinidas', description: 'Padrões restaurados com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro ao redefinir', description: err.message, variant: 'destructive' });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
         <div className="flex flex-col gap-4">
           {[1, 2].map(i => (
             <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-2xl border border-border"></div>
           ))}
         </div>
      </section>
    );
  }

  if (users.length === 0) {
    return (
      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
         <div className="p-16 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center bg-muted/5">
           <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
           <h4 className="font-bold text-foreground mt-2">Nenhum membro encontrado</h4>
           <p className="text-xs text-muted-foreground max-w-xs mt-2">
             Adicione engenheiros ou operacionais à equipe para configurar permissões.
           </p>
         </div>
      </section>
    );
  }

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Permissões de Acesso
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Controle o que cada membro da equipe pode visualizar e operar.</p>
        </div>
      </div>

      <div className="space-y-6">
        {users.map(user => (
          <div key={user.user_id} className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-border/50">
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-base flex items-center gap-2">
                  {user.nome}
                  <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-bold text-muted-foreground bg-muted">
                    {user.role}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">ID: {user.user_id.split('-')[0]}</p>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 shrink-0 text-xs text-muted-foreground"
                onClick={() => handleRedefinirPadroes(user.user_id, user.role)}
                disabled={savingKey === `${user.user_id}-reset`}
              >
                <RefreshCw className={cn("h-3 w-3", savingKey === `${user.user_id}-reset` && "animate-spin")} />
                Redefinir padrões
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {MODULES_CATEGORIES.map(category => (
                <div key={category.title} className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">
                    {category.title}
                  </h4>
                  <div className="space-y-4">
                    {category.items.map(item => {
                      const isSaving = savingKey === `${user.user_id}-${item.id}`;
                      const isChecked = !!permissions[user.user_id]?.[item.id];
                      return (
                        <div key={item.id} className="flex items-center justify-between group">
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-3">
                            {isSaving && (
                              <span className="text-[10px] text-muted-foreground font-medium animate-pulse">Salvando...</span>
                            )}
                            <Switch 
                              checked={isChecked}
                              onCheckedChange={(val) => handleToggle(user.user_id, item.id, val)}
                              disabled={isSaving}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
