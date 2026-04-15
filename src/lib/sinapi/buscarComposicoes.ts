import { supabase } from '@/integrations/supabase/untyped';

export type SinapiComposicaoResumo = {
  codigo: number;
  descricao: string;
  unidade: string | null;
  grupo: string | null;
};

type SinapiComposicaoResumoRow = {
  codigo: number | string | null;
  descricao: string | null;
  unidade: string | null;
  grupo: string | null;
};

/**
 * Busca composições por termo (código ou descrição).
 * Continua sendo usada quando o usuário digita no campo de busca.
 */
export async function buscarComposicoesSinapi(params: {
  referenciaId: string;
  termo: string;
  grupo?: string;
  limit?: number;
}): Promise<SinapiComposicaoResumo[]> {
  const { referenciaId, termo, grupo, limit = 50 } = params;

  const termoLimpo = termo.trim();
  if (termoLimpo.length < 1) return [];

  const codigoNumerico = Number(termoLimpo);
  const buscaPorCodigo = Number.isFinite(codigoNumerico) && codigoNumerico > 0;

  let query = supabase
    .from('sinapi_composicoes')
    .select('codigo, descricao, unidade, grupo')
    .eq('referencia_id', referenciaId)
    .limit(limit);

  if (grupo && grupo.trim() !== '') {
    query = query.eq('grupo', grupo);
  }

  if (buscaPorCodigo) {
    query = query.or(`descricao.ilike.%${termoLimpo}%,codigo.eq.${codigoNumerico}`);
  } else {
    query = query.ilike('descricao', `%${termoLimpo}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return parseRows((data ?? []) as SinapiComposicaoResumoRow[]);
}

/**
 * Lista TODAS as composições de um grupo SINAPI.
 * Chamada quando o usuário seleciona um grupo — preenche a lista completa.
 * A filtragem posterior é feita client-side pelo campo de busca.
 */
export async function listarComposicoesPorGrupo(params: {
  referenciaId: string;
  grupo: string;
}): Promise<SinapiComposicaoResumo[]> {
  const { referenciaId, grupo } = params;

  const { data, error } = await supabase
    .from('sinapi_composicoes')
    .select('codigo, descricao, unidade, grupo')
    .eq('referencia_id', referenciaId)
    .eq('grupo', grupo)
    .order('descricao', { ascending: true });

  if (error) throw error;

  return parseRows((data ?? []) as SinapiComposicaoResumoRow[]);
}

function parseRows(rows: SinapiComposicaoResumoRow[]): SinapiComposicaoResumo[] {
  return rows
    .filter((row) => row.codigo !== null && typeof row.descricao === 'string')
    .map((row) => ({
      codigo: typeof row.codigo === 'number' ? row.codigo : Number(row.codigo),
      descricao: row.descricao ?? '',
      unidade: row.unidade ?? null,
      grupo: row.grupo ?? null,
    }))
    .filter(
      (row) =>
        Number.isFinite(row.codigo) &&
        typeof row.descricao === 'string' &&
        row.descricao.trim() !== ''
    )
    .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'));
}
