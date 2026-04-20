/**
 * importCotacao.ts — Fase 4.2
 * Lê uma planilha .xlsx preenchida por fornecedores e extrai os preços.
 *
 * Formato esperado da planilha (gerado por exportarPlanilhaCotacao):
 *   Linha 1: Título (ignorada)
 *   Linha 2: Info da obra (ignorada)
 *   Linha 3: Vazia (ignorada)
 *   Linha 4: Cabeçalhos — Código | Descrição | Unidade | Categoria | Preço Unitário | Observações
 *   Linha 5+: Dados
 */

import * as XLSX from 'xlsx';

export interface CotacaoImportada {
  codigo: string;       // COT-001
  descricao: string;    // Nome do insumo
  unidade: string;
  preco: number | null; // null = não preenchido
  observacoes: string;
  id: string; // ID_SISTEMA
}

export interface ImportCotacaoResult {
  rows: CotacaoImportada[];
  totalLinhas: number;
  totalComPreco: number;
  totalSemPreco: number;
  erro?: string;
}

export function importarPlanilhaCotacao(file: File): Promise<ImportCotacaoResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];

        // Pula as 4 primeiras linhas (título, info, vazia, cabeçalhos)
        const dataRows = raw.slice(4).filter(row => row[0]?.toString().trim().startsWith('COT-'));

        const rows: CotacaoImportada[] = dataRows.map(row => {
          const precoRaw = row[4]?.toString().trim().replace(',', '.');
          const preco = precoRaw ? parseFloat(precoRaw) : null;
          return {
            codigo: row[0]?.toString().trim() || '',
            descricao: row[1]?.toString().trim() || '',
            unidade: row[2]?.toString().trim() || '',
            preco: preco && !isNaN(preco) ? preco : null,
            observacoes: row[5]?.toString().trim() || '',
            id: row[6]?.toString().trim() || '', // Coluna G
          };
        });

        const totalComPreco = rows.filter(r => r.preco !== null && r.preco > 0).length;

        resolve({
          rows,
          totalLinhas: rows.length,
          totalComPreco,
          totalSemPreco: rows.length - totalComPreco,
        });
      } catch (err) {
        resolve({
          rows: [],
          totalLinhas: 0,
          totalComPreco: 0,
          totalSemPreco: 0,
          erro: err instanceof Error ? err.message : 'Erro desconhecido ao ler arquivo',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
