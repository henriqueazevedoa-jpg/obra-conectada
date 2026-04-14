import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { format, addDays } from 'date-fns';

interface Pagamento {
  id: string;
  descricao: string;
  valor_previsto: number;
  data_vencimento: string;
  status: string;
  fornecedor: string | null;
  etapa_orcamento: string | null;
}

export interface EtapaFinanceiro {
  totalPrevisto: number;
  totalPago: number;
  totalAberto: number;
  totalAtrasado: number;
  proximoVencimento: string | null;
  pagamentos: Pagamento[];
}

export type FinanceiroByEtapa = Record<string, EtapaFinanceiro>;

export function useGanttFinanceiro(obraId: string | undefined) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!obraId) { setPagamentos([]); return; }
    setLoading(true);
    supabase
      .from('pagamentos')
      .select('id, descricao, valor_previsto, data_vencimento, status, fornecedor, etapa_orcamento')
      .eq('obra_id', obraId)
      .order('data_vencimento', { ascending: true })
      .then(({ data }: any) => {
        setPagamentos((data as Pagamento[]) || []);
        setLoading(false);
      });
  }, [obraId]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const byEtapa = useMemo<FinanceiroByEtapa>(() => {
    const map: FinanceiroByEtapa = {};
    pagamentos.forEach(p => {
      const etapa = p.etapa_orcamento;
      if (!etapa) return;
      if (!map[etapa]) {
        map[etapa] = { totalPrevisto: 0, totalPago: 0, totalAberto: 0, totalAtrasado: 0, proximoVencimento: null, pagamentos: [] };
      }
      const entry = map[etapa];
      const valor = Number(p.valor_previsto) || 0;
      const realStatus = p.status === 'pago' ? 'pago' : (p.data_vencimento && p.data_vencimento < today) ? 'atrasado' : 'previsto';

      entry.totalPrevisto += valor;
      entry.pagamentos.push({ ...p, status: realStatus });

      if (realStatus === 'pago') {
        entry.totalPago += valor;
      } else if (realStatus === 'atrasado') {
        entry.totalAtrasado += valor;
        entry.totalAberto += valor;
      } else {
        entry.totalAberto += valor;
        if (p.data_vencimento && (!entry.proximoVencimento || p.data_vencimento < entry.proximoVencimento)) {
          entry.proximoVencimento = p.data_vencimento;
        }
      }
    });
    return map;
  }, [pagamentos, today]);

  const totalGeral = useMemo(() => {
    let previsto = 0, pago = 0, aberto = 0, atrasado = 0;
    Object.values(byEtapa).forEach(e => {
      previsto += e.totalPrevisto;
      pago += e.totalPago;
      aberto += e.totalAberto;
      atrasado += e.totalAtrasado;
    });
    return { previsto, pago, aberto, atrasado };
  }, [byEtapa]);

  return { byEtapa, totalGeral, loading };
}
