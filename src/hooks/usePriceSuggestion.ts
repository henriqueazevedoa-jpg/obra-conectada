import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';

function normalizarDescricao(d: string): string {
  return d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function usePriceSuggestion(
  descricao: string,
  unidade: string,
  enabled: boolean,
  currentPrice: number | null,
  companyId?: string
) {
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    if (!enabled || !descricao || currentPrice != null) {
      setSuggestedPrice(null);
      return;
    }

    let cancelled = false;

    const fetchSuggestion = async () => {
      if (descricao.length < 5) return;
      setIsSuggesting(true);
      try {
        const termNorm = normalizarDescricao(descricao);
        
        // 1. Tentar Histórico da Empresa
        if (companyId) {
          const { data: histData } = await (supabase as any)
            .from('preco_historico')
            .select('preco_unitario')
            .eq('company_id', companyId)
            .ilike('descricao_normalizada', `%${termNorm}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (histData?.preco_unitario) {
            if (!cancelled) setSuggestedPrice(histData.preco_unitario);
            return;
          }
        }

        // 2. Tentar Preços Fornecedores (Catálogo Global)
        const { data: fornData } = await (supabase as any)
          .from('precos_fornecedores')
          .select('preco_unitario')
          .ilike('descricao_item_snapshot', `%${descricao}%`)
          .limit(1)
          .maybeSingle();

        if (fornData?.preco_unitario) {
          if (!cancelled) setSuggestedPrice(fornData.preco_unitario);
          return;
        }

        // 3. Tentar SINAPI
        const { data: sinapiData } = await (supabase as any)
          .from('sinapi_insumos')
          .select('preco_unitario')
          .ilike('descricao', `%${descricao}%`)
          .limit(1)
          .maybeSingle();

        if (sinapiData?.preco_unitario) {
          if (!cancelled) setSuggestedPrice(sinapiData.preco_unitario);
          return;
        }

        if (!cancelled) setSuggestedPrice(null);
      } catch (e) {
        console.warn('[usePriceSuggestion]', e);
      } finally {
        if (!cancelled) setIsSuggesting(false);
      }
    };

    const timeout = setTimeout(fetchSuggestion, 1200); // debounce aumentado para 1200ms
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [descricao, unidade, enabled, currentPrice, companyId]);

  return { suggestedPrice, isSuggesting, clearSuggestion: () => setSuggestedPrice(null) };
}
