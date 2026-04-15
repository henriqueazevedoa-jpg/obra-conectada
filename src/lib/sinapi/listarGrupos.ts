import { supabase } from '@/integrations/supabase/untyped';

/**
 * Lista grupos distintos de composições SINAPI para uma referência.
 * Usa RPC com DISTINCT no banco — muito mais eficiente que
 * o loop de paginação JS anterior.
 */
export async function listarGruposSinapi(
  referenciaId: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_sinapi_grupos', {
    p_referencia_id: referenciaId,
  });

  if (error) throw error;

  return ((data ?? []) as { grupo: string }[])
    .map((row) => row.grupo)
    .filter((g) => typeof g === 'string' && g.trim() !== '');
}