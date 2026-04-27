// ── Grid principal da planilha ────────────────────────────────────────────────
// Usado por EtapaBlock, ComposicaoRow e InsumoRowDense.
// Nunca hardcodar grid-template-columns diretamente nos componentes — sempre
// importar PLANILHA_GRID daqui. (AD-011)

export const PLANILHA_FLEX_ROW = "flex items-stretch w-full planilha-row";

export const CELL_DESC = "cell-desc shrink-0 border-r border-border/60 flex items-center";
export const CELL_TIPO = "cell-tipo shrink-0 border-r border-border/60 flex items-center justify-center";
export const CELL_UN = "cell-un shrink-0 border-r border-border/60 flex items-center justify-center";
export const CELL_QTD = "cell-qtd shrink-0 border-r border-border/60 flex items-center justify-end px-1";
export const CELL_PUNIT = "cell-punit shrink-0 border-r border-border/60 flex items-center justify-end px-1";
export const CELL_TOTAL = "cell-total shrink-0 border-r border-border/60 flex items-center justify-end px-3";
export const CELL_ACOES = "cell-acoes shrink-0 flex items-center justify-end px-2";


// ── Sistema de N níveis hierárquicos ─────────────────────────────────────────
//
// Decisão de arquitetura: novos níveis funcionam como agrupamentos.
//   nivel 0 → Superetapa (agrupa etapas)
//   nivel 1 → Etapa (nível padrão atual)
//   nivel 2 → Subetapa (agrupa composições dentro da etapa)
//
// Valores dinâmicos (indent, z-index, sticky top) usam style inline para
// evitar restrições de purge do Tailwind com strings interpoladas.
// Valores estáticos (cores, tipografia) usam classes Tailwind normais.
//
// Máximo de 4 níveis visíveis. Estrutura de dados suporta N níveis.

export interface NivelVisual {
  bgClass: string;
  borderClass: string;
  fontSize: number;
  fontWeight: number;
  textTransform: 'uppercase' | 'none';
  letterSpacing: string;
}

export const NIVEL_VISUAL: NivelVisual[] = [
  // nivel 0 — Superetapa
  {
    bgClass: 'bg-slate-200 dark:bg-slate-800',
    borderClass: 'border-l-slate-500 dark:border-l-slate-400',
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  // nivel 1 — Etapa (padrão atual)
  {
    bgClass: 'bg-slate-100 dark:bg-slate-800/80',
    borderClass: 'border-l-slate-400 dark:border-l-slate-500',
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  },
  // nivel 2 — Subetapa
  {
    bgClass: 'bg-slate-50 dark:bg-slate-900',
    borderClass: 'border-l-slate-300 dark:border-l-slate-600',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: '0.01em',
  },
  // nivel 3 — Nível extra (fallback)
  {
    bgClass: 'bg-white dark:bg-slate-950',
    borderClass: 'border-l-slate-200 dark:border-l-slate-700',
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'none',
    letterSpacing: '0',
  },
];

// Altura fixa de cada linha de etapa em px — usada para calcular sticky top
export const NIVEL_ROW_HEIGHT = 40;

// Retorna os valores de layout calculados para um nível específico.
// Usar style inline para valores dinâmicos (indent, zIndex, top).
export function getNivelLayout(nivel: number) {
  const visual = NIVEL_VISUAL[nivel] ?? NIVEL_VISUAL[NIVEL_VISUAL.length - 1];

  // O top sticky de uma etapa depende de quantos níveis PAI ela tem acima.
  // nivel 1 (etapa raiz) → top: 0
  // nivel 2 (subetapa)   → top: 40px (abaixo da etapa pai)
  // nivel 3              → top: 80px (abaixo de dois níveis pai)
  // Fórmula: (nivel - 1) * NIVEL_ROW_HEIGHT
  const stickyTop = Math.max(0, (nivel - 1) * NIVEL_ROW_HEIGHT);

  return {
    visual,
    // style inline — dinâmico, não sofre purge do Tailwind
    stickyStyle: {
      top: stickyTop,
      zIndex: 40 - nivel * 10,
    } as React.CSSProperties,
    // Cabeçalho de colunas fica logo abaixo da linha de etapa
    headerStickyStyle: {
      top: stickyTop + NIVEL_ROW_HEIGHT,
      zIndex: 40 - nivel * 10 - 5,
    } as React.CSSProperties,
  };
}
