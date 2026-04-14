import 'dotenv/config';
import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const filePath = process.env.SINAPI_FILE_PATH;
const competencia = process.env.SINAPI_COMPETENCIA;

if (!filePath) throw new Error('SINAPI_FILE_PATH não definido');
if (!competencia) throw new Error('SINAPI_COMPETENCIA não definido');

const BATCH_SIZE_COMPOSICOES = 500;
const BATCH_SIZE_ITENS = 1000;
const BATCH_SIZE_INSUMOS = 1000;
const BATCH_SIZE_PRECOS = 2000;
const BATCH_SIZE_CUSTOS = 2000;

async function main() {
  console.log('Iniciando importação SINAPI...');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath);
  const nomeArquivo = filePath.split('/').pop();

  const referencia = await getOrCreateReferencia(nomeArquivo);
  console.log(`Referência ativa: ${referencia.id}`);

  await limparImportacaoAnterior(referencia.id);
  console.log('Dados anteriores da referência removidos.');

  await parseAnalitico(workbook, referencia.id);
  await parseInsumosISD(workbook, referencia.id);
  await parseCustosCSD(workbook, referencia.id);

  console.log('✅ SINAPI importada com sucesso');
}

async function getOrCreateReferencia(nomeArquivo) {
  const { data: existente, error: selectError } = await supabase
    .from('sinapi_referencias')
    .select('*')
    .eq('competencia', competencia)
    .eq('arquivo_nome', nomeArquivo)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existente) return existente;

  const { data, error } = await supabase
    .from('sinapi_referencias')
    .insert({
      competencia,
      arquivo_nome: nomeArquivo,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function limparImportacaoAnterior(referenciaId) {
  const tabelas = [
    'sinapi_composicao_custos',
    'sinapi_insumo_precos',
    'sinapi_insumos',
    'sinapi_composicao_itens',
    'sinapi_composicoes',
  ];

  for (const tabela of tabelas) {
    const { error } = await supabase
      .from(tabela)
      .delete()
      .eq('referencia_id', referenciaId);

    if (error) throw error;
  }
}

function normalizarChaves(obj) {
  const novo = {};

  for (const [key, value] of Object.entries(obj || {})) {
    const chave = String(key)
      .replace(/\r/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    novo[chave] = value;
  }

  return novo;
}

function valorNumerico(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return valor;

  const texto = String(valor)
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();

  const numero = Number(texto);
  return Number.isNaN(numero) ? null : numero;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function executarComRetry(fn, tentativas = 3, esperaMs = 1500) {
  let ultimoErro;

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      return await fn();
    } catch (error) {
      ultimoErro = error;
      console.log(
        `Tentativa ${tentativa}/${tentativas} falhou: ${error.message || error}`
      );

      if (tentativa < tentativas) {
        await new Promise((resolve) => setTimeout(resolve, esperaMs));
      }
    }
  }

  throw ultimoErro;
}

async function inserirEmLotes({
  tabela,
  dados,
  tamanhoLote,
  tipo,
  upsert = false,
  onConflict,
}) {
  if (!dados.length) {
    console.log(`${tipo}: nenhum registro para importar`);
    return;
  }

  const lotes = chunkArray(dados, tamanhoLote);

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i];

    await executarComRetry(async () => {
      let query = supabase.from(tabela);

      if (upsert) {
        query = query.upsert(lote, onConflict ? { onConflict } : undefined);
      } else {
        query = query.insert(lote);
      }

      const { error } = await query;
      if (error) throw error;
    });

    console.log(`${tipo}: lote ${i + 1}/${lotes.length} importado`);
  }
}

async function parseAnalitico(workbook, referenciaId) {
  const nomeAba = workbook.SheetNames.find((name) =>
    name.toLowerCase().includes('analítico')
  ) || workbook.SheetNames.find((name) =>
    name.toLowerCase().includes('anal')
  );

  if (!nomeAba) {
    throw new Error('Aba Analítico não encontrada');
  }

  const sheet = workbook.Sheets[nomeAba];

  const rows = xlsx.utils
    .sheet_to_json(sheet, { defval: null, range: 9 })
    .map(normalizarChaves);

  console.log(`Linhas lidas da aba ${nomeAba}: ${rows.length}`);

  let composicaoAtual = null;
  let ordem = 0;

  const composicoesMap = new Map();
  const itens = [];

  for (const row of rows) {
    const tipoRaw = row['Tipo Item'];
    const tipo = tipoRaw ? String(tipoRaw).trim() : '';

    const codigoComposicao = valorNumerico(row['Código da Composição']);
    const codigoItem = valorNumerico(row['Código do Item']);

    const descricao = row['Descrição']?.toString().trim() || null;
    const grupo = row['Grupo']?.toString().trim() || null;
    const unidade = row['Unidade']?.toString().trim() || null;
    const situacao = row['Situação']?.toString().trim() || null;
    const coeficiente = valorNumerico(row['Coeficiente']);

    if (tipo === '' && codigoComposicao && descricao) {
      composicaoAtual = codigoComposicao;
      ordem = 0;

      composicoesMap.set(`${referenciaId}-${composicaoAtual}`, {
        referencia_id: referenciaId,
        codigo: codigoComposicao,
        grupo,
        descricao,
        unidade,
        situacao,
      });

      continue;
    }

    if (tipo !== '' && composicaoAtual && codigoItem && descricao) {
      ordem++;

      itens.push({
        referencia_id: referenciaId,
        composicao_codigo: composicaoAtual,
        ordem,
        tipo_item: tipo.toUpperCase(),
        codigo_item: codigoItem,
        descricao_item: descricao,
        unidade,
        coeficiente,
        situacao,
      });
    }
  }

  const composicoes = Array.from(composicoesMap.values());

  console.log(`Composições preparadas: ${composicoes.length}`);
  console.log(`Itens preparados: ${itens.length}`);

  await inserirEmLotes({
    tabela: 'sinapi_composicoes',
    dados: composicoes,
    tamanhoLote: BATCH_SIZE_COMPOSICOES,
    tipo: 'Composições',
    upsert: true,
    onConflict: 'referencia_id,codigo',
  });

  await inserirEmLotes({
    tabela: 'sinapi_composicao_itens',
    dados: itens,
    tamanhoLote: BATCH_SIZE_ITENS,
    tipo: 'Itens',
  });
}

async function parseInsumosISD(workbook, referenciaId) {
  const sheet = workbook.Sheets['ISD'];

  if (!sheet) {
    throw new Error('Aba ISD não encontrada');
  }

  const rows = xlsx.utils
    .sheet_to_json(sheet, { defval: null, range: 9 })
    .map(normalizarChaves);

  console.log(`Linhas lidas da aba ISD: ${rows.length}`);

  if (!rows.length) {
    throw new Error('Nenhuma linha lida da aba ISD');
  }

  const colunas = Object.keys(rows[0] || {});
  const ufs = colunas.filter((col) => /^[A-Z]{2}$/.test(col));

  console.log(`UFs detectadas na ISD: ${ufs.join(', ')}`);

  const insumosMap = new Map();
  const precos = [];

  for (const row of rows) {
    const codigo = valorNumerico(row['Código do Insumo']);
    const descricao = row['Descrição do Insumo']?.toString().trim() || null;
    const unidade = row['Unidade']?.toString().trim() || null;
    const classificacao = row['Classificação']?.toString().trim() || null;
    const origemPreco = row['Origem de Preço']?.toString().trim() || null;

    if (!codigo || !descricao) continue;

    insumosMap.set(`${referenciaId}-${codigo}`, {
      referencia_id: referenciaId,
      codigo,
      descricao,
      unidade,
      classificacao,
      origem_preco: origemPreco,
    });

    for (const uf of ufs) {
      const preco = valorNumerico(row[uf]);
      if (preco === null) continue;

      precos.push({
        referencia_id: referenciaId,
        insumo_codigo: codigo,
        uf,
        regime: 'SEM_DESONERACAO',
        preco,
      });
    }
  }

  const insumos = Array.from(insumosMap.values());

  console.log(`Insumos preparados: ${insumos.length}`);
  console.log(`Preços preparados: ${precos.length}`);

  await inserirEmLotes({
    tabela: 'sinapi_insumos',
    dados: insumos,
    tamanhoLote: BATCH_SIZE_INSUMOS,
    tipo: 'Insumos',
    upsert: true,
    onConflict: 'referencia_id,codigo',
  });

  await inserirEmLotes({
    tabela: 'sinapi_insumo_precos',
    dados: precos,
    tamanhoLote: BATCH_SIZE_PRECOS,
    tipo: 'Preços',
    upsert: true,
    onConflict: 'referencia_id,insumo_codigo,uf,regime',
  });
}

async function parseCustosCSD(workbook, referenciaId) {
  const sheet = workbook.Sheets['CSD'];

  if (!sheet) {
    throw new Error('Aba CSD não encontrada');
  }

  const rows = xlsx.utils
    .sheet_to_json(sheet, { defval: null, range: 9 })
    .map(normalizarChaves);

  console.log(`Linhas lidas da aba CSD: ${rows.length}`);

  if (!rows.length) {
    throw new Error('Nenhuma linha lida da aba CSD');
  }

  const colunas = Object.keys(rows[0] || {});
  const ufs = colunas.filter((col) => /^[A-Z]{2}$/.test(col));

  console.log(`UFs detectadas na CSD: ${ufs.join(', ')}`);

  const custos = [];

  for (const row of rows) {
    const composicaoCodigo = valorNumerico(row['Código da Composição']);

    if (!composicaoCodigo) continue;

    for (const uf of ufs) {
      const custo = valorNumerico(row[uf]);
      if (custo === null) continue;

      custos.push({
        referencia_id: referenciaId,
        composicao_codigo: composicaoCodigo,
        uf,
        regime: 'SEM_DESONERACAO',
        custo,
      });
    }
  }

  console.log(`Custos preparados: ${custos.length}`);

  await inserirEmLotes({
    tabela: 'sinapi_composicao_custos',
    dados: custos,
    tamanhoLote: BATCH_SIZE_CUSTOS,
    tipo: 'Custos',
    upsert: true,
    onConflict: 'referencia_id,composicao_codigo,uf,regime',
  });
}

main().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});