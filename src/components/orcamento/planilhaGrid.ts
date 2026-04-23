export const PLANILHA_COLS = {
  descricao: 'minmax(0,1fr)',
  un:        '64px',
  qtd:       '80px',
  punit:     '96px',
  ptotal:    '96px',
  acoes:     '80px',
};

export const PLANILHA_GRID = `grid-cols-[${Object.values(PLANILHA_COLS).join('_')}]`;
