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

// Quais regimes importar (pode sobrescrever via env: SINAPI_REGIMES=SEM_DESONERACAO,COM_DESONERACAO)
const REGIMES_SOLICITADOS = process.env.SINAPI_REGIMES
  ? process.env.SINAPI_REGIMES.split(',').map((r) => r.trim())
  : ['SEM_DESONERACAO', 'COM_DESONERACAO', 'SEM_ENCARGOS'];

if (!filePath) throw new Error('SINAPI_FILE_PATH não definido');
if (!competencia) throw new Error('SINAPI_COMPETENCIA não definido');

const BATCH_SIZE_COMPOSICOES = 500;
const BATCH_SIZE_ITENS = 1000;
const BATCH_SIZE_INSUMOS = 1000;
const BATCH_SIZE_PRECOS = 2000;
const BATCH_SIZE_CUSTOS = 2000;

// ─── Mapeamento aba → regime ──────────────────────────────────────────────────

const INSUMO_ABAS = [
  { aba: 'ISD', regime: 'SEM_DESONERACAO' },
  { aba: 'ICD', regime: 'COM_DESONERACAO' },
  { aba: 'ISE', regime: 'SEM_ENCARGOS'    },
];

const CUSTO_ABAS = [
  { aba: 'CSD', regime: 'SEM_DESONERACAO' },
  { aba: 'CCD', regime: 'COM_DESONERACAO' },
  { aba: 'CSE', regime: 'SEM_ENCARGOS'    },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Iniciando importação SINAPI...');
  console.log(`Regimes a importar: ${REGIMES_SOLICITADOS.join(', ')}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath);
  const abasDisponiveis = workbook.SheetNames;
  console.log(`Abas disponíveis no arquivo: ${abasDisponiveis.join(' | ')}`);

  const nomeArquivo = filePath.split(/[\\/]/).pop();
  const referencia = await getOrCreateReferencia(nomeArquivo);
  console.log(`Referência ativa: ${referencia.id} (${referencia.competencia})`);

  // Limpar apenas preços/custos dos regimes que serão reimportados
  // (preserva regimes não solicitados se já existirem)
  await limparRegimes(referencia.id, REGIMES_SOLICITADOS);

  // 1. Aba Analítico: composições + itens (não depende de regime)
  const descToCodigoMap = await parseAnalitico(workbook, referencia.id);

  // 2. Insumos e preços — uma aba por regime
  for (const { aba, regime } of INSUMO_ABAS) {
    if (!REGIMES_SOLICITADOS.includes(regime)) continue;

    if (!workbook.Sheets[aba]) {
      console.warn(`⚠️  Aba "${aba}" não encontrada no arquivo — regime ${regime} ignorado.`);
      continue;
    }

    console.log(`\n── Processando insumos: aba "${aba}" → regime ${regime} ──`);
    await parseInsumos(workbook, referencia.id, aba, regime);
  }

  // 3. Custos (sinapi_composicao_custos) — uma aba por regime
  for (const { aba, regime } of CUSTO_ABAS) {
    if (!REGIMES_SOLICITADOS.includes(regime)) continue;

    if (!workbook.Sheets[aba]) {
      console.warn(`⚠️  Aba "${aba}" não encontrada no arquivo — regime ${regime} ignorado.`);
      continue;
    }

    console.log(`\n── Processando custos: aba "${aba}" → regime ${regime} ──`);
    await parseCustos(workbook, referencia.id, aba, regime, descToCodigoMap);
  }

  console.log('\n✅ SINAPI importada com sucesso');
  console.log(`   Regimes importados: ${REGIMES_SOLICITADOS.join(', ')}`);
}

// ─── Banco ────────────────────────────────────────────────────────────────────

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
    .insert({ competencia, arquivo_nome: nomeArquivo })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function limparRegimes(referenciaId, regimes) {
  console.log(`\nLimpando dados anteriores para regimes: ${regimes.join(', ')}...`);

  // Preços de insumos: deletar por regime
  for (const regime of regimes) {
    const { error } = await supabase
      .from('sinapi_insumo_precos')
      .delete()
      .eq('referencia_id', referenciaId)
      .eq('regime', regime);
    if (error) throw error;
    console.log(`  sinapi_insumo_precos [${regime}]: limpo`);
  }

  // Custos de composição: deletar por regime
  for (const regime of regimes) {
    /*
    const { error } = await supabase
      .from('sinapi_composicao_custos')
      .delete()
      .eq('referencia_id', referenciaId)
      .eq('regime', regime);
    if (error) throw error;
    */
    console.log(`  sinapi_composicao_custos [${regime}]: bypass delete (using upsert)`);
  }

  // Composições e itens sempre relimpados (não têm regime)
  for (const tabela of ['sinapi_composicao_itens', 'sinapi_composicoes', 'sinapi_insumos']) {
    /*
    const { error } = await supabase
      .from(tabela)
      .delete()
      .eq('referencia_id', referenciaId);
    if (error) throw error;
    */
    console.log(`  ${tabela}: bypass delete (using upsert)`);
  }
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

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
      console.log(`Tentativa ${tentativa}/${tentativas} falhou: ${error.message || error}`);
      if (tentativa < tentativas) {
        await new Promise((resolve) => setTimeout(resolve, esperaMs));
      }
    }
  }

  throw ultimoErro;
}

async function inserirEmLotes({ tabela, dados, tamanhoLote, tipo, upsert = false, onConflict }) {
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

    const pct = Math.round(((i + 1) / lotes.length) * 100);
    process.stdout.write(`\r  ${tipo}: lote ${i + 1}/${lotes.length} (${pct}%)`);
  }
  console.log(); // nova linha após progresso
}

// ── Aba Analítico: composições + itens (sem regime) ──────────────────────────

async function parseAnalitico(workbook, referenciaId) {
  const nomeAba =
    workbook.SheetNames.find((name) => name.toLowerCase().includes('analítico')) ||
    workbook.SheetNames.find((name) => name.toLowerCase().includes('anal'));

  if (!nomeAba) throw new Error('Aba Analítico não encontrada');

  console.log(`\n── Processando composições: aba "${nomeAba}" ──`);
  const sheet = workbook.Sheets[nomeAba];

  const rows = xlsx.utils
    .sheet_to_json(sheet, { defval: null, range: 9 })
    .map(normalizarChaves);

  console.log(`  Linhas lidas: ${rows.length}`);

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
  console.log(`  Composições: ${composicoes.length} | Itens: ${itens.length}`);

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
    tipo: 'Itens de composição',
    upsert: true,
    onConflict: 'referencia_id,composicao_codigo,ordem',
  });

  const descToCodigoMap = new Map();
  for (const [key, comp] of composicoesMap.entries()) {
    if (comp.descricao) {
      const desc = comp.descricao.trim();
      const unit = comp.unidade ? comp.unidade.trim() : '';
      const mapKey = `${desc}|${unit}`;
      if (!descToCodigoMap.has(mapKey)) {
        descToCodigoMap.set(mapKey, []);
      }
      descToCodigoMap.get(mapKey).push(comp.codigo);
    }
  }
  return descToCodigoMap;
}

// ── Aba de insumos (ISD / ICD / ISE) — um regime por chamada ─────────────────

async function parseInsumos(workbook, referenciaId, nomeAba, regime) {
  const sheet = workbook.Sheets[nomeAba];
  if (!sheet) throw new Error(`Aba ${nomeAba} não encontrada`);

  const rows = xlsx.utils
    .sheet_to_json(sheet, { defval: null, range: 9 })
    .map(normalizarChaves);

  console.log(`  Linhas lidas: ${rows.length}`);

  if (!rows.length) throw new Error(`Nenhuma linha lida da aba ${nomeAba}`);

  const colunas = Object.keys(rows[0] || {});
  const ufs = colunas.filter((col) => /^[A-Z]{2}$/.test(col));
  console.log(`  UFs detectadas: ${ufs.join(', ')}`);

  const insumosMap = new Map();
  const precos = [];

  for (const row of rows) {
    const codigo = valorNumerico(row['Código do Insumo']);
    const descricao = row['Descrição do Insumo']?.toString().trim() || null;
    const unidade = row['Unidade']?.toString().trim() || null;
    const classificacao = row['Classificação']?.toString().trim() || null;
    const origemPreco = row['Origem de Preço']?.toString().trim() || null;

    if (!codigo || !descricao) continue;

    // Insumos são os mesmos para todos os regimes; inserir apenas 1x (chave única)
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
        regime,
        preco,
      });
    }
  }

  const insumos = Array.from(insumosMap.values());
  console.log(`  Insumos: ${insumos.length} | Preços: ${precos.length}`);

  // Insumos: upsert — os dados são idênticos entre regimes
  await inserirEmLotes({
    tabela: 'sinapi_insumos',
    dados: insumos,
    tamanhoLote: BATCH_SIZE_INSUMOS,
    tipo: `Insumos [${regime}]`,
    upsert: true,
    onConflict: 'referencia_id,codigo',
  });

  await inserirEmLotes({
    tabela: 'sinapi_insumo_precos',
    dados: precos,
    tamanhoLote: BATCH_SIZE_PRECOS,
    tipo: `Preços [${regime}]`,
    upsert: true,
    onConflict: 'referencia_id,insumo_codigo,uf,regime',
  });
}

// ── Aba de custos (CSD / CCD / CSE) — um regime por chamada ──────────────────

async function parseCustos(workbook, referenciaId, nomeAba, regime, descToCodigoMap) {
  const sheet = workbook.Sheets[nomeAba];
  if (!sheet) throw new Error(`Aba ${nomeAba} não encontrada`);

  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  console.log(`  Linhas totais lidas: ${rawData.length}`);

  if (rawData.length < 11) throw new Error(`Sem dados suficientes na aba ${nomeAba}`);

  const rowUfs = rawData[8];
  const rowCols = rawData[9];

  const ufToCustoIndex = {};
  let currentUf = null;
  for (let i = 4; i < rowUfs.length; i++) {
    const maybeUf = rowUfs[i] ? String(rowUfs[i]).trim() : '';
    if (maybeUf && /^[A-Z]{2}$/.test(maybeUf)) {
      currentUf = maybeUf;
    }
    const colName = rowCols[i] ? String(rowCols[i]).trim() : '';
    if (currentUf && colName.includes('Custo')) {
      ufToCustoIndex[currentUf] = i;
      // We only want the cost column, we reset currentUf to prevent mapping %AS to Custo
      currentUf = null; 
    }
  }

  const ufs = Object.keys(ufToCustoIndex);
  console.log(`  UFs detectadas (${ufs.length}): ${ufs.join(', ')}`);

  const custosMap = new Map();

  for (let r = 10; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || !row.length) continue;

    const descricao = row[2] ? String(row[2]).trim() : '';
    const unidade = row[3] ? String(row[3]).trim() : '';
    if (!descricao) continue;
    
    const mapKey = `${descricao}|${unidade}`;
    const codigos = descToCodigoMap.get(mapKey) ?? [];
    if (codigos.length === 0) continue;

    for (const [uf, colIdx] of Object.entries(ufToCustoIndex)) {
      const custo = valorNumerico(row[colIdx]);
      if (custo === null) continue;

      for (const composicaoCodigo of codigos) {
        const chave = `${composicaoCodigo}-${uf}`;
        custosMap.set(chave, {
          referencia_id: referenciaId,
          composicao_codigo: composicaoCodigo,
          uf,
          regime,
          custo,
          percentual_as: null, // Ignoramos %AS por simplicidade, ou colIdx+1 se precisar
        });
      }
    }
  }

  const custos = Array.from(custosMap.values());
  console.log(`  Custos preparados (únicos): ${custos.length}`);

  await inserirEmLotes({
    tabela: 'sinapi_composicao_custos',
    dados: custos,
    tamanhoLote: BATCH_SIZE_CUSTOS,
    tipo: `Custos [${regime}]`,
    upsert: true,
    onConflict: 'referencia_id,composicao_codigo,uf,regime',
  });
}

main().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});