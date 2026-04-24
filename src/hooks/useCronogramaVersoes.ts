import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';

export type TipoCronogramaVersao = 'estimativo' | 'analitico' | 'execucao';
export type StatusCronogramaVersao = 'ativo' | 'arquivado' | 'baseline';

export interface CronogramaVersao {
  id: string;
  obra_id: string;
  company_id: string;
  nome: string;
  tipo: TipoCronogramaVersao;
  status: StatusCronogramaVersao;
  versao_pai_id: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchVersoes(obraId: string): Promise<CronogramaVersao[]> {
  const { data, error } = await (supabase as any)
    .from('cronograma_versoes')
    .select('*')
    .eq('obra_id', obraId)
    .neq('status', 'arquivado')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[useCronogramaVersoes] fetch error:', error);
    return [];
  }
  return (data as CronogramaVersao[]) || [];
}

export function useCronogramaVersoes(obraId: string | undefined) {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  // AD-001: IDs primitivos como dependências
  const companyId = company?.id;

  const { data: versoes = [], isLoading: loading } = useQuery({
    queryKey: ['cronograma_versoes', obraId, companyId],
    queryFn: () => fetchVersoes(obraId!),
    enabled: !!obraId && !!companyId,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cronograma_versoes', obraId] });
  }, [queryClient, obraId]);

  /**
   * Cria uma nova versão do cronograma para a obra.
   * Retorna a versão criada ou null em caso de erro.
   */
  const criarVersao = useCallback(async (
    tipo: TipoCronogramaVersao,
    nome?: string,
    versaoPaiId?: string | null,
  ): Promise<CronogramaVersao | null> => {
    if (!obraId || !companyId) return null;

    const nomeDefault: Record<TipoCronogramaVersao, string> = {
      estimativo: 'Cronograma Estimativo',
      analitico: 'Cronograma Analítico',
      execucao: 'Cronograma de Execução',
    };

    const payload = {
      obra_id: obraId,
      company_id: companyId,
      nome: nome || nomeDefault[tipo],
      tipo,
      status: 'ativo' as StatusCronogramaVersao,
      versao_pai_id: versaoPaiId ?? null,
    };

    const { data, error } = await (supabase as any)
      .from('cronograma_versoes')
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao criar versão',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    invalidate();
    return data as CronogramaVersao;
  }, [obraId, companyId, invalidate]);

  /**
   * Arquiva uma versão (soft delete).
   */
  const arquivarVersao = useCallback(async (versaoId: string): Promise<void> => {
    const { error } = await (supabase as any)
      .from('cronograma_versoes')
      .update({ status: 'arquivado', updated_at: new Date().toISOString() })
      .eq('id', versaoId);

    if (error) {
      toast({
        title: 'Erro ao arquivar versão',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    invalidate();
  }, [invalidate]);

  return { versoes, loading, criarVersao, arquivarVersao };
}
