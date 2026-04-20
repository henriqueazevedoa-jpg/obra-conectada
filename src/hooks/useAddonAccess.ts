import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';

// ── Fetch function ──────────────────────────────────────────────────────────────
async function fetchAddonAccess(companyId: string, addonCode: string) {
  const { data, error } = await supabase
    .from('company_addons')
    .select('status, trial_end')
    .eq('company_id', companyId)
    .eq('addon_code', addonCode)
    .maybeSingle();

  if (error) return { status: 'inactive', allowed: false };
  if (!data) return { status: 'inactive', allowed: false };

  const s = (data as any).status;
  if (s === 'active') return { status: 'active', allowed: true };
  if (s === 'trial') {
    const trialEnd = (data as any).trial_end;
    if (trialEnd && new Date(trialEnd) >= new Date()) {
      return { status: 'trial', allowed: true };
    }
    return { status: 'expired', allowed: false };
  }
  return { status: s, allowed: false };
}

export function useAddonAccess(addonCode: string) {
  const { company } = useCompany();

  const { data, refetch } = useQuery({
    queryKey: ['addon-access', addonCode, company?.id],
    queryFn: () => fetchAddonAccess(company!.id, addonCode),
    enabled: !!company && !!addonCode,
  });

  return {
    allowed: data?.allowed ?? false,
    status: data?.status ?? (company ? 'inactive' : 'no_company'),
    refresh: refetch,
  };
}
