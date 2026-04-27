import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';

export type QuantitativoStatus = 'nao_gerado' | 'gerando' | 'concluido' | 'erro';

export interface QuantitativoItem {
  id: string;
  disciplina: string;
  tipo: string;
  dados: {
    elementos: Array<{
      valor?: string;
      ocorrencias?: number;
      [key: string]: any;
    }>;
  };
  fonte: string;
  confianca: 'alta' | 'media' | 'baixa';
  conflitos: any[];
  consolidado_em: string;
}

export function useQuantitativos(obraId: string | undefined) {
  const [status, setStatus] = useState<QuantitativoStatus>('nao_gerado');
  const [quantitativos, setQuantitativos] = useState<QuantitativoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditosPreview, setCreditosPreview] = useState<{ total_chunks: number; creditos_estimados: number } | null>(null);

  useEffect(() => {
    if (!obraId) return;

    const fetchStatusAndData = async () => {
      setLoading(true);
      try {
        const { data: obraData, error: obraError } = await supabase
          .from('obras')
          .select('quantitativos_status')
          .eq('id', obraId)
          .single();

        if (obraError) throw obraError;
        
        const currentStatus = obraData?.quantitativos_status || 'nao_gerado';
        setStatus(currentStatus);

        if (currentStatus === 'concluido') {
          const { data: quantData, error: quantError } = await supabase
            .from('projeto_quantitativos')
            .select('*')
            .eq('obra_id', obraId)
            .order('disciplina', { ascending: true });

          if (quantError) throw quantError;
          setQuantitativos(quantData || []);
        }
      } catch (err: any) {
        console.error('Erro ao buscar quantitativos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatusAndData();

    // Subscribe to realtime updates on the obras table
    const subscription = supabase
      .channel(`obra-quantitativos-${obraId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'obras',
          filter: `id=eq.${obraId}`
        },
        (payload) => {
          if (payload.new && payload.new.quantitativos_status) {
            setStatus(payload.new.quantitativos_status);
            if (payload.new.quantitativos_status === 'concluido') {
              fetchStatusAndData(); // reload the items
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [obraId]);

  const fetchPreview = async (userId: string) => {
    if (!obraId) return null;
    try {
      const { data, error } = await supabase.functions.invoke('consolidar-quantitativos', {
        body: { obra_id: obraId, user_id: userId, action: 'preview' }
      });
      if (error) throw error;
      setCreditosPreview(data);
      return data;
    } catch (err: any) {
      console.error('Erro ao buscar preview:', err);
      throw err;
    }
  };

  const consolidar = async (userId: string) => {
    if (!obraId) return;
    try {
      setStatus('gerando');
      const { data, error } = await supabase.functions.invoke('consolidar-quantitativos', {
        body: { obra_id: obraId, user_id: userId, action: 'execute' }
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Erro ao solicitar consolidação:', err);
      setStatus('erro');
      throw err;
    }
  };

  return {
    status,
    quantitativos,
    loading,
    error,
    creditosPreview,
    fetchPreview,
    consolidar
  };
}
