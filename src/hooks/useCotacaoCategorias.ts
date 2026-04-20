import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import {
  CotacaoCategoria,
  CATEGORIAS_DEFAULT,
  inferirCategoria,
  inferirCategoriaObj,
  itemPertenceAEspecialidade,
} from '@/utils/cotacaoCategorias';

// Re-exporta para consumidores que importem só este hook
export type { CotacaoCategoria };
export { inferirCategoria, inferirCategoriaObj, itemPertenceAEspecialidade };

// ── Fetch function ────────────────────────────────────────────────────────────
async function fetchCotacaoCategorias(companyId: string): Promise<CotacaoCategoria[]> {
  const { data, error } = await (supabase as any)
    .from('cotacao_categorias')
    .select('id, company_id, nome, codigo, emoji, keywords, is_default')
    .eq('company_id', companyId)
    .order('nome');

  if (error || !data || data.length === 0) {
    // Fallback: usa defaults sem id/company_id (para empresas sem seed)
    return CATEGORIAS_DEFAULT.map((c, i) => ({
      ...c,
      id: `default-${i}`,
      company_id: companyId,
    }));
  }
  return data as CotacaoCategoria[];
}

export function useCotacaoCategorias() {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const { data: categorias = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['cotacao-categorias', company?.id],
    queryFn: () => fetchCotacaoCategorias(company!.id),
    enabled: !!company?.id,
    // Inicia com defaults para renderização imediata enquanto o banco carrega
    placeholderData: () =>
      CATEGORIAS_DEFAULT.map((c, i) => ({
        ...c,
        id: `default-${i}`,
        company_id: company?.id ?? '',
      })),
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const inferir = useCallback(
    (nomeItem: string) => inferirCategoriaObj(nomeItem, categorias),
    [categorias]
  );

  const pertenceAEspecialidade = useCallback(
    (nomeItem: string, especialidades: string[]) =>
      itemPertenceAEspecialidade(nomeItem, especialidades, categorias),
    [categorias]
  );

  const getCategoriaByCode = useCallback(
    (codigo: string) => categorias.find(c => c.codigo === codigo) ?? null,
    [categorias]
  );

  return {
    categorias,
    loading,
    error,
    inferir,
    pertenceAEspecialidade,
    getCategoriaByCode,
    refetch,
  };
}
