import { supabase } from '@/integrations/supabase/untyped';

export type SinapiRegime =
  | 'SEM_DESONERACAO'
  | 'COM_DESONERACAO'
  | 'SEM_ENCARGOS';

export interface SinapiInsumoDetalhado {
  tipo: 'INSUMO';
  codigo: number;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  composicaoPaiCodigo: number;
  composicaoPaiDescricao: string;
  grupoOrigemCodigo: number;
  grupoOrigemDescricao: string;
  caminhoComposicoes: number[];
  nivel: number;
}

export interface SinapiInsumoConsolidado {
  codigo: number;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  origens: {
    grupoOrigemCodigo: number;
    grupoOrigemDescricao: string;
    quantidade: number;
  }[];
  uf: string;
  regime: SinapiRegime;
  precoUnitario: number | null;
  custoTotal: number | null;
}

export interface SinapiComposicaoExpandida {
  referenciaId: string;
  composicaoPrincipal: {
    codigo: number;
    descricao: string;
    unidade: string | null;
    grupo: string | null;
    situacao: string | null;
  };
  uf: string;
  regime: SinapiRegime;
  detalhado: SinapiInsumoDetalhado[];
  consolidado: SinapiInsumoConsolidado[];
  custoTotal: number;
}

/**
 * Tipo retornado pela RPC do banco
 */
type RpcRow = {
  codigo: number;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  grupo_origem_codigo: number;
  grupo_origem_descricao: string;
  preco_unitario: number | null;
};

/**
 * Expande uma composição SINAPI usando uma única recursive CTE SQL
 * no banco de dados (RPC), eliminando o problema de N+1 queries
 * que causava lentidão.
 *
 * Antes: dezenas de round-trips ao banco para expansão recursiva.
 * Agora: 1 única query + 1 query para dados da composição principal.
 */
export async function expandirComposicaoSinapi(params: {
  referenciaId: string;
  codigoComposicao: number;
  uf: string;
  regime: SinapiRegime;
}): Promise<SinapiComposicaoExpandida> {
  const { referenciaId, codigoComposicao, uf, regime } = params;

  // Busca dados da composição principal e os itens expandidos em paralelo
  const [composicaoPrincipalResult, rpcResult] = await Promise.all([
    supabase
      .from('sinapi_composicoes')
      .select('codigo, descricao, unidade, grupo, situacao')
      .eq('referencia_id', referenciaId)
      .eq('codigo', codigoComposicao)
      .maybeSingle(),

    supabase.rpc('expandir_composicao_sinapi', {
      p_referencia_id: referenciaId,
      p_codigo: codigoComposicao,
      p_uf: uf,
      p_regime: regime,
    }),
  ]);

  if (composicaoPrincipalResult.error) throw composicaoPrincipalResult.error;
  if (rpcResult.error) throw rpcResult.error;
  if (!composicaoPrincipalResult.data) {
    throw new Error(`Composição ${codigoComposicao} não encontrada.`);
  }

  const compData = composicaoPrincipalResult.data;
  const composicaoPrincipal = {
    codigo: Number(compData.codigo),
    descricao: compData.descricao ?? '',
    unidade: compData.unidade ?? null,
    grupo: compData.grupo ?? null,
    situacao: compData.situacao ?? null,
  };

  const rows = (rpcResult.data ?? []) as RpcRow[];

  // Monta o consolidado agrupando por código de insumo
  // (cada linha da RPC é um insumo+origem; mesmo insumo pode vir de grupos diferentes)
  const consolidadoMap = new Map<
    number,
    Omit<SinapiInsumoConsolidado, 'uf' | 'regime'>
  >();

  for (const row of rows) {
    const codigo = Number(row.codigo);
    const quantidade = Number(row.quantidade) || 0;
    const precoUnitario =
      row.preco_unitario != null ? Number(row.preco_unitario) : null;
    const custoTotal =
      precoUnitario != null ? quantidade * precoUnitario : null;

    if (!consolidadoMap.has(codigo)) {
      consolidadoMap.set(codigo, {
        codigo,
        descricao: row.descricao ?? '',
        unidade: row.unidade ?? null,
        quantidade,
        precoUnitario,
        custoTotal,
        origens: [
          {
            grupoOrigemCodigo: Number(row.grupo_origem_codigo),
            grupoOrigemDescricao: row.grupo_origem_descricao ?? '',
            quantidade,
          },
        ],
      });
    } else {
      const existing = consolidadoMap.get(codigo)!;
      existing.quantidade += quantidade;
      if (existing.custoTotal != null && precoUnitario != null) {
        existing.custoTotal += quantidade * precoUnitario;
      }

      const origemExistente = existing.origens.find(
        (o) => o.grupoOrigemCodigo === Number(row.grupo_origem_codigo)
      );
      if (origemExistente) {
        origemExistente.quantidade += quantidade;
      } else {
        existing.origens.push({
          grupoOrigemCodigo: Number(row.grupo_origem_codigo),
          grupoOrigemDescricao: row.grupo_origem_descricao ?? '',
          quantidade,
        });
      }
    }
  }

  const consolidado: SinapiInsumoConsolidado[] = Array.from(
    consolidadoMap.values()
  )
    .map((item) => ({ ...item, uf, regime }))
    .sort((a, b) =>
      String(a.descricao).localeCompare(String(b.descricao), 'pt-BR')
    );

  // Monta detalhado a partir das mesmas linhas da RPC
  // (simplificado: cada linha vira um item detalhado, nível 1)
  const detalhado: SinapiInsumoDetalhado[] = rows.map((row) => ({
    tipo: 'INSUMO' as const,
    codigo: Number(row.codigo),
    descricao: row.descricao ?? '',
    unidade: row.unidade ?? null,
    quantidade: Number(row.quantidade) || 0,
    composicaoPaiCodigo: Number(row.grupo_origem_codigo),
    composicaoPaiDescricao: row.grupo_origem_descricao ?? '',
    grupoOrigemCodigo: Number(row.grupo_origem_codigo),
    grupoOrigemDescricao: row.grupo_origem_descricao ?? '',
    caminhoComposicoes: [codigoComposicao, Number(row.grupo_origem_codigo)],
    nivel: 1,
  }));

  const custoTotal = consolidado.reduce(
    (acc, item) => acc + (item.custoTotal ?? 0),
    0
  );

  return {
    referenciaId,
    composicaoPrincipal,
    uf,
    regime,
    detalhado,
    consolidado,
    custoTotal,
  };
}