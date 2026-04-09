import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export function useAddonAccess(addonCode: string) {
  const { company } = useCompany();
  const [status, setStatus] = useState<string>('loading');
  const [allowed, setAllowed] = useState(false);

  const check = useCallback(async () => {
    if (!company) { setStatus('no_company'); setAllowed(false); return; }

    const { data } = await supabase
      .from('company_addons')
      .select('status, trial_end')
      .eq('company_id', company.id)
      .eq('addon_code', addonCode)
      .single();

    if (!data) { setStatus('inactive'); setAllowed(false); return; }

    const s = (data as any).status;
    if (s === 'active') { setStatus('active'); setAllowed(true); return; }
    if (s === 'trial') {
      const trialEnd = (data as any).trial_end;
      if (trialEnd && new Date(trialEnd) >= new Date()) {
        setStatus('trial'); setAllowed(true);
      } else {
        setStatus('expired'); setAllowed(false);
      }
      return;
    }
    setStatus(s); setAllowed(false);
  }, [company, addonCode]);

  useEffect(() => { check(); }, [check]);

  return { allowed, status, refresh: check };
}
