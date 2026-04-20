/**
 * Helpers para categorias de especialidade de cotação.
 * Sem dependências React — pode ser importado em qualquer contexto.
 */

// ─── Tipo ────────────────────────────────────────────────────────────────────

export interface CotacaoCategoria {
  id: string;
  company_id: string;
  nome: string;
  codigo: string;
  emoji: string;
  keywords: string[];
  is_default: boolean;
}

// Categorias padrão usadas como fallback offline / antes do carregamento do banco
export const CATEGORIAS_DEFAULT: Omit<CotacaoCategoria, 'id' | 'company_id'>[] = [
  { nome: 'Estrutura e Concreto',        codigo: 'estrutura',     emoji: '🏗️', is_default: true,
    keywords: ['concreto','fck','fundacao','estaca','pilar','viga','laje','bloco de concreto'] },
  { nome: 'Alvenaria e Blocos',          codigo: 'alvenaria',     emoji: '🧱', is_default: true,
    keywords: ['alvenaria','bloco','tijolo','argamassa','reboco','gesso projeta'] },
  { nome: 'Ferragens e Aço',             codigo: 'ferragens',     emoji: '⚙️', is_default: true,
    keywords: ['aco','ca-50','ca-60','tela soldada','ferragem','armacao','pregos','parafusos'] },
  { nome: 'Instalações Hidráulicas',     codigo: 'hidraulica',    emoji: '💧', is_default: true,
    keywords: ['hidraulica','pvc','tubo','registro','caixa dagua','esgoto','conexao','joelho','tee'] },
  { nome: 'Instalações Elétricas',       codigo: 'eletrica',      emoji: '⚡', is_default: true,
    keywords: ['eletrica','fio','cabo','disjuntor','spda','tomada','interruptor','quadro','eletroduto'] },
  { nome: 'Madeiras e Formas',           codigo: 'madeiras',      emoji: '🪵', is_default: true,
    keywords: ['madeira','forma','escoramento','compensado','eucalipto','pinus','mdf'] },
  { nome: 'Revestimentos e Acabamentos', codigo: 'revestimentos', emoji: '🪟', is_default: true,
    keywords: ['revestimento','piso','ceramica','porcelanato','pintura','gesso','azulejo','tinta','verniz'] },
  { nome: 'Terraplanagem e Solo',        codigo: 'terraplanagem', emoji: '🪨', is_default: true,
    keywords: ['terraplanagem','aterro','escavacao','compactacao','solo','brita','areia','rachao'] },
  { nome: 'Equipamentos e Locação',      codigo: 'equipamentos',  emoji: '🚜', is_default: true,
    keywords: ['locacao','equipamento','andaime','grua','betoneira','helice','retroescavadeira','caminhao'] },
  { nome: 'Outros materiais',            codigo: 'outros',        emoji: '📦', is_default: true,
    keywords: [] },
];

// ─── Normalização de texto ────────────────────────────────────────────────────

/**
 * Normaliza texto para comparação: lowercase + remove acentos + mantém só
 * alfanuméricos e espaços. Permite matching sem precisar do unaccent do PG.
 *
 * Exemplos:
 *   "Fundação"    → "fundacao"
 *   "Hélice Contínua" → "helice continua"
 *   "FCK 25MPa"   → "fck 25mpa"
 */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove marcas de acento decompostas
    .replace(/[^a-z0-9\s/-]/g, '')   // mantém alfanumérico, espaço, hífen e barra
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Inferência de categoria ──────────────────────────────────────────────────

/**
 * Infere a categoria de especialidade para um item do orçamento baseado
 * no nome/descrição da composição ou etapa.
 *
 * Estratégia: score = número de keywords que fazem match. Retorna a categoria
 * com maior score (melhor match). Em empate, a ordem do array decide.
 *
 * Retorna `null` se nenhuma keyword foi encontrada.
 *
 * @param nomeComposicao - Descrição do item do orçamento (composição ou etapa)
 * @param categorias - Lista de categorias carregadas do banco (ou CATEGORIAS_DEFAULT)
 */
export function inferirCategoria(
  nomeComposicao: string,
  categorias: Pick<CotacaoCategoria, 'codigo' | 'keywords'>[],
): string | null {
  if (!nomeComposicao || categorias.length === 0) return null;

  const normalizado = normalizeForMatch(nomeComposicao);

  let bestCodigo: string | null = null;
  let bestScore = 0;

  for (const cat of categorias) {
    if (cat.keywords.length === 0) continue; // "outros" nunca faz match automático

    const score = cat.keywords.reduce((acc, kw) => {
      return acc + (normalizado.includes(normalizeForMatch(kw)) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestCodigo = cat.codigo;
    }
  }

  return bestScore > 0 ? bestCodigo : null;
}

/**
 * Infere a categoria e retorna o objeto CotacaoCategoria completo.
 * Útil quando se precisa do emoji e do nome para exibição.
 */
export function inferirCategoriaObj(
  nomeComposicao: string,
  categorias: CotacaoCategoria[],
): CotacaoCategoria | null {
  const codigo = inferirCategoria(nomeComposicao, categorias);
  if (!codigo) return null;
  return categorias.find(c => c.codigo === codigo) ?? null;
}

/**
 * Verifica se um nome de etapa ou composição tem match com um conjunto de
 * códigos de especialidade. Usado para filtrar itens do mapa de cotação.
 *
 * @param nomeItem - Nome da etapa/composição do orçamento
 * @param especialidades - Array de códigos de especialidade do fornecedor
 * @param categorias - Categorias carregadas do banco
 */
export function itemPertenceAEspecialidade(
  nomeItem: string,
  especialidades: string[],
  categorias: CotacaoCategoria[],
): boolean {
  if (especialidades.length === 0) return false;
  const categoriaInferida = inferirCategoria(nomeItem, categorias);
  if (!categoriaInferida) return false;
  return especialidades.includes(categoriaInferida);
}
