// ============================================================
// useCalculadoraAcesso — Controle de features por plano
// Sprint 3 / Bloco 21
//
// Resolve quais funcionalidades da calculadora o usuário
// tem acesso com base no plano da empresa (plans.slug).
//
// Mapeamento:
//   start       → Métodos A+B+C (Lastra), 5 est/mês, sem PDF, sem salvar
//   pro         → Métodos A+B+C (Lastra), ilimitado, PDF, salvar
//   enterprise  → Métodos A+B+C (Lastra), ilimitado, PDF, salvar
//
// Regra de acesso ao Método C:
//   Qualquer usuário com empresa (Lastra) → metodo_c: true
//   Usuário sem empresa (público guest)   → metodo_c: false
// ============================================================

import { useMemo } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import type { AcessoCalculadora } from '@/types/calculadora';

// ─────────────────────────────────────────────────────────────
// Mapa de permissões por slug de plano
// ─────────────────────────────────────────────────────────────

type PermissaoPlano = Omit<AcessoCalculadora, 'estimativas_usadas' | 'plano_slug'>;

const PERMISSOES_POR_PLANO: Record<string, PermissaoPlano> = {
  // Correção 1: metodo_c liberado para todos os planos com empresa (Lastra)
  // Correção 2: pro agora é ilimitado (limite_mensal: null)
  start: {
    metodo_a: true,
    metodo_b: false,
    metodo_c: true,  // Lastra — acesso completo independente do plano
    pdf: false,
    salvar_estimativa: false,
    limite_mensal: 5,
  },
  pro: {
    metodo_a: true,
    metodo_b: true,
    metodo_c: true,  // Lastra — acesso completo independente do plano
    pdf: true,
    salvar_estimativa: true,
    limite_mensal: null, // Ilimitado
  },
  enterprise: {
    metodo_a: true,
    metodo_b: true,
    metodo_c: true,
    pdf: true,
    salvar_estimativa: true,
    limite_mensal: null,
  },
};

// Fallback para usuário sem empresa (calculadora pública / não logado)
// metodo_c: false — Método C exige estar logado com empresa
const PERMISSOES_GUEST: PermissaoPlano = {
  metodo_a: true,
  metodo_b: false,
  metodo_c: false,
  pdf: false,
  salvar_estimativa: false,
  limite_mensal: 3,
};

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────

export function useCalculadoraAcesso(): AcessoCalculadora {
  const { company, plan } = useCompany();

  return useMemo<AcessoCalculadora>(() => {
    // Usuário não logado ou sem empresa = permissões de guest
    if (!company) {
      return {
        ...PERMISSOES_GUEST,
        estimativas_usadas: 0,
        plano_slug: null,
      };
    }

    // Normalizar slug do plano para lowercase
    const planSlug = (plan as any)?.slug?.toLowerCase?.() ?? null;
    const permissoes = (planSlug && PERMISSOES_POR_PLANO[planSlug])
      ? PERMISSOES_POR_PLANO[planSlug]
      : PERMISSOES_GUEST;

    return {
      ...permissoes,
      estimativas_usadas: 0, // TODO: buscar de calculadora_contas quando necessário
      plano_slug: planSlug,
    };
  }, [company, plan]);
}

// ─────────────────────────────────────────────────────────────
// HELPER: mensagem de upgrade
// ─────────────────────────────────────────────────────────────

export function getMensagemUpgrade(feature: keyof AcessoCalculadora): string {
  const mensagens: Partial<Record<keyof AcessoCalculadora, string>> = {
    metodo_b:          'O Método Híbrido (SINAPI) está disponível no plano Pro.',
    metodo_c:          'O Método por Quantitativos está disponível no plano Enterprise.',
    pdf:               'A exportação de PDF está disponível no plano Pro.',
    salvar_estimativa: 'Salvar estimativas está disponível no plano Pro.',
  };
  return mensagens[feature] ?? 'Este recurso não está disponível no seu plano atual.';
}
