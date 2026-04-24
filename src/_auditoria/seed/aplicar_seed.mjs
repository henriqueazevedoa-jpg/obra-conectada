/**
 * Lastra — Aplicar seed de dados para testes
 *
 * Uso:
 *   node src/_auditoria/seed/aplicar_seed.mjs
 *   node src/_auditoria/seed/aplicar_seed.mjs --modulo orcamento
 *   node src/_auditoria/seed/aplicar_seed.mjs --limpar
 *
 * Flags:
 *   --modulo [nome]   aplicar só o seed do módulo (base, orcamento)
 *                     default: aplica todos em sequência
 *   --limpar          apaga dados de teste sem reinserir
 *
 * Pré-requisito: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 * no arquivo .env do projeto
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY;
const COMPANY_ID    = 'bbbbbbbb-0000-0000-0000-000000000001';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const __dir    = dirname(fileURLToPath(import.meta.url));

const args    = process.argv.slice(2);
const modulo  = args.find((_, i) => args[i - 1] === '--modulo') ?? 'todos';
const limpar  = args.includes('--limpar');

// ── Sequência de seeds ────────────────────────────────────────
const SEEDS = [
  { nome: 'base',        arquivo: 'seed_base.sql' },
  { nome: 'orcamento',   arquivo: 'seed_orcamento.sql' },
  { nome: 'cronograma',  arquivo: 'seed_cronograma.sql' },
  // Adicionar novos módulos aqui conforme os sprints avançam:
  // { nome: 'financeiro', arquivo: 'seed_financeiro.sql' },
];

async function executarSQL(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    // Fallback: tentar via query direta se RPC não existir
    // O agente deve executar o SQL diretamente no Supabase SQL Editor
    return { error };
  }
  return { error: null };
}

async function verificarDados() {
  console.log('\n🔍 Verificando dados inseridos...\n');

  const checks = [
    {
      label: 'Obras de teste',
      query: supabase.from('obras').select('id, nome').in('id', [
        'a1000000-0000-0000-0000-000000000001',
        'a2000000-0000-0000-0000-000000000001',
        'a3000000-0000-0000-0000-000000000001',
      ]),
      esperado: 3,
    },
    {
      label: 'Versões de orçamento',
      query: supabase.from('orcamento_versoes')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID),
      esperado: 3,
    },
    {
      label: 'Etapas (categorias)',
      query: supabase.from('orcamento_categorias')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID),
      esperado: 22,
    },
    {
      label: 'Composições',
      query: supabase.from('orcamento_composicoes')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID),
      esperado: 23,
    },
    {
      label: 'Composições sem preço (Obra 1)',
      query: supabase.from('orcamento_composicoes')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID)
        .eq('preco_unitario', 0),
      esperado: 4,
    },
  ];

  let passou = 0;
  let falhou = 0;

  for (const check of checks) {
    const { data, count, error } = await check.query;
    if (error) {
      console.log(`  ❌ ${check.label}: ERRO — ${error.message}`);
      falhou++;
      continue;
    }
    const resultado = count ?? data?.length ?? 0;
    const ok = resultado >= check.esperado;
    console.log(`  ${ok ? '✅' : '❌'} ${check.label}: ${resultado} (esperado: ≥${check.esperado})`);
    ok ? passou++ : falhou++;
  }

  console.log(`\n  ${passou}/${passou + falhou} verificações passaram\n`);
  return falhou === 0;
}

async function run() {
  console.log('\n🌱 Lastra — Aplicar Seed de Testes');
  console.log(`   Módulo: ${modulo} | Limpar: ${limpar}\n`);

  // Filtrar seeds a aplicar
  const seedsParaRodar = modulo === 'todos'
    ? SEEDS
    : SEEDS.filter(s => s.nome === modulo || s.nome === 'base');

  if (limpar) {
    console.log('🗑️  Modo limpeza — removendo dados de teste...');
    const { error } = await supabase.from('obras').delete().in('id', [
      'a1000000-0000-0000-0000-000000000001',
      'a2000000-0000-0000-0000-000000000001',
      'a3000000-0000-0000-0000-000000000001',
    ]);
    if (error) console.error('  Erro ao limpar:', error.message);
    else console.log('  ✅ Dados de teste removidos\n');
    return;
  }

  // Verificar se Supabase está acessível
  const { error: pingError } = await supabase.from('obras').select('id').limit(1);
  if (pingError) {
    console.error('❌ Não foi possível conectar ao Supabase:', pingError.message);
    console.log('\n📋 ALTERNATIVA: Execute o SQL manualmente no Supabase SQL Editor:');
    for (const seed of seedsParaRodar) {
      const path = join(__dir, seed.arquivo);
      if (existsSync(path)) console.log(`   → ${path}`);
    }
    process.exit(1);
  }

  // Instruções para execução manual (mais seguro que RPC)
  console.log('📋 INSTRUÇÕES DE EXECUÇÃO:\n');
  console.log('O seed deve ser executado diretamente no Supabase SQL Editor.');
  console.log('Copie e execute os arquivos na ordem abaixo:\n');

  for (const seed of seedsParaRodar) {
    const path = join(__dir, seed.arquivo);
    if (existsSync(path)) {
      console.log(`  ${seedsParaRodar.indexOf(seed) + 1}. ${seed.nome.toUpperCase()}`);
      console.log(`     Arquivo: ${path}\n`);
    }
  }

  console.log('Após executar, rode para verificar:');
  console.log('  node src/_auditoria/seed/aplicar_seed.mjs --verificar\n');

  if (args.includes('--verificar')) {
    await verificarDados();
  }
}

run().catch(console.error);
