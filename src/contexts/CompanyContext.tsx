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
  completeOnboarding: (data: {
    nome: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
    planSlug: string;
  }) => Promise<{ success: boolean; error?: string }>;
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
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('ativo', true)
      .order('limite_obras', { ascending: true });

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

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
      .maybeSingle();

    if (companyError || !companyData) {
      console.error('Erro ao buscar empresa:', companyError);
      setLoading(false);
      return;
    }

    setCompany(companyData as unknown as Company);
    setNeedsOnboarding(false);

    if (companyData.plan_id) {
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', companyData.plan_id)
        .maybeSingle();

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

    if (!subError && subData) {
      setSubscription(subData as unknown as Subscription);
    } else {
      setSubscription(null);
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
    async (resource: 'obras' | 'gestores' | 'funcionarios' | 'clientes'): Promise<PlanLimitResult> => {
      if (!company) {
        return { allowed: false, current: 0, limit: 0, plan: '', reason: 'Sem empresa vinculada' };
      }

      const { data, error } = await supabase.rpc('check_plan_limit', {
        _company_id: company.id,
        _resource: resource,
      });

      if (error || !data) {
        console.error('Erro ao verificar limite:', error);
        return { allowed: false, current: 0, limit: 0, plan: '', reason: 'Erro ao verificar limite' };
      }

      return data as unknown as PlanLimitResult;
    },
    [company]
  );

  const completeOnboarding = useCallback(
    async (input: {
      nome: string;
      cnpj?: string;
      email?: string;
      telefone?: string;
      planSlug: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const { data, error } = await (supabase.rpc as any)('complete_onboarding', {
        _nome: input.nome,
        _cnpj: input.cnpj || '',
        _email: input.email || '',
        _telefone: input.telefone || '',
        _plan_slug: input.planSlug,
      });

      if (error) {
        console.error('Erro no complete_onboarding:', error);
        return { success: false, error: error.message };
      }

      await fetchCompany();
      return { success: true };
    },
    [fetchCompany]
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
        completeOnboarding,
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
