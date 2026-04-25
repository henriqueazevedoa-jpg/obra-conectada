import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface OrcamentoEtapaImport {
  id: string;
  nome: string;
  codigo: string | null;
  ordem: number;
  valor_total: number;
  is_indireto: boolean;
}

export function useCronogramaImport(obraId: string | undefined) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Passo 1: Buscar etapas do orçamento (orcamento_categorias)
  const fetchEtapas = useCallback(async (): Promise<OrcamentoEtapaImport[]> => {
    if (!obraId) return [];
    setLoading(true);

    try {
      // Verifica se a coluna 'tipo' existe na tabela orcamento_categorias
      const { data: cols } = await supabase.rpc('check_column_exists', {
        table_name: 'orcamento_categorias',
        column_name: 'tipo'
      }).catch(() => ({ data: false }));

      let selectFields = 'id, nome, codigo, ordem, preco_total';
      if (cols) {
        selectFields += ', tipo';
      }

      const { data: categorias, error } = await (supabase as any)
        .from('orcamento_categorias')
        .select(selectFields)
        .eq('obra_id', obraId)
        .order('ordem', { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (categorias || [])
        .filter((c: any) => cols ? c.tipo !== 'indireto' : true)
        .map((c: any, index: number) => ({
          id: c.id,
          nome: c.nome,
          codigo: c.codigo || null,
          ordem: c.ordem ?? (index + 1),
          valor_total: Number(c.preco_total || 0),
          is_indireto: cols ? c.tipo === 'indireto' : false,
        }));
    } catch (err: any) {
      console.error('[useCronogramaImport]', err);
      toast({ title: 'Erro ao buscar etapas', description: err.message, variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, [obraId]);

  // Passo 3: Criar tarefas baseadas na seleção
  const importarEtapas = useCallback(async (
    etapasSelecionadas: { 
      etapa: OrcamentoEtapaImport; 
      duracaoSugerida: number; 
      dataInicio: string; 
      dataFim: string; 
    }[]
  ) => {
    if (!obraId || etapasSelecionadas.length === 0) return false;
    setLoading(true);

    const valorTotalObra = etapasSelecionadas.reduce((sum, item) => sum + item.etapa.valor_total, 0);

    const novasTarefas = etapasSelecionadas.map((item, index) => {
      const peso = valorTotalObra > 0 ? (item.etapa.valor_total / valorTotalObra) : 0;
      return {
        obra_id: obraId,
        nome: item.etapa.nome,
        tipo_tarefa: 'PADRAO',
        data_inicio: item.dataInicio,
        data_fim: item.dataFim,
        duracao_dias: item.duracaoSugerida,
        percentual_concluido: 0,
        status: 'nao_iniciada',
        ordem: index + 1,
        nivel: 1,
        baseline_inicio: item.dataInicio,
        baseline_fim: item.dataFim,
        baseline_locked: true,
        peso_orcamento: peso,
        orcamento_categoria_id: item.etapa.id,
        pode_editar_datas: true,
      };
    });

    const { error } = await (supabase as any)
      .from('cronograma_tarefas')
      .insert(novasTarefas);

    setLoading(false);

    if (error) {
      toast({ title: 'Erro na importação', description: error.message, variant: 'destructive' });
      return false;
    }

    queryClient.invalidateQueries({ queryKey: ['cronograma', obraId] });
    toast({ title: 'Importação Concluída', description: `${novasTarefas.length} tarefas criadas com sucesso.` });
    return true;

  }, [obraId, queryClient]);

  return {
    fetchEtapas,
    importarEtapas,
    loading
  };
}
