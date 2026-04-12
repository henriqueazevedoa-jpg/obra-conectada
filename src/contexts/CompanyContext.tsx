import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from './AuthContext';

export interface Plan {
  id: string;
  slug: string | null;
  nome_comercial: string | null;
  descricao: string | null;
  limite_obras: number | null;
  limite_gestores: number | null;
  limite_funcionarios: number | null;
  limite_clientes: number | null;
  ilimitado: boolean | null;
  ativo: boolean | null;
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
  company_id: string | null;
  plan_id: string | null;
  status: string | null;
  ciclo: string | null;
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
  plansLoading: boolean;
  needsOnboarding: boolean;
  checkLimit: (
    resource: 'obras' | 'gestores' | 'funcionarios' | 'clientes'
  ) => Promise<PlanLimitResult>;
  refreshCompany: () => Promise<void>;
  completeOnboarding: (data: {
    nome: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
    planSlug?: string;
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
  const [plansLoading, setPlansLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const resetCompanyState = useCallback(() => {
    setCompany(null);
    setPlan(null);
    setSubscription(null);
  }, []);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);

    try {
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

      setPlans((data || []) as Plan[]);
    } catch (err) {
      console.error('Erro inesperado ao buscar planos:', err);
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const fetchCompany = useCallback(async () => {
    if (!user) {
      resetCompanyState();
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Erro ao buscar profile:', profileError);
        resetCompanyState();
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      if (!profile?.company_id) {
        resetCompanyState();
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
        resetCompanyState();
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      setCompany(companyData as Company);

      if (!companyData.plan_id) {
        setPlan(null);
        setSubscription(null);
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      const [{ data: planData, error: planError }, { data: subData, error: subError }] =
        await Promise.all([
          supabase.from('plans').select('*').eq('id', companyData.plan_id).maybeSingle(),
          supabase
            .from('subscriptions')
            .select('*')
            .eq('company_id', companyData.id)
            .in('status', ['trial', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (planError) {
        console.error('Erro ao buscar plano da empresa:', planError);
      }

      if (subError) {
        console.error('Erro ao buscar subscription:', subError);
      }

      setPlan((planData as Plan) || null);
      setSubscription((subData as Subscription) || null);
      setNeedsOnboarding(false);
    } catch (err) {
      console.error('Erro inesperado ao buscar dados da empresa:', err);
      resetCompanyState();
      setNeedsOnboarding(true);
    } finally {
      setLoading(false);
    }
  }, [user, resetCompanyState]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompany();
    } else {
      resetCompanyState();
      setNeedsOnboarding(false);
      setLoading(false);
    }
  }, [isAuthenticated, fetchCompany, resetCompanyState]);

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

  const completeOnboarding = useCallback(
    async (input: {
      nome: string;
      cnpj?: string;
      email?: string;
      telefone?: string;
      planSlug?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      // Se tem planSlug, usa RPC completo; senão apenas atualiza dados da empresa
      if (input.planSlug) {
        const { error } = await (supabase as any).rpc('complete_onboarding', {
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
      } else {
        // Apenas atualizar dados da empresa existente via profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();

        if (profile?.company_id) {
          const { error } = await supabase
            .from('companies')
            .update({
              nome: input.nome,
              cnpj: input.cnpj || '',
              email: input.email || '',
              telefone: input.telefone || '',
            })
            .eq('id', profile.company_id);
          if (error) {
            console.error('Erro ao atualizar empresa:', error);
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'Nenhuma empresa vinculada. Aguarde a ativação do seu plano.' };
        }
      }

      await fetchCompany();
      return { success: true };

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
        plansLoading,
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