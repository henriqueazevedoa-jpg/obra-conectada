import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface Plan {
  id: string;
  slug: string;
  nome_comercial: string;
  descricao: string;
  limite_obras: number;
  limite_gestores: number;
  limite_funcionarios: number;
  limite_clientes: number;
  ilimitado: boolean;
  ativo: boolean;
  features: Record<string, any>;
}

export interface Company {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  plan_id: string | null;
  status: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  ciclo: string;
  data_inicio: string;
  data_vencimento: string | null;
  valor_base: number;
  moeda: string;
  trial_start: string | null;
  trial_end: string | null;
}

interface PlanLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: string;
  reason?: string;
}

interface CompanyContextType {
  company: Company | null;
  plan: Plan | null;
  subscription: Subscription | null;
  plans: Plan[];
  loading: boolean;
  needsOnboarding: boolean;
  checkLimit: (resource: 'obras' | 'gestores' | 'funcionarios' | 'clientes') => Promise<PlanLimitResult>;
  refreshCompany: () => Promise<void>;
  createCompany: (data: {
    nome: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
    planSlug: string;
  }) => Promise<string | null>;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchPlans = useCallback(async () => {
    console.log('=== fetchPlans iniciado ===');

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('ativo', true)
      .order('limite_obras', { ascending: true });

    console.log('fetchPlans data:', data);
    console.log('fetchPlans error:', error);

    if (error) {
      console.error('Erro ao buscar planos:', error);
      setPlans([]);
      return;
    }

    setPlans((data || []) as unknown as Plan[]);
  }, []);

  const fetchCompany = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setPlan(null);
      setSubscription(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    console.log('=== fetchCompany iniciado ===');
    console.log('user.id:', user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    console.log('profile:', profile);
    console.log('profileError:', profileError);

    if (profileError) {
      console.error('Erro ao buscar profile:', profileError);
    }

    if (!profile?.company_id) {
      setCompany(null);
      setPlan(null);
      setSubscription(null);
      setNeedsOnboarding(true);
      setLoading(false);
      return;
    }

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    console.log('companyData:', companyData);
    console.log('companyError:', companyError);

    if (companyError) {
      console.error('Erro ao buscar empresa:', companyError);
      setLoading(false);
      return;
    }

    if (companyData) {
      setCompany(companyData as unknown as Company);
      setNeedsOnboarding(false);

      if (companyData.plan_id) {
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', companyData.plan_id)
          .single();

        console.log('planData:', planData);
        console.log('planError:', planError);

        if (!planError && planData) {
          setPlan(planData as unknown as Plan);
        } else {
          setPlan(null);
        }
      } else {
        setPlan(null);
      }

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyData.id)
        .in('status', ['trial', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('subscriptionData:', subData);
      console.log('subscriptionError:', subError);

      if (!subError && subData) {
        setSubscription(subData as unknown as Subscription);
      } else {
        setSubscription(null);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompany();
    } else {
      setCompany(null);
      setPlan(null);
      setSubscription(null);
      setNeedsOnboarding(false);
      setLoading(false);
    }
  }, [isAuthenticated, fetchCompany]);

  const checkLimit = useCallback(
    async (
      resource: 'obras' | 'gestores' | 'funcionarios' | 'clientes'
    ): Promise<PlanLimitResult> => {
      if (!company) {
        return {
          allowed: false,
          current: 0,
          limit: 0,
          plan: '',
          reason: 'Sem empresa vinculada',
        };
      }

      const { data, error } = await supabase.rpc('check_plan_limit', {
        _company_id: company.id,
        _resource: resource,
      });

      if (error || !data) {
        console.error('Erro ao verificar limite:', error);
        return {
          allowed: false,
          current: 0,
          limit: 0,
          plan: '',
          reason: 'Erro ao verificar limite',
        };
      }

      return data as unknown as PlanLimitResult;
    },
    [company]
  );

  const createCompany = useCallback(
    async (input: {
      nome: string;
      cnpj?: string;
      email?: string;
      telefone?: string;
      planSlug: string;
    }) => {
      try {
        if (!user) {
          console.error('createCompany: usuário não encontrado');
          return null;
        }

        console.log('=== createCompany iniciado ===');
        console.log('input:', input);
        console.log('plans disponíveis:', plans);

        const targetPlan = plans.find((p) => p.slug === input.planSlug);

        if (!targetPlan) {
          console.error('Plano não encontrado para slug:', input.planSlug);
          return null;
        }

        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            nome: input.nome,
            cnpj: input.cnpj || '',
            email: input.email || user.email || '',
            telefone: input.telefone || '',
            plan_id: targetPlan.id,
            status: 'ativo',
          } as any)
          .select()
          .single();

        console.log('newCompany:', newCompany);
        console.log('companyError:', companyError);

        if (companyError || !newCompany) {
          console.error('Erro ao criar empresa:', companyError);
          return null;
        }

        const companyId = (newCompany as any).id;

        const { error: subError } = await supabase.from('subscriptions').insert({
          company_id: companyId,
          plan_id: targetPlan.id,
          status: 'trial',
          ciclo: 'mensal',
          trial_start: new Date().toISOString().split('T')[0],
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        } as any);

        console.log('subscription insert error:', subError);

        if (subError) {
          console.error('Erro ao criar subscription:', subError);
          return null;
        }

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ company_id: companyId } as any)
          .eq('user_id', user.id);

        console.log('profile update error:', profileUpdateError);

        if (profileUpdateError) {
          console.error('Erro ao atualizar profiles.company_id:', profileUpdateError);
          return null;
        }

        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({ company_id: companyId } as any)
          .eq('user_id', user.id);

        console.log('user_roles update error:', roleUpdateError);

        if (roleUpdateError) {
          console.error('Erro ao atualizar user_roles.company_id:', roleUpdateError);
        }

        await fetchCompany();
        return companyId;
      } catch (error) {
        console.error('Erro inesperado no createCompany:', error);
        return null;
      }
    },
    [user, plans, fetchCompany]
  );

  return (
    <CompanyContext.Provider
      value={{
        company,
        plan,
        subscription,
        plans,
        loading,
        needsOnboarding,
        checkLimit,
        refreshCompany: fetchCompany,
        createCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return ctx;
}
