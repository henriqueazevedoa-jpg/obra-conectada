import { supabase } from '@/integrations/supabase/untyped';

type SinapiReferenciaRow = {
  id: string;
  competencia: string | null;
  arquivo_nome: string | null;
};

export type SinapiReferenciaOption = {
  id: string;
  label: string;
  competencia: string;
};

export async function listarReferenciasSinapi(): Promise<SinapiReferenciaOption[]> {
  const { data, error } = await supabase
    .from('sinapi_referencias')
    .select('id, competencia, arquivo_nome')
    .order('competencia', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as SinapiReferenciaRow[];

  return rows
    .filter((row) => typeof row.id === 'string' && !!row.id)
    .map((row) => {
      const competencia = typeof row.competencia === 'string' ? row.competencia : '';
      return {
        id: row.id,
        competencia,
        label: competencia ? `SINAPI ${competencia}` : 'SINAPI',
      };
    });
}