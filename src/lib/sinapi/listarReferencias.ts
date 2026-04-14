import { supabase } from '@/integrations/supabase/untyped';

export async function listarReferenciasSinapi() {
  const { data, error } = await supabase
    .from('sinapi_referencias')
    .select('id, competencia, arquivo_nome')
    .order('competencia', { ascending: false });

  if (error) throw error;

  return (data || []).map((ref) => ({
    id: ref.id,
    label: `SINAPI ${ref.competencia}`,
  }));
}