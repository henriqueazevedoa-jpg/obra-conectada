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

  const loadParams = useCallback(async (categoria: string, obraId?: string) => {
    if (!company) return;
    setLoading(true);

    try {
      let calData = null;
      let feriadosData = null;

      if (obraId) {
        // Tenta buscar calendário da obra
        const [obraCalRes, obraFerRes] = await Promise.all([
          supabase.from('obra_calendarios').select('*').eq('obra_id', obraId).maybeSingle(),
          supabase.from('obra_calendarios_holidays').select('*').eq('obra_id', obraId)
        ]);
        calData = obraCalRes.data;
        feriadosData = obraFerRes.data;
      }

      // Se não encontrou da obra, busca da empresa
      if (!calData) {
        const calRes = await supabase.from('company_calendar').select('*').eq('company_id', company.id).maybeSingle();
        calData = calRes.data;
        const ferRes = await supabase.from('company_calendar_holidays').select('*').eq('company_id', company.id);
        feriadosData = ferRes.data;
      }

      const amdahlRes = await supabase
        .from('amdahl_params')
        .select('*')
        .or(`company_id.is.null,company_id.eq.${company.id}`)
        .eq('categoria', categoria)
        .order('company_id', { ascending: false, nullsFirst: false });

      if (calData) {
        setCalendar({ dias_uteis: calData.dias_uteis || [1,2,3,4,5], horas_por_dia: calData.horas_por_dia || 8 });
      } else {
        setCalendar({ dias_uteis: [1,2,3,4,5], horas_por_dia: 8 });
      }

      if (feriadosData) {
        const fSet = new Set<string>();
        const frSet = new Set<string>();
        feriadosData.forEach((f: any) => { 
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
