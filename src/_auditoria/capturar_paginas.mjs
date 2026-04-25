/**
 * Lastra — Captura de páginas para auditoria de sprint
 *
 * Uso:
 *   node src/_auditoria/capturar_paginas.mjs
 *   node src/_auditoria/capturar_paginas.mjs --sprint sprint-b
 *   node src/_auditoria/capturar_paginas.mjs --sprint sprint-b --only-errors
 *
 * Flags:
 *   --sprint [nome]    nome do sprint (ex: sprint-a, sprint-b, baseline)
 *                      default: "baseline"
 *   --only-errors      captura screenshot apenas de páginas com erros
 *                      (economiza tempo em validações rápidas)
 *
 * Saída:
 *   src/_auditoria/sprints/[sprint]/resumo_[sprint]_[timestamp].txt
 *   src/_auditoria/sprints/[sprint]/screenshots/[nome]_[sprint].png
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fazerLogin, autenticarENavegar } from './lib/auth.mjs';

// ── Config ────────────────────────────────────────────────────

const BASE = 'http://localhost:8080';

// Ler args
const args = process.argv.slice(2);
const sprintArg = args.find((_, i) => args[i - 1] === '--sprint') ?? 'baseline';
const SPRINT = sprintArg.toLowerCase().replace(/\s+/g, '-');
const ONLY_ERRORS = args.includes('--only-errors');

const TIMESTAMP = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', 'h');
const OUT_DIR = `src/_auditoria/sprints/${SPRINT}`;
const SS_DIR = `${OUT_DIR}/screenshots`;

// Criar pastas
[OUT_DIR, SS_DIR].forEach(d => !existsSync(d) && mkdirSync(d, { recursive: true }));

// ── Páginas ───────────────────────────────────────────────────

const PAGINAS = [
  // Auth / Público
  { rota: '/login', nome: '00_login', auth: false },
  { rota: '/calculadora', nome: '01_calculadora_publica', auth: false },

  // Core — mais relevantes para demo
  { rota: '/obras', nome: '02_obras', auth: true },
  { rota: '/painel', nome: '03_painel', auth: true },
  { rota: '/dashboard', nome: '04_dashboard', auth: true },

  // Orçamento
  { rota: '/orcamento', nome: '05_orcamento_visao_geral', auth: true },
  { rota: '/orcamento?tab=planilha', nome: '06_orcamento_planilha', auth: true },
  { rota: '/orcamento?tab=cotacao', nome: '07_orcamento_cotacao', auth: true },

  // Cronograma
  { rota: '/cronograma', nome: '08_cronograma', auth: true },

  // Financeiro
  { rota: '/financeiro', nome: '09_financeiro', auth: true },
  { rota: '/financeiro?tab=pagamentos', nome: '10_financeiro_pagamentos', auth: true },
  { rota: '/financeiro?tab=custo-real', nome: '11_financeiro_custo_real', auth: true },
  { rota: '/financeiro?tab=fluxo-caixa', nome: '12_financeiro_fluxo', auth: true },

  // Canteiro
  { rota: '/diario', nome: '13_diario', auth: true },
  { rota: '/estoque', nome: '14_estoque', auth: true },
  { rota: '/equipe', nome: '15_equipe', auth: true },
  { rota: '/compras', nome: '16_compras', auth: true },
  { rota: '/agenda', nome: '17_agenda', auth: true },
  { rota: '/documentos', nome: '18_documentos', auth: true },

  // Outros
  { rota: '/contatos', nome: '19_contatos', auth: true },
  { rota: '/contratos', nome: '20_contratos', auth: true },
  { rota: '/relatorios', nome: '21_relatorios', auth: true },
  { rota: '/biblioteca', nome: '22_biblioteca', auth: true },

  // Configurações
  { rota: '/configuracoes', nome: '23_config_empresa', auth: true },
  { rota: '/configuracoes?tab=calendario', nome: '24_config_calendario', auth: true },
  { rota: '/configuracoes?tab=orcamento', nome: '25_config_orcamento', auth: true },
  { rota: '/configuracoes?tab=calculadora', nome: '26_config_calculadora', auth: true },

  // Admin
  { rota: '/admin/dashboard', nome: '27_admin_dashboard', auth: true },
  { rota: '/admin/companies', nome: '28_admin_companies', auth: true },
  { rota: '/admin/calculadora', nome: '29_admin_calculadora', auth: true },
  { rota: '/admin/feedbacks', nome: '30_admin_feedbacks', auth: true },

  // Perfil
  { rota: '/perfil', nome: '31_perfil', auth: true },
];

// ── Main ──────────────────────────────────────────────────────

const RELATORIO = [];

async function run() {
  console.log(`\n🔍 Lastra Audit — Sprint: ${SPRINT.toUpperCase()}`);
  console.log(`📁 Saída: ${OUT_DIR}`);
  console.log(`🖼  Screenshots: ${ONLY_ERRORS ? 'apenas páginas com erro' : 'todas as páginas'}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // O login inicial foi substituído pelo autenticarENavegar antes de selecionar a obra

  // ── Selecionar obra ────────────────────────────────────────
  try {
    const success = await autenticarENavegar(page, '/obras', { timeout: 10000 });
    if (success) {
      const obraEl = page.locator('[data-obra-id], .obra-card, tr[data-id]').first();
      if (await obraEl.isVisible()) {
        await obraEl.click();
        await page.waitForTimeout(1500);
      }
    }
  } catch (e) {
    console.warn(`Erro ao selecionar obra: ${e.message}`);
  }

  // ── Capturar páginas ───────────────────────────────────────
  for (const p of PAGINAS) {
    const errosPagina = [];
    const networkErrors = [];

    const consoleHandler = msg => {
      if (msg.type() === 'error') errosPagina.push(msg.text().slice(0, 200));
    };
    const requestHandler = req => { };
    const responseHandler = res => {
      if (res.status() >= 400) {
        networkErrors.push(`HTTP ${res.status()} — ${res.url().split('?')[0].slice(-80)}`);
      }
    };

    page.on('console', consoleHandler);
    page.on('response', responseHandler);

    let status = 'ok';
    let tempoMs = 0;

    try {
      if (!p.auth) {
        const pubCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const pubPage = await pubCtx.newPage();
        const t0 = Date.now();
        await pubPage.goto(`${BASE}${p.rota}`, { timeout: 12000, waitUntil: 'networkidle' });
        tempoMs = Date.now() - t0;
        await pubPage.waitForTimeout(1500);
        // Screenshot: sempre para auth=false
        await pubPage.screenshot({
          path: join(SS_DIR, `${p.nome}_${SPRINT}.png`),
          fullPage: true
        });
        await pubCtx.close();
      } else {
        const t0 = Date.now();
        const success = await autenticarENavegar(page, p.rota, { timeout: 12000 });
        if (!success) throw new Error("Falha de autenticação ao tentar navegar.");
        tempoMs = Date.now() - t0;
        await page.waitForTimeout(2000);

        const temErro = errosPagina.length > 0 || networkErrors.length > 0;
        const deveCapturar = !ONLY_ERRORS || temErro;

        if (deveCapturar) {
          await page.screenshot({
            path: join(SS_DIR, `${p.nome}_${SPRINT}.png`),
            fullPage: true
          });
        }
      }
    } catch (e) {
      status = `CRASH: ${e.message.slice(0, 100)}`;
      try {
        await page.screenshot({
          path: join(SS_DIR, `${p.nome}_${SPRINT}_CRASH.png`),
          fullPage: true
        });
      } catch { }
    }

    page.off('console', consoleHandler);
    page.off('response', responseHandler);

    const todasErros = [...errosPagina, ...networkErrors].slice(0, 5);

    RELATORIO.push({
      rota: p.rota,
      nome: p.nome,
      status,
      tempo_ms: tempoMs,
      erros: todasErros.length,
      erros_detalhe: todasErros,
    });

    const icon = status === 'ok' && todasErros.length === 0 ? '✅' : '❌';
    console.log(
      `${icon} ${p.rota.padEnd(42)} ${String(tempoMs).padStart(5)}ms  ${todasErros.length} erros`
    );
    if (todasErros.length > 0) {
      console.log(`   ↳ ${todasErros[0]}`);
    }
  }

  await browser.close();

  // ── Gerar resumo compacto ──────────────────────────────────

  const totalErros = RELATORIO.filter(r => r.erros > 0 || r.status !== 'ok').length;
  const crashes = RELATORIO.filter(r => r.status !== 'ok').length;

  const linhas = [
    `LASTRA — AUDIT REPORT`,
    `Sprint: ${SPRINT.toUpperCase()}`,
    `Data: ${new Date().toLocaleString('pt-BR')}`,
    `Páginas: ${RELATORIO.length} | Com erros: ${totalErros} | Crashes: ${crashes}`,
    ``,
    `STATUS DAS PÁGINAS`,
    `${'─'.repeat(70)}`,
  ];

  for (const r of RELATORIO) {
    const icon = r.status !== 'ok' ? '❌' : r.erros > 0 ? '⚠️ ' : '✅';
    linhas.push(`${icon} ${r.rota.padEnd(45)} ${r.tempo_ms}ms  ${r.erros} erros`);
    if (r.status !== 'ok') linhas.push(`   CRASH: ${r.status}`);
    for (const e of r.erros_detalhe) {
      linhas.push(`   ↳ ${e}`);
    }
  }

  linhas.push('');
  linhas.push(`ERROS TYPESCRIPT`);
  linhas.push(`${'─'.repeat(70)}`);
  linhas.push(`(executar: npx tsc --noEmit 2>&1 | head -30)`);
  linhas.push(`(colar resultado aqui antes de enviar para auditoria)`);

  linhas.push('');
  linhas.push(`ARQUIVOS ALTERADOS (git diff --stat)`);
  linhas.push(`${'─'.repeat(70)}`);
  linhas.push(`(colar resultado do git diff --stat HEAD~1 aqui)`);

  linhas.push('');
  linhas.push(`CHECKLIST DE SAÍDA`);
  linhas.push(`${'─'.repeat(70)}`);
  linhas.push(`[ ] tsc --noEmit zero erros novos`);
  linhas.push(`[ ] Zero crashes nas páginas`);
  linhas.push(`[ ] Erros de console não aumentaram vs sprint anterior`);
  linhas.push(`[ ] PLANO_GERAL_STATUS.md atualizado`);
  linhas.push(`[ ] PROJECT-MEMORY.md atualizado (se houve aprendizado)`);

  const resumo = linhas.join('\n');
  const resumoPath = join(OUT_DIR, `resumo_${SPRINT}_${TIMESTAMP}.txt`);
  writeFileSync(resumoPath, resumo);

  // Salvar JSON para comparação programática futura
  const jsonPath = join(OUT_DIR, `data_${SPRINT}_${TIMESTAMP}.json`);
  writeFileSync(jsonPath, JSON.stringify({ sprint: SPRINT, timestamp: TIMESTAMP, paginas: RELATORIO }, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Auditoria concluída`);
  console.log(`📄 Resumo: ${resumoPath}`);
  console.log(`📸 Screenshots: ${SS_DIR}/`);
  console.log(`\n📋 PRÓXIMO PASSO:`);
  console.log(`   1. Completar o resumo.txt com tsc output e git diff`);
  console.log(`   2. Enviar o .txt para auditoria`);
  console.log(`${'═'.repeat(60)}\n`);
}

run().catch(console.error);
