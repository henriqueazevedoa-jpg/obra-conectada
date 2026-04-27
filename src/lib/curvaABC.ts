/**
 * curvaABC.ts — Função pura compartilhada para classificação Curva ABC
 *
 * Usada por OrcamentoDashboard (visual) e CotacaoCentral (filtro "Cotar A").
 * A chave de cada item segue o mesmo padrão de extrairItens():
 *   - Insumos: `${composicao.id}::${insumo.id}`
 *   - Composição simples: composicao.id
 */

import type { OrcamentoEtapa, OrcamentoComposicao } from '@/contexts/OrcamentoContext';

export type AbcClasse = 'A' | 'B' | 'C';
export type AbcSource = 'todos' | 'insumos' | 'composicoes';

export interface AbcItem {
  /** Chave única — mesma convenção de extrairItens() */
  key: string;
  descricao: string;
  valor: number;
  classe: AbcClasse;
  rank: number;
  pctItem: number;
  pctAcumulado: number;
  fonte: 'insumos' | 'composicoes';
}

/**
 * Classifica todos os itens do orçamento segundo a Curva ABC.
 *
 * Critérios padrão do mercado:
 *   - Classe A: primeiros itens que somam até 80% do custo total
 *   - Classe B: próximos itens que levam o acumulado de 80% a 95%
 *   - Classe C: demais itens (5% restantes)
 *
 * @param etapas  Array de etapas do OrcamentoContext
 * @param source  'todos' (default), 'insumos', ou 'composicoes'
 * @returns       Array ordenado desc por valor, cada item com classe e posição
 */
export function classificarCurvaABC(
  etapas: OrcamentoEtapa[],
  source: AbcSource = 'todos',
): AbcItem[] {
  const raw: { key: string; descricao: string; valor: number; fonte: 'insumos' | 'composicoes' }[] = [];

  for (const etapa of etapas) {
    for (const item of etapa.items || []) {
      if (item.tipo === 'etapa') continue;
      const comp = item as OrcamentoComposicao;
      if (comp.usaInsumos && comp.insumos?.length) {
        for (const ins of comp.insumos) {
          const valor = ins.precoTotal ?? 0;
          if (valor > 0) {
            raw.push({
              key: `${comp.id}::${ins.id}`,
              descricao: ins.descricao || ins.codigo || '',
              valor,
              fonte: 'insumos',
            });
          }
        }
      } else {
        const valor = comp.precoTotal ?? 0;
        if (valor > 0) {
          raw.push({
            key: comp.id,
            descricao: comp.descricao || comp.codigo || '',
            valor,
            fonte: 'composicoes',
          });
        }
      }
    }
  }

  // Aplicar filtro de fonte
  const filtrados = source === 'todos' ? raw : raw.filter(i => i.fonte === source);

  // Ordenar desc por valor
  filtrados.sort((a, b) => b.valor - a.valor);

  const total = filtrados.reduce((s, i) => s + i.valor, 0);
  let acumulado = 0;

  return filtrados.map((item, idx) => {
    acumulado += item.valor;
    const pct = total > 0 ? (acumulado / total) * 100 : 0;
    const classe: AbcClasse = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
    return {
      ...item,
      rank: idx + 1,
      pctItem: total > 0 ? (item.valor / total) * 100 : 0,
      pctAcumulado: parseFloat(pct.toFixed(1)),
      classe,
    };
  });
}

/**
 * Retorna um Set com as keys dos itens classificados como Classe A.
 * Atalho conveniente para uso no filtro do CotacaoCentral.
 */
export function getClasseAKeys(etapas: OrcamentoEtapa[]): Set<string> {
  const abc = classificarCurvaABC(etapas);
  return new Set(abc.filter(i => i.classe === 'A').map(i => i.key));
}
