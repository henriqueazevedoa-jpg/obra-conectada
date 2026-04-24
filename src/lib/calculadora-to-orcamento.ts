// ============================================================
// calculadora-to-orcamento.ts — Importa estimativa para obra
// Sprint 5 / Bloco 16
//
// Schema verificado:
//   orcamento_versoes: numero_versao (não numero), origem, parametros_calculadora, calculadora_estimativa_id
//   orcamento_categorias: obra_id, nome, preco_total, versao_id, estimado_valor, codigo
// ============================================================

import { supabase } from '@/integrations/supabase/untyped';
import type { CalculadoraResultado, CalculadoraParams, MetodoCalculo } from '@/types/calculadora';

function origemFromMetodo(m: MetodoCalculo): string {
  if (m === 'a_cub_simplificado') return 'calculadora_a';
  if (m === 'b_hibrido') return 'calculadora_b';
  return 'calculadora_c';
}

export async function criarOrcamentoDeEstimativa(
  resultado: CalculadoraResultado,
  params: CalculadoraParams,
  obraId: string,
  estimativaId?: string
): Promise<{ versaoId: string; erro?: string }> {
  try {
    // ── 1. Próximo número de versão ───────────────────────────
    const { data: versoes } = await (supabase as any)
      .from('orcamento_versoes')
      .select('numero_versao')
      .eq('obra_id', obraId)
      .order('numero_versao', { ascending: false })
      .limit(1);

    const proximoNumero = versoes && versoes.length > 0
      ? (versoes[0].numero_versao ?? 0) + 1
      : 1;

    // ── 2. Inserir versão ─────────────────────────────────────
    const { data: versaoData, error: versaoErr } = await (supabase as any)
      .from('orcamento_versoes')
      .insert({
        obra_id: obraId,
        numero_versao: proximoNumero,
        tipo: 'estimativo',
        status: 'rascunho',
        origem: origemFromMetodo(params.metodo),
        parametros_calculadora: params,
        calculadora_estimativa_id: estimativaId ?? null,
        valor_total: resultado.custo_total,
        descricao: `Estimativa gerada pela Calculadora — ${new Date().toLocaleDateString('pt-BR')}`,
      })
      .select('id')
      .single();

    if (versaoErr) throw new Error(versaoErr.message);
    const versaoId: string = versaoData.id;

    // ── 3. Inserir etapas em orcamento_categorias ─────────────
    const todasEtapas = [
      ...resultado.etapas_base,
      ...resultado.etapas_sinapi,
      ...resultado.etapas_adicionais,
    ];

    if (todasEtapas.length > 0) {
      const categoriasPayload = todasEtapas.map((etapa, idx) => ({
        obra_id: obraId,
        versao_id: versaoId,
        codigo: String(idx + 1).padStart(2, '0'),
        nome: etapa.nome,
        preco_total: etapa.valor,
        estimado_valor: etapa.valor,
        usa_composicoes: false,
      }));

      const { error: catErr } = await (supabase as any)
        .from('orcamento_categorias')
        .insert(categoriasPayload);

      if (catErr) {
        // Não falha — versão já foi criada; apenas loga o erro de categorias
        console.warn('[calculadora-to-orcamento] Erro ao inserir categorias:', catErr.message);
      }
    }

    // ── 4. Atualizar obra com área e prazo (se ainda nulos) ───
    await (supabase as any)
      .from('obras')
      .update({
        area_construida: params.area_construida_m2,
        prazo_semanas: resultado.prazo_semanas,
      })
      .eq('id', obraId)
      .is('area_construida', null); // só atualiza se ainda não preenchido

    return { versaoId };
  } catch (e: any) {
    return { versaoId: '', erro: e.message ?? 'Erro desconhecido' };
  }
}
