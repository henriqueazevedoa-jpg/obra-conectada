import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OrcamentoVersao {
  id: string;
  numero_versao: string;
  tipo: string;
  status: string;
  valor_total: number;
}

export interface OrcamentoCategoriaImport {
  id: string;
  nome: string;
  codigo: string | null;
  parent_id: string | null;
  versao_id: string | null;
  nivel: number;          // calculado (1-based)
  ordem: number;
  valor_total: number;
  filhos: OrcamentoCategoriaImport[];
  composicoes: OrcamentoComposicaoImport[];
}

export interface OrcamentoComposicaoImport {
  id: string;
  etapa_id: string;
  codigo: string | null;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  preco_total: number;
}

/** Descreve um nível de importação disponível */
export interface NivelImportacao {
  profundidade: number;        // até qual nível importar (1 = só raiz, 2 = + filhos, 3 = + composições)
  label: string;               // ex: "Só etapas (12 itens)"
  descricao: string;
  totalItens: number;
  incluiComposicoes: boolean;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Monta árvore recursiva a partir de lista plana */
function buildTree(
  flat: any[],
  parentId: string | null,
  nivel: number,
  composicoesMap: Map<string, OrcamentoComposicaoImport[]>
): OrcamentoCategoriaImport[] {
  return flat
    .filter(c => (c.parent_id ?? null) === parentId)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map(c => ({
      id: c.id,
      nome: c.nome,
      codigo: c.codigo ?? null,
      parent_id: c.parent_id ?? null,
      versao_id: c.versao_id ?? null,
      nivel,
      ordem: c.ordem ?? 0,
      valor_total: Number(c.preco_total || 0),
      composicoes: composicoesMap.get(c.id) ?? [],
      filhos: buildTree(flat, c.id, nivel + 1, composicoesMap),
    }));
}

/** Profundidade máxima da árvore de categorias */
function maxDepthTree(nodes: OrcamentoCategoriaImport[]): number {
  if (!nodes.length) return 0;
  return Math.max(...nodes.map(n => n.filhos.length > 0 ? maxDepthTree(n.filhos) : n.nivel));
}

/** Conta itens até uma profundidade máxima */
function countUpToDepth(nodes: OrcamentoCategoriaImport[], maxNivel: number, incluiComp: boolean): number {
  let total = 0;
  for (const n of nodes) {
    if (n.nivel <= maxNivel) {
      total += 1;
      if (n.filhos.length) total += countUpToDepth(n.filhos, maxNivel, incluiComp);
      if (incluiComp && n.nivel === maxNivel) total += n.composicoes.length;
    }
  }
  return total;
}

/** Flatten da árvore até profundidade máxima, incluindo composições se pedido */
function flattenUpToDepth(
  nodes: OrcamentoCategoriaImport[],
  maxNivel: number,
  incluiComp: boolean
): Array<{ cat: OrcamentoCategoriaImport; comp?: OrcamentoComposicaoImport }> {
  const result: Array<{ cat: OrcamentoCategoriaImport; comp?: OrcamentoComposicaoImport }> = [];
  for (const n of nodes) {
    if (n.nivel > maxNivel) continue;
    result.push({ cat: n });
    if (n.filhos.length) result.push(...flattenUpToDepth(n.filhos, maxNivel, incluiComp));
    if (incluiComp && n.nivel === maxNivel) {
      n.composicoes.forEach(c => result.push({ cat: n, comp: c }));
    }
  }
  return result;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCronogramaImport(obraId: string | undefined) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  /** Busca versões disponíveis do orçamento para esta obra */
  const fetchVersoes = useCallback(async (): Promise<OrcamentoVersao[]> => {
    if (!obraId) return [];
    const { data, error } = await (supabase as any)
      .from('orcamento_versoes')
      .select('id, numero_versao, tipo, status, valor_total')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao buscar versões', description: error.message, variant: 'destructive' });
      return [];
    }
    return (data || []) as OrcamentoVersao[];
  }, [obraId]);

  /**
   * Busca categorias + composições da versão, monta árvore e retorna:
   * - a árvore completa
   * - os níveis de importação disponíveis (adaptados ao estado real do orçamento)
   */
  const fetchEstrutura = useCallback(async (versaoId: string): Promise<{
    arvore: OrcamentoCategoriaImport[];
    niveisDisponiveis: NivelImportacao[];
    maxCatNivel: number;
    temComposicoes: boolean;
  }> => {
    if (!obraId || !versaoId) return { arvore: [], niveisDisponiveis: [], maxCatNivel: 0, temComposicoes: false };
    setLoading(true);
    try {
      // 1. Busca todas as categorias da versão
      const { data: cats, error: errCats } = await (supabase as any)
        .from('orcamento_categorias')
        .select('id, nome, codigo, parent_id, versao_id, ordem, preco_total')
        .eq('versao_id', versaoId)
        .order('ordem', { ascending: true, nullsFirst: false });
      if (errCats) throw errCats;

      const catIds = (cats || []).map((c: any) => c.id);

      // 2. Busca composições de todas as categorias de uma vez
      let composicoesMap = new Map<string, OrcamentoComposicaoImport[]>();
      if (catIds.length > 0) {
        const { data: comps, error: errComp } = await (supabase as any)
          .from('orcamento_composicoes')
          .select('id, etapa_id, codigo, descricao, unidade, quantidade, preco_total')
          .in('etapa_id', catIds);
        if (!errComp && comps) {
          for (const c of comps) {
            const list = composicoesMap.get(c.etapa_id) ?? [];
            list.push({
              id: c.id,
              etapa_id: c.etapa_id,
              codigo: c.codigo ?? null,
              descricao: c.descricao,
              unidade: c.unidade ?? null,
              quantidade: Number(c.quantidade || 0),
              preco_total: Number(c.preco_total || 0),
            });
            composicoesMap.set(c.etapa_id, list);
          }
        }
      }

      // 3. Monta árvore recursiva
      const arvore = buildTree(cats || [], null, 1, composicoesMap);

      // 4. Calcula profundidade máxima das categorias
      const maxCatNivel = maxDepthTree(arvore);
      const temComposicoes = composicoesMap.size > 0 && Array.from(composicoesMap.values()).some(v => v.length > 0);

      // 5. Monta níveis de importação disponíveis
      const niveisDisponiveis: NivelImportacao[] = [];

      for (let d = 1; d <= maxCatNivel; d++) {
        const total = countUpToDepth(arvore, d, false);
        const isLeafLevel = d === maxCatNivel;
        const label = d === 1
          ? `Nível 1 — Apenas etapas principais`
          : `Níveis 1–${d} — Etapas e sub-etapas`;
        niveisDisponiveis.push({
          profundidade: d,
          label: `${label} (${total} ${total === 1 ? 'item' : 'itens'})`,
          descricao: d === 1
            ? 'Importa somente a estrutura principal do orçamento.'
            : 'Importa a hierarquia completa de categorias até este nível.',
          totalItens: total,
          incluiComposicoes: false,
        });

        // No nível folha das categorias, adiciona opção com composições
        if (isLeafLevel && temComposicoes) {
          const totalComComp = countUpToDepth(arvore, d, true);
          niveisDisponiveis.push({
            profundidade: d,
            label: `Estrutura completa com composições (${totalComComp} ${totalComComp === 1 ? 'item' : 'itens'})`,
            descricao: 'Importa toda a hierarquia de etapas mais as composições de cada etapa folha.',
            totalItens: totalComComp,
            incluiComposicoes: true,
          });
        }
      }

      // Se não há categorias com níveis intermediários mas tem composições, oferece opção simples
      if (niveisDisponiveis.length === 0 && temComposicoes) {
        const total1 = countUpToDepth(arvore, 1, false);
        const totalComp = countUpToDepth(arvore, 1, true);
        niveisDisponiveis.push(
          { profundidade: 1, label: `Só etapas (${total1} itens)`, descricao: 'Importa somente as etapas.', totalItens: total1, incluiComposicoes: false },
          { profundidade: 1, label: `Etapas + composições (${totalComp} itens)`, descricao: 'Importa etapas e suas composições.', totalItens: totalComp, incluiComposicoes: true },
        );
      }

      return { arvore, niveisDisponiveis, maxCatNivel, temComposicoes };
    } catch (err: any) {
      console.error('[useCronogramaImport.fetchEstrutura]', err);
      toast({ title: 'Erro ao carregar estrutura', description: err.message, variant: 'destructive' });
      return { arvore: [], niveisDisponiveis: [], maxCatNivel: 0, temComposicoes: false };
    } finally {
      setLoading(false);
    }
  }, [obraId]);

  /**
   * Executa a importação:
   * - Insere categorias em ordem de nível (primeiro os pais)
   * - Registra o mapeamento categId → tarefaId para montar parent_tarefa_id dos filhos
   * - Se incluiComposicoes, insere composições como filhos das categorias folha
   */
  const importarHierarquia = useCallback(async (
    arvore: OrcamentoCategoriaImport[],
    nivel: NivelImportacao,
  ): Promise<boolean> => {
    if (!obraId) return false;
    setLoading(true);

    try {
      // Flatten na ordem correta (pai antes do filho)
      const items = flattenUpToDepth(arvore, nivel.profundidade, nivel.incluiComposicoes);
      if (items.length === 0) {
        toast({ title: 'Nenhum item para importar', variant: 'destructive' });
        return false;
      }

      const valorTotal = items.reduce((s, item) => {
        return s + (item.comp ? item.comp.preco_total : item.cat.valor_total);
      }, 0);

      // Mapa: orcamento_categoria_id → cronograma_tarefa_id
      const catToTarefaId = new Map<string, string>();

      // Ordem de inserção: categorias em ordem de nível crescente, depois composições
      const categorias = items.filter(i => !i.comp);
      const composicoes = items.filter(i => !!i.comp);

      // Insere categorias nível por nível para garantir que o pai exista antes do filho
      const maxNivel = nivel.profundidade;
      for (let n = 1; n <= maxNivel; n++) {
        const doNivel = categorias.filter(i => i.cat.nivel === n);
        for (const item of doNivel) {
          const { cat } = item;
          const parentTarefaId = cat.parent_id ? (catToTarefaId.get(cat.parent_id) ?? null) : null;
          const peso = valorTotal > 0 ? cat.valor_total / valorTotal : 0;
          const { data: inserted, error } = await (supabase as any)
            .from('cronograma_tarefas')
            .insert({
              obra_id: obraId,
              nome: cat.nome,
              tipo_tarefa: 'RESUMO',
              nivel: cat.nivel,
              ordem: cat.ordem,
              parent_tarefa_id: parentTarefaId,
              peso_orcamento: peso,
              orcamento_categoria_id: cat.id,
              percentual_concluido: 0,
              status: 'nao_iniciada',
              pode_editar_datas: true,
            })
            .select('id')
            .single();
          if (error) throw error;
          catToTarefaId.set(cat.id, inserted.id);
        }
      }

      // Insere composições como filhos da tarefa correspondente
      if (nivel.incluiComposicoes) {
        let ordemComp = 1;
        for (const item of composicoes) {
          const { cat, comp } = item;
          const parentTarefaId = catToTarefaId.get(cat.id) ?? null;
          const peso = valorTotal > 0 ? comp!.preco_total / valorTotal : 0;
          const { error } = await (supabase as any)
            .from('cronograma_tarefas')
            .insert({
              obra_id: obraId,
              nome: comp!.descricao,
              tipo_tarefa: 'PADRAO',
              nivel: nivel.profundidade + 1,
              ordem: ordemComp++,
              parent_tarefa_id: parentTarefaId,
              peso_orcamento: peso,
              orcamento_composicao_id: comp!.id,
              unidade: comp!.unidade,
              quantidade_prevista: comp!.quantidade,
              percentual_concluido: 0,
              status: 'nao_iniciada',
              pode_editar_datas: true,
            });
          if (error) throw error;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['cronograma', obraId] });
      toast({
        title: 'Importação concluída',
        description: `${items.length} ${items.length === 1 ? 'item importado' : 'itens importados'} com sucesso.`,
      });
      return true;
    } catch (err: any) {
      console.error('[useCronogramaImport.importarHierarquia]', err);
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [obraId, queryClient]);

  return { fetchVersoes, fetchEstrutura, importarHierarquia, loading };
}
