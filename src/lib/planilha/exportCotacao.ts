/**
 * exportCotacao.ts — Fase 4.1
 * Gera uma planilha .xlsx de cotação para ser enviada a fornecedores.
 *
 * Colunas: Código | Descrição | Unidade | Categoria | Preço Unitário | Observações
 */

import * as XLSX from 'xlsx';

export interface InsumoPendenteExport {
  id: string;
  nome_insumo: string;
  unidade: string | null;
  categoria: string | null;
  observacoes: string | null;
}

const categoriaLabel: Record<string, string> = {
  material: 'Material',
  mao_de_obra: 'Mão de Obra',
  equipamento: 'Equipamento',
  servico: 'Serviço',
  outro: 'Outro',
};

export function exportarPlanilhaCotacao(
  insumos: InsumoPendenteExport[],
  obraNome: string,
  fornecedorNome?: string,
): void {
  const hoje = new Date().toLocaleDateString('pt-BR');

  // Cabeçalho de identificação
  const header = [
    [`Planilha de Cotação — ${obraNome}`],
    [`Data: ${hoje}${fornecedorNome ? `  |  Fornecedor: ${fornecedorNome}` : ''}`],
    [],
    ['Código', 'Descrição', 'Unidade', 'Categoria', 'Preço Unitário (R$)', 'Observações', 'ID_SISTEMA'],
  ];

  // Linhas de dados
  const rows = insumos.map((item, idx) => [
    `COT-${String(idx + 1).padStart(3, '0')}`,
    item.nome_insumo,
    item.unidade || '',
    categoriaLabel[item.categoria || ''] || item.categoria || '',
    '', // Preço a ser preenchido pelo fornecedor
    item.observacoes || '',
    item.id, // ID_SISTEMA para retorno íntegro
  ]);

  // Monta a worksheet
  const wsData = [...header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Largura das colunas
  ws['!cols'] = [
    { wch: 12 }, // Código
    { wch: 40 }, // Descrição
    { wch: 10 }, // Unidade
    { wch: 15 }, // Categoria
    { wch: 20 }, // Preço
    { wch: 30 }, // Observações
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cotação');

  const nomeArquivo = `cotacao_${obraNome.replace(/\s+/g, '_').toLowerCase()}_${hoje.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}
