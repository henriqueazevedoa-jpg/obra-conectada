/**
 * Lastra — Orquestrador de testes
 *
 * Uso:
 *   node src/_auditoria/rodar_testes.mjs --sprint sprint-c
 *   node src/_auditoria/rodar_testes.mjs --sprint sprint-c --modulo orcamento
 *   node src/_auditoria/rodar_testes.mjs --sprint sprint-c --baseline
 *
 * Flags:
 *   --sprint [nome]    nome do sprint (obrigatório)
 *   --modulo [nome]    testar só um módulo (orcamento, cronograma...)
 *                      default: todos os módulos com cenários
 *   --baseline         gerar novo baseline visual (primeira execução)
 *   --skip-visual      pular comparação visual (mais rápido)
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE  = 'http://localhost:8080';
const EMAIL = 'admin@obrafacil.dev';
const SENHA = 'admin123';

const args       = process.argv.slice(2);
const SPRINT     = args.find((_, i) => args[i-1] === '--sprint') ?? 'sem-sprint';
const MODULO     = args.find((_, i) => args[i-1] === '--modulo') ?? 'todos';
const BASELINE   = args.includes('--baseline');
const SKIP_VIS   = args.includes('--skip-visual');

const TIMESTAMP  = new Date().toISOString().slice(0,16).replace('T','_').replace(':','h');
const OUT_DIR    = `src/_auditoria/sprints/${SPRINT}`;
const SS_DIR     = `${OUT_DIR}/screenshots`;
const BASE_DIR   = `src/_auditoria/visual-baseline`;

[OUT_DIR, SS_DIR, BASE_DIR].forEach(d => !existsSync(d) && mkdirSync(d, { recursive: true }));

// ── Módulos disponíveis ───────────────────────────────────────
const MODULOS = {
  orcamento: () => import('./cenarios/cenarios_orcamento.mjs'),
  // Adicionar conforme sprints avançam:
  // cronograma: () => import('./cenarios/cenarios_cronograma.mjs'),
  // financeiro: () => import('./cenarios/cenarios_financeiro.mjs'),
};

// ── Páginas para screenshot visual ───────────────────────────
const PAGINAS_VISUAL = [
  { rota: '/orcamento',              nome: 'orcamento_visao_geral' },
  { rota: '/orcamento?tab=planilha', nome: 'orcamento_planilha' },
  { rota: '/orcamento?tab=cotacao',  nome: 'orcamento_cotacao' },
  { rota: '/cronograma',             nome: 'cronograma' },
  { rota: '/financeiro',             nome: 'financeiro' },
  { rota: '/painel',                 nome: 'painel' },
  { rota: '/dashboard',              nome: 'dashboard' },
];

// ── Comparação visual simples ─────────────────────────────────
function compararScreenshots(atual, baseline) {
  if (!existsSync(baseline)) return null; // sem baseline ainda
  const a = readFileSync(atual);
  const b = readFileSync(baseline);
  // Comparação por tamanho como proxy rápido
  const diffPct = Math.abs(a.length - b.length) / b.length * 100;
  return { diffPct: diffPct.toFixed(1), mudou: diffPct > 2 };
}

async function run() {
  console.log(`\n🧪 Lastra Tests — Sprint: ${SPRINT.toUpperCase()}`);
  console.log(`   Módulo: ${MODULO} | Baseline: ${BASELINE} | Skip visual: ${SKIP_VIS}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await context.newPage();

  // ── Login ─────────────────────────────────────────────────
  try {
    await page.goto(`${BASE}/login`, { timeout: 15000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', SENHA);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/obras`, { timeout: 10000 });
    console.log('✅ Login OK\n');
  } catch (e) {
    console.error('❌ Login falhou:', e.message);
    await browser.close();
    return;
  }

  const resultados = { cenarios: [], visual: [], resumo: {} };

  // ── Rodar cenários comportamentais ───────────────────────
  const modulosParaTestar = MODULO === 'todos'
    ? Object.keys(MODULOS)
    : [MODULO].filter(m => MODULOS[m]);

  for (const nomeModulo of modulosParaTestar) {
    console.log(`\n📋 Cenários: ${nomeModulo.toUpperCase()}`);
    const { [`CENARIOS_${nomeModulo.toUpperCase()}`]: cenarios } = await MODULOS[nomeModulo]();

    for (const cenario of cenarios) {
      let resultado;
      try {
        resultado = await cenario.passos(page, BASE);
      } catch (e) {
        resultado = { ok: false, motivo: `Exceção: ${e.message}` };
      }

      const icon = resultado.ok ? '✅' : cenario.critico ? '❌' : '⚠️ ';
      console.log(`  ${icon} [${cenario.id}] ${cenario.nome}`);
      if (!resultado.ok) console.log(`     ↳ ${resultado.motivo}`);

      // Screenshot do estado final do cenário
      const ssPath = join(SS_DIR, `cenario_${cenario.id}_${SPRINT}.png`);
      await page.screenshot({ path: ssPath, fullPage: false }).catch(() => {});

      resultados.cenarios.push({
        id: cenario.id,
        nome: cenario.nome,
        critico: cenario.critico,
        passou: resultado.ok,
        motivo: resultado.motivo,
        detalhe: resultado.detalhe,
      });
    }
  }

  // ── Screenshots visuais + diff ────────────────────────────
  if (!SKIP_VIS) {
    console.log('\n🖼  Screenshots visuais...');

    // Selecionar obra 1 como contexto padrão
    await page.goto(`${BASE}/obras`).catch(() => {});
    await page.waitForTimeout(1500);
    await page.locator('[data-obra-id="a1000000-0000-0000-0000-000000000001"]').first().click().catch(() => {});
    await page.waitForTimeout(1000);

    for (const p of PAGINAS_VISUAL) {
      await page.goto(`${BASE}${p.rota}`, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);

      const ssPath      = join(SS_DIR,   `${p.nome}_${SPRINT}.png`);
      const baselinePath= join(BASE_DIR, `${p.nome}.png`);

      await page.screenshot({ path: ssPath, fullPage: true }).catch(() => {});

      if (BASELINE) {
        // Gerar novo baseline
        await page.screenshot({ path: baselinePath, fullPage: true }).catch(() => {});
        console.log(`  📸 Baseline gerado: ${p.nome}`);
        resultados.visual.push({ pagina: p.rota, baseline: 'gerado' });
      } else {
        const diff = compararScreenshots(ssPath, baselinePath);
        if (!diff) {
          console.log(`  ⬜ ${p.rota.padEnd(40)} sem baseline`);
          resultados.visual.push({ pagina: p.rota, status: 'sem_baseline' });
        } else if (diff.mudou) {
          console.log(`  ⚠️  ${p.rota.padEnd(40)} mudou ~${diff.diffPct}%`);
          resultados.visual.push({ pagina: p.rota, status: 'mudou', diffPct: diff.diffPct });
        } else {
          console.log(`  ✅ ${p.rota.padEnd(40)} ok`);
          resultados.visual.push({ pagina: p.rota, status: 'ok', diffPct: diff.diffPct });
        }
      }
    }
  }

  await browser.close();

  // ── Gerar relatório ───────────────────────────────────────
  const totalCenarios  = resultados.cenarios.length;
  const passaram       = resultados.cenarios.filter(c => c.passou).length;
  const falharamCrit   = resultados.cenarios.filter(c => !c.passou && c.critico).length;
  const mudancasVisuais= resultados.visual.filter(v => v.status === 'mudou').length;

  resultados.resumo = { totalCenarios, passaram, falharamCrit, mudancasVisuais };

  const linhas = [
    `LASTRA — RELATÓRIO DE TESTES`,
    `Sprint: ${SPRINT.toUpperCase()} | Data: ${new Date().toLocaleString('pt-BR')}`,
    ``,
    `CENÁRIOS COMPORTAMENTAIS`,
    `${'─'.repeat(60)}`,
    `Total: ${totalCenarios} | Passaram: ${passaram} | Críticos com falha: ${falharamCrit}`,
    ``,
  ];

  for (const c of resultados.cenarios) {
    const icon = c.passou ? '✅' : c.critico ? '❌' : '⚠️ ';
    linhas.push(`${icon} [${c.id}] ${c.nome}`);
    if (!c.passou) linhas.push(`   ↳ ${c.motivo}`);
  }

  if (!SKIP_VIS) {
    linhas.push('', `COMPARAÇÃO VISUAL`, `${'─'.repeat(60)}`);
    for (const v of resultados.visual) {
      const icon = v.status === 'ok' ? '✅' : v.status === 'mudou' ? '⚠️ ' : '⬜';
      linhas.push(`${icon} ${v.pagina}${v.diffPct ? ` (~${v.diffPct}% diff)` : ''}`);
    }
  }

  linhas.push('', `RESULTADO FINAL`, `${'─'.repeat(60)}`);
  linhas.push(falharamCrit === 0
    ? '✅ PASSOU — nenhum cenário crítico falhou'
    : `❌ FALHOU — ${falharamCrit} cenário(s) crítico(s) com falha`);

  if (mudancasVisuais > 0)
    linhas.push(`⚠️  ${mudancasVisuais} página(s) com mudança visual — verificar screenshots`);

  const relPath = join(OUT_DIR, `testes_${SPRINT}_${TIMESTAMP}.txt`);
  writeFileSync(relPath, linhas.join('\n'));
  writeFileSync(
    join(OUT_DIR, `testes_data_${SPRINT}_${TIMESTAMP}.json`),
    JSON.stringify(resultados, null, 2)
  );

  console.log(`\n${'═'.repeat(60)}`);
  console.log(falharamCrit === 0 ? '✅ PASSOU' : '❌ FALHOU');
  console.log(`📄 Relatório: ${relPath}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Exit code para uso em CI futuramente
  process.exit(falharamCrit > 0 ? 1 : 0);
}

run().catch(console.error);
