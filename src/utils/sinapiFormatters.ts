const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatCompetencia(c: string | undefined | null) {
  if (!c) return '';
  const [ano, mes] = c.split('-');
  if (!ano || !mes) return c;
  return `${nomes[parseInt(mes) - 1]}/${ano.slice(2)}`;
}
