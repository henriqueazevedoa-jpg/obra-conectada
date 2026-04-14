import { supabase } from '@/integrations/supabase/untyped';

export async function buscarComposicoesSinapi(params: {
  referenciaId: string;
  termo: string;
}) {
  const { referenciaId, termo } = params;

  if (!termo || termo.length < 3) return [];

  const { data, error } = await supabase
    .from('sinapi_composicoes')
    .select('codigo, descricao, unidade, grupo')
    .eq('referencia_id', referenciaId)
    .or(`descricao.ilike.%${termo}%,codigo.eq.${Number(termo) || 0}`)
    .limit(20);

  if (error) throw error;

  return data || [];
}