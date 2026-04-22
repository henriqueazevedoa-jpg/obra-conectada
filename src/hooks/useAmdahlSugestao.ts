import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { AmdahlParams, CalendarConfig, calcularAmdahl, AmdahlResult } from '@/lib/amdahl';

export function useAmdahlSugestao() {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState<AmdahlParams | null>(null);
  const [calendar, setCalendar] = useState<CalendarConfig | null>(null);
  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  const [feriadosRecorrentes, setFeriadosRecorrentes] = useState<Set<string>>(new Set());

  const loadParams = useCallback(async (categoria: string) => {
    if (!company) return;
    setLoading(true);

    try {
      // Busca paralela para melhor performance
      const [calRes, feriadosRes, amdahlRes] = await Promise.all([
        supabase
         .from('company_calendar')
         .select('*')
         .eq('company_id', company.id)
         .maybeSingle(),
        supabase
         .from('company_calendar_holidays')
         .select('*')
         .eq('company_id', company.id),
        supabase
         .from('amdahl_params')
         .select('*')
         .or(`company_id.is.null,company_id.eq.${company.id}`)
         .eq('categoria', categoria)
         .order('company_id', { ascending: false, nullsFirst: false })
      ]);

      if (calRes.data) {
        setCalendar({ dias_uteis: calRes.data.dias_uteis || [1,2,3,4,5], horas_por_dia: calRes.data.horas_por_dia || 8 });
      } else {
        setCalendar({ dias_uteis: [1,2,3,4,5], horas_por_dia: 8 });
      }

      if (feriadosRes.data) {
        const fSet = new Set<string>();
        const frSet = new Set<string>();
        feriadosRes.data.forEach((f: any) => { 
          if(f.data) {
            if (f.recorrente) {
              frSet.add(f.data.substring(5));
            } else {
              fSet.add(f.data);
            }
          } 
        });
        setFeriados(fSet);
        setFeriadosRecorrentes(frSet);
      }

      if (amdahlRes.data && amdahlRes.data.length > 0) {
        const row = amdahlRes.data[0];
        setParams({ p: row.amdahl_p ?? 0.8, f: row.amdahl_f ?? 0.05 });
      } else {
        setParams(null);
      }
    } catch (err) {
      console.error('[useAmdahlSugestao.loadParams]', err);
    } finally {
      setLoading(false);
    }
  }, [company]);

  const obterSugestao = useCallback((trabalhoBaseDias: number, nEquipes: number): AmdahlResult | null => {
    if (!calendar || !params) return null;
    return calcularAmdahl(trabalhoBaseDias, nEquipes, params, calendar.horas_por_dia);
  }, [calendar, params]);

  return { loadParams, obterSugestao, loading, params, calendar, feriados, feriadosRecorrentes };
}
