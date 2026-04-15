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

export async function buscarComposicoesSinapi(params: {
  referenciaId: string;
  termo: string;
  grupo?: string;
}): Promise<SinapiComposicaoResumo[]> {
  const { referenciaId, termo, grupo } = params;

  const termoLimpo = termo.trim();
  if (termoLimpo.length < 1) return [];

  const codigoNumerico = Number(termoLimpo);
  const buscaPorCodigo = Number.isFinite(codigoNumerico) && codigoNumerico > 0;

  let query = supabase
    .from('sinapi_composicoes')
    .select('codigo, descricao, unidade, grupo')
    .eq('referencia_id', referenciaId)
    .limit(30);

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

  const rows = (data ?? []) as SinapiComposicaoResumoRow[];

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
