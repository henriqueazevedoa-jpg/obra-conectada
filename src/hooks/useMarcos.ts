import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TipoMarco = 'entrega' | 'pagamento' | 'aprovacao' | 'outro';

export interface CronogramaMarco {
  id: string;
  obra_id: string;
  company_id: string;
  nome: string;
  data_prevista: string;
  data_real: string | null;
  tipo: TipoMarco;
  contrato_id: string | null;
  parcela_id: string | null;
  concluido: boolean;
  created_at: string;
}

export interface MarcoInput {
  obra_id: string;
  nome: string;
  data_prevista: string;
  data_real?: string | null;
  tipo: TipoMarco;
  contrato_id?: string | null;
  parcela_id?: string | null;
  concluido?: boolean;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useMarcos(obraId: string | null) {
  const qc = useQueryClient();
  const { company } = useCompany();

  const qKey = ['cronograma_marcos', obraId];

  const { data: marcos = [], isLoading: loading } = useQuery<CronogramaMarco[]>({
    queryKey: qKey,
    enabled: !!obraId && !!company?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cronograma_marcos')
        .select('*')
        .eq('obra_id', obraId)
        .order('data_prevista', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMarco = useCallback(async (input: MarcoInput): Promise<CronogramaMarco | null> => {
    if (!company?.id) return null;
    const { data, error } = await (supabase as any)
      .from('cronograma_marcos')
      .insert({ ...input, company_id: company.id })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro ao criar marco', description: error.message, variant: 'destructive' });
      return null;
    }
    qc.invalidateQueries({ queryKey: qKey });
    return data;
  }, [company?.id, qc, qKey]);

  const updateMarco = useCallback(async (id: string, changes: Partial<MarcoInput>): Promise<void> => {
    const { error } = await (supabase as any)
      .from('cronograma_marcos')
      .update(changes)
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar marco', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: qKey });
  }, [qc, qKey]);

  const deleteMarco = useCallback(async (id: string): Promise<void> => {
    const { error } = await (supabase as any)
      .from('cronograma_marcos')
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover marco', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: qKey });
  }, [qc, qKey]);

  const concluirMarco = useCallback(async (id: string): Promise<void> => {
    await updateMarco(id, {
      concluido: true,
      data_real: new Date().toISOString().split('T')[0],
    });
  }, [updateMarco]);

  return { marcos, loading, addMarco, updateMarco, deleteMarco, concluirMarco };
}
