// ── Grid principal da planilha ────────────────────────────────────────────────
// Usado por EtapaBlock, ComposicaoRow e InsumoRowDense.
// Nunca hardcodar grid-template-columns diretamente nos componentes — sempre
// importar PLANILHA_GRID daqui. (AD-011)

export const PLANILHA_COLS = {
  descricao: '45fr',
  tipo:      '5fr',
  un:        '5fr',
  qtd:       '7fr',
  punit:     '8fr',
  ptotal:    '15fr',
  acoes:     '15fr',
};

export const PLANILHA_GRID =
  "grid-cols-[45fr_5fr_5fr_7fr_8fr_15fr_15fr]";


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
  bg: string;
  bgDark: string;
  bgColor: string;        // cor inline para style={}
  borderColor: string;
  fontSize: number;
  fontWeight: number;
  textTransform: 'uppercase' | 'none';
  letterSpacing: string;
}

export const NIVEL_VISUAL: NivelVisual[] = [
  // nivel 0 — Superetapa
  {
    bg: '',
    bgDark: '',
    bgColor: '#d8d4ee',
    borderColor: '#6d28d9',
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  // nivel 1 — Etapa (padrão atual)
  {
    bg: '',
    bgDark: '',
    bgColor: '#e8e6f0',
    borderColor: '#7c3aed',
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  },
  // nivel 2 — Subetapa
  {
    bg: '',
    bgDark: '',
    bgColor: '#f0eef8',
    borderColor: '#a78bfa',
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'none',
    letterSpacing: '0.01em',
  },
  // nivel 3 — Nível extra (fallback)
  {
    bg: '',
    bgDark: '',
    bgColor: '#f5f3fb',
    borderColor: '#c4b5fd',
    fontSize: 12,
    fontWeight: 400,
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
    indentStyle: { paddingLeft: (nivel - 1) * 16 } as React.CSSProperties,
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
