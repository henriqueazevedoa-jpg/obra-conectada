// ============================================================
// useCalculadora — Hook de dados e cálculo
// Sprint 3 / Bloco 13
//
// Responsável por:
//   1. Buscar CUB e EAP do Supabase (com cache via react-query)
//   2. Salvar estimativas no banco
//   3. Expor a função calcular() que une dados + engine
// ============================================================

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import {
  calcularEstimativa,
} from '@/lib/calculadora-engine';
import type {
  CalculadoraParams,
  CalculadoraResultado,
  CUBRecord,
  EAPTemplateRecord,
} from '@/types/calculadora';

// ─────────────────────────────────────────────────────────────
// FETCHERS
// ─────────────────────────────────────────────────────────────

async function fetchCUBList(companyId: string | undefined): Promise<CUBRecord[]> {
  // Buscar CUBs globais (company_id IS NULL) + overrides da empresa
  const { data, error } = await (supabase as any)
    .from('calculadora_cub')
    .select('*')
    .or(`company_id.is.null${companyId ? `,company_id.eq.${companyId}` : ''}`)
    .order('company_id', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[useCalculadora] Erro ao buscar CUB:', error.message);
    return [];
  }

  return (data ?? []) as CUBRecord[];
}

async function fetchEAPList(companyId: string | undefined): Promise<EAPTemplateRecord[]> {
  const { data, error } = await (supabase as any)
    .from('calculadora_eap_template')
    .select('*')
    .or(`company_id.is.null${companyId ? `,company_id.eq.${companyId}` : ''}`)
    .order('tipo_uso')
    .order('ordem');

  if (error) {
    console.error('[useCalculadora] Erro ao buscar EAP:', error.message);
    return [];
  }

  return (data ?? []) as EAPTemplateRecord[];
}

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────

export function useCalculadora() {
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  // ── Dados base ──────────────────────────────────────────────

  const cubQuery = useQuery({
    queryKey: ['calculadora-cub', companyId],
    queryFn: () => fetchCUBList(companyId),
    staleTime: 1000 * 60 * 30, // 30 min — CUBs mudam mensalmente
  });

  const eapQuery = useQuery({
    queryKey: ['calculadora-eap', companyId],
    queryFn: () => fetchEAPList(companyId),
    staleTime: 1000 * 60 * 60, // 1h — templates raramente mudam
  });

  const loading = cubQuery.isLoading || eapQuery.isLoading;
  const error = cubQuery.error || eapQuery.error;

  // ── Função de cálculo ───────────────────────────────────────

  const calcular = useCallback(
    (params: CalculadoraParams): CalculadoraResultado => {
      const cubList = cubQuery.data ?? [];
      const eapList = eapQuery.data ?? [];

      return calcularEstimativa({
        params,
        cubList,
        eapList,
        companyId,
      });
    },
    [cubQuery.data, eapQuery.data, companyId]
  );

  // ── Salvar estimativa no banco ──────────────────────────────

  const salvarMutation = useMutation({
    mutationFn: async ({
      params,
      resultado,
      obraId,
    }: {
      params: CalculadoraParams;
      resultado: CalculadoraResultado;
      obraId?: string;
    }) => {
      const { data: userData } = await (supabase as any).auth.getUser();
      const userId = userData?.user?.id;

      if (!userId || !companyId) {
        throw new Error('Usuário não autenticado ou empresa não definida.');
      }

      const { data, error } = await (supabase as any)
        .from('calculadora_estimativas')
        .insert({
          company_id: companyId,
          usuario_id: userId,
          obra_id: obraId ?? null,
          parametros: params,
          resultados: resultado,
          valor_total: resultado.custo_total,
          metodo_utilizado: params.metodo,
        })
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculadora-estimativas'] });
    },
  });

  // ── Histórico de estimativas da empresa ─────────────────────

  const historicoQuery = useQuery({
    queryKey: ['calculadora-estimativas', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('calculadora_estimativas')
        .select('id, valor_total, metodo_utilizado, created_at, obra_id, parametros')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return [];
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    // Estado de carregamento
    loading,
    error: error ? String(error) : null,

    // Dados brutos (úteis para admin)
    cubList: cubQuery.data ?? [],
    eapList: eapQuery.data ?? [],

    // Função principal de cálculo (síncrono após carregar)
    calcular,
    pronto: !loading && !error,

    // Salvar no banco
    salvar: salvarMutation.mutateAsync,
    salvando: salvarMutation.isPending,
    erroSalvar: salvarMutation.error ? String(salvarMutation.error) : null,

    // Histórico
    historico: historicoQuery.data ?? [],
    carregandoHistorico: historicoQuery.isLoading,
  };
}
