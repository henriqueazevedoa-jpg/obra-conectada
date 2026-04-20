import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';

export interface OrcamentoCategoria {
  id: string;
  obra_id: string;
  codigo?: string;
  nome: string;
  preco_total: number;
  usa_composicoes: boolean;
}

export interface OrcamentoComposicao {
  id: string;
  etapa_id: string;
  codigo?: string;
  descricao: string;
  unidade?: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  codigo_referencia_externa?: string;
  fonte_referencia?: string;
  categoria?: OrcamentoCategoria;
}

interface OrcamentoData {
  categorias: OrcamentoCategoria[];
  composicoes: OrcamentoComposicao[];
}

// ── Fetch function ────────────────────────────────────────────────────────────
async function fetchOrcamentoParaCronograma(obraId: string): Promise<OrcamentoData> {
  const [{ data: cats }, { data: catIds }] = await Promise.all([
    supabase
      .from('orcamento_categorias')
      .select('id, obra_id, codigo, nome, preco_total, usa_composicoes')
      .eq('obra_id', obraId)
      .order('codigo'),
    supabase.from('orcamento_categorias').select('id').eq('obra_id', obraId),
  ]);

  const ids = catIds?.map((c: any) => c.id) || [];
  const { data: comps } = ids.length > 0
    ? await (supabase.from('orcamento_composicoes') as any)
        .select(`
          id, etapa_id, codigo, descricao, unidade, quantidade,
          preco_unitario, preco_total, codigo_referencia_externa, fonte_referencia,
          categoria:orcamento_categorias(id, nome, codigo)
        `)
        .in('etapa_id', ids)
        .order('codigo')
    : { data: [] };

  return {
    categorias: (cats as OrcamentoCategoria[]) || [],
    composicoes: (comps as OrcamentoComposicao[]) || [],
  };
}

export function useOrcamentoParaCronograma(obraId: string | undefined) {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['orcamento-cronograma', obraId],
    queryFn: () => fetchOrcamentoParaCronograma(obraId!),
    enabled: !!obraId,
  });

  const categorias = data?.categorias ?? [];
  const composicoes = data?.composicoes ?? [];

  const searchComposicoes = useCallback((query: string): OrcamentoComposicao[] => {
    if (!query.trim()) return composicoes;
    const q = query.toLowerCase();
    return composicoes.filter(c =>
      c.descricao.toLowerCase().includes(q) ||
      (c.codigo ?? '').toLowerCase().includes(q) ||
      (c.codigo_referencia_externa ?? '').toLowerCase().includes(q) ||
      (c.categoria?.nome ?? '').toLowerCase().includes(q)
    );
  }, [composicoes]);

  const searchCategorias = useCallback((query: string): OrcamentoCategoria[] => {
    if (!query.trim()) return categorias;
    const q = query.toLowerCase();
    return categorias.filter(c =>
      c.nome.toLowerCase().includes(q) || (c.codigo ?? '').toLowerCase().includes(q)
    );
  }, [categorias]);

  return { categorias, composicoes, loading, searchComposicoes, searchCategorias };
}
