/**
 * Lastra — Captura de estados interativos (Camada 2)
 *
 * Uso:
 *   node src/_auditoria/capturar_estados.mjs --sprint sprint-d --pagina /orcamento?tab=planilha
 *   node src/_auditoria/capturar_estados.mjs --sprint sprint-d --pagina /orcamento?tab=planilha --escopo etapa_row,composicao_row,overflow_menu
 *
 * Flags:
 *   --sprint [nome]     nome do sprint
 *   --pagina [rota]     rota a capturar
 *   --escopo [tipos]    tipos separados por vírgula (default: todos com risco)
 *                       Se omitido, usa escopo do inventario_*.json mais recente
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fazerLogin, autenticarENavegar } from './lib/auth.mjs';

const BASE   = 'http://localhost:8080';

const args      = process.argv.slice(2);
const PAGINA    = args.find((_, i) => args[i-1] === '--pagina') ?? '/orcamento?tab=planilha';
const SPRINT    = args.find((_, i) => args[i-1] === '--sprint') ?? 'analise';
const ESCOPO_ARG= args.find((_, i) => args[i-1] === '--escopo');
const TIMESTAMP = new Date().toISOString().slice(0,16).replace('T','_').replace(':','h');
const SLUG      = PAGINA.replace(/[/?=&]/g, '_').replace(/^_/, '');
const OUT_DIR   = `src/_auditoria/sprints/${SPRINT}/estados`;
const SS_DIR    = `${OUT_DIR}/screenshots`;

[OUT_DIR, SS_DIR].forEach(d => !existsSync(d) && mkdirSync(d, { recursive: true }));

// ── Ler escopo do inventário mais recente se não especificado ─
function lerEscopoDoInventario() {
  const sprintDir = `src/_auditoria/sprints/${SPRINT}`;
  if (!existsSync(sprintDir)) return null;
  const arquivos = readdirSync(sprintDir)
    .filter(f => f.startsWith(`inventario_${SLUG}`) && f.endsWith('.json'))
    .sort().reverse();
  if (arquivos.length === 0) return null;
  const data = JSON.parse(readFileSync(join(sprintDir, arquivos[0]), 'utf8'));
  return data.escopoCaptura?.map(e => e.tipo) ?? null;
}

// ── Definição de estados por tipo ────────────────────────────
const ESTADOS_POR_TIPO = {
  etapa_row: [
    {
      id: 'default',
      descricao: 'Estado padrão sem interação',
      acao: async (page, seletor) => {
        await page.mouse.move(0, 0); // mover mouse pra longe
        await page.waitForTimeout(300);
      },
    },
    {
      id: 'hover',
      descricao: 'Mouse sobre a linha de etapa',
      acao: async (page, seletor) => {
        await page.locator(seletor).nth(0).hover();
        await page.waitForTimeout(400);
      },
    },
    {
      id: 'expandida',
      descricao: 'Etapa expandida mostrando composições',
      acao: async (page, seletor) => {
        const el = page.locator(seletor).nth(0);
        const expandBtn = el.locator('button[aria-expanded], [data-expand], svg').first();
        await expandBtn.click().catch(() => el.click());
        await page.waitForTimeout(500);
      },
    },
  ],

  composicao_row: [
    {
      id: 'default',
      descricao: 'Composição em estado padrão',
      acao: async (page, seletor) => {
        await page.mouse.move(0, 0);
        await page.waitForTimeout(300);
      },
    },
    {
      id: 'hover',
      descricao: 'Mouse sobre linha de composição — botões de ação visíveis?',
      acao: async (page, seletor) => {
        await page.locator(seletor).nth(0).hover();
        await page.waitForTimeout(400);
      },
    },
    {
      id: 'hover_expand_visivel',
      descricao: 'Zoom no botão de expandir em insumos — visível e clicável?',
      acao: async (page, seletor) => {
        await page.locator(seletor).nth(0).hover();
        await page.waitForTimeout(300);
      },
      clip: true, // capturar apenas área do elemento
    },
    {
      id: 'expandida',
      descricao: 'Composição expandida mostrando insumos',
      acao: async (page, seletor) => {
        const el = page.locator(seletor).nth(0);
        await el.hover();
        await page.waitForTimeout(300);
        const expandBtn = el.locator('button, [role="button"]').first();
        await expandBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      },
    },
  ],

  overflow_menu: [
    {
      id: 'fechado',
      descricao: 'Botão ... antes de abrir',
      acao: async (page, seletor) => {
        // Hover na linha pai para revelar o botão
        const btn = page.locator(seletor).nth(0);
        const parent = btn.locator('xpath=../..');
        await parent.hover().catch(() => {});
        await page.waitForTimeout(400);
      },
    },
    {
      id: 'aberto',
      descricao: 'Menu ... aberto — quais opções aparecem?',
      acao: async (page, seletor) => {
        const btn = page.locator(seletor).nth(0);
        const parent = btn.locator('xpath=../..');
        await parent.hover().catch(() => {});
        await page.waitForTimeout(300);
        await btn.click().catch(async () => {
          // fallback: tentar clicar direto
          await page.locator(seletor).nth(0).click();
        });
        await page.waitForTimeout(500);
      },
    },
  ],

  button: [
    {
      id: 'default',
      descricao: 'Botão em estado padrão',
      acao: async (page, seletor) => {
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
      },
    },
    {
      id: 'hover',
      descricao: 'Mouse sobre o botão',
      acao: async (page, seletor) => {
        await page.locator(seletor).nth(0).hover();
        await page.waitForTimeout(300);
      },
    },
  ],

  input_editavel: [
    {
      id: 'default',
      descricao: 'Campo sem foco',
      acao: async (page, seletor) => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      },
    },
    {
      id: 'focus',
      descricao: 'Campo com foco — borda, cursor visíveis?',
      acao: async (page, seletor) => {
        await page.locator(seletor).nth(0).click();
        await page.waitForTimeout(300);
      },
    },
  ],

  checkbox: [
    {
      id: 'desmarcado',
      descricao: 'Checkbox não selecionado',
      acao: async (page, seletor) => {
        const cb = page.locator(seletor).nth(0);
        if (await cb.isChecked()) await cb.click();
        await page.waitForTimeout(200);
      },
    },
    {
      id: 'marcado',
      descricao: 'Checkbox selecionado',
      acao: async (page, seletor) => {
        const cb = page.locator(seletor).nth(0);
        if (!await cb.isChecked()) await cb.click();
        await page.waitForTimeout(200);
      },
    },
    {
      id: 'bulk_ativo',
      descricao: 'Múltiplos selecionados — toolbar flutuante aparece?',
      acao: async (page, seletor) => {
        const cbs = page.locator(seletor);
        const count = await cbs.count();
        for (let i = 0; i < Math.min(3, count); i++) {
          const cb = cbs.nth(i);
          if (!await cb.isChecked()) await cb.click();
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(400);
      },
    },
  ],

  dropdown: [
    {
      id: 'fechado',
      descricao: 'Dropdown fechado',
      acao: async (page, seletor) => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      },
    },
    {
      id: 'aberto',
      descricao: 'Dropdown aberto — opções visíveis?',
      acao: async (page, seletor) => {
        await page.locator(seletor).nth(0).click();
        await page.waitForTimeout(400);
      },
    },
  ],
};

// Seletores reais por tipo
const SELETORES = {
  etapa_row:      '[data-etapa], .etapa-row, [data-tipo="etapa"], tr[data-parent="root"]',
  composicao_row: '[data-composicao], .composicao-row, [data-tipo="composicao"]',
  overflow_menu:  '[data-radix-dropdown-menu-trigger], button[aria-haspopup="menu"]',
  button:         'button:visible:not([aria-hidden])',
  input_editavel: 'input:visible:not([type="hidden"])',
  checkbox:       'input[type="checkbox"]:visible, [role="checkbox"]:visible',
  dropdown:       '[role="combobox"]:visible',
};

async function run() {
  console.log(`\n📸 Lastra — Captura de Estados Interativos`);
  console.log(`   Página: ${PAGINA} | Sprint: ${SPRINT}\n`);

  // Determinar escopo
  let tiposParaCapturar;
  if (ESCOPO_ARG) {
    tiposParaCapturar = ESCOPO_ARG.split(',').map(t => t.trim());
  } else {
    tiposParaCapturar = lerEscopoDoInventario();
    if (!tiposParaCapturar) {
      // Default: tipos mais críticos para o orçamento
      tiposParaCapturar = ['etapa_row', 'composicao_row', 'overflow_menu', 'checkbox', 'button'];
      console.log('⚠️  Sem inventário encontrado. Usando escopo padrão.\n');
    } else {
      console.log(`📋 Escopo lido do inventário: ${tiposParaCapturar.join(', ')}\n`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await context.newPage();

  // Login foi substituído por autenticarENavegar abaixo

  // Selecionar obra seed
  const successObras = await autenticarENavegar(page, '/obras', { timeout: 10000 });
  if (successObras) {
    await page.waitForTimeout(1500);
    await page.locator('[data-obra-id="a1000000-0000-0000-0000-000000000001"]').first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  // Navegar para página alvo
  const successPage = await autenticarENavegar(page, PAGINA, { timeout: 12000 });
  if (!successPage) throw new Error("Falha de autenticação na página alvo");
  await page.waitForTimeout(2500);

  const capturas = [];

  for (const tipo of tiposParaCapturar) {
    const estados = ESTADOS_POR_TIPO[tipo];
    const seletor = SELETORES[tipo];

    if (!estados || !seletor) {
      console.log(`⬜ ${tipo} — sem definição de estados`);
      continue;
    }

    const count = await page.locator(seletor).count();
    if (count === 0) {
      console.log(`⬜ ${tipo} — 0 instâncias encontradas na página`);
      continue;
    }

    console.log(`\n📸 ${tipo} (${count} instâncias — capturando nth(0)):`);

    for (const estado of estados) {
      try {
        // Resetar estado da página antes de cada captura
        await autenticarENavegar(page, PAGINA, { timeout: 10000 });
        await page.waitForTimeout(1500);

        // Re-selecionar obra se necessário
        const temObra = await page.locator('[data-obra-id]').count();
        if (temObra === 0) {
          const succ = await autenticarENavegar(page, '/obras', { timeout: 10000 });
          if (succ) {
            await page.waitForTimeout(1000);
            await page.locator('[data-obra-id="a1000000-0000-0000-0000-000000000001"]').first().click().catch(() => {});
          }
          await autenticarENavegar(page, PAGINA, { timeout: 10000 });
          await page.waitForTimeout(1500);
        }

        // Executar ação do estado
        await estado.acao(page, seletor);

        // Capturar screenshot
        const nomeArquivo = `${tipo}_${estado.id}_${SPRINT}.png`;
        const ssPath = join(SS_DIR, nomeArquivo);

        if (estado.clip) {
          // Capturar apenas a área do elemento
          const el = page.locator(seletor).nth(0);
          const box = await el.boundingBox();
          if (box) {
            const padding = 20;
            await page.screenshot({
              path: ssPath,
              clip: {
                x: Math.max(0, box.x - padding),
                y: Math.max(0, box.y - padding),
                width: box.width + padding * 2,
                height: box.height + padding * 2,
              }
            });
          }
        } else {
          await page.screenshot({ path: ssPath, fullPage: false });
        }

        console.log(`  ✅ ${estado.id} — ${estado.descricao}`);
        capturas.push({ tipo, estado: estado.id, descricao: estado.descricao, arquivo: nomeArquivo });

      } catch (e) {
        console.log(`  ❌ ${estado.id} — ${e.message.slice(0, 80)}`);
        capturas.push({ tipo, estado: estado.id, descricao: estado.descricao, erro: e.message.slice(0, 100) });
      }
    }
  }

  await browser.close();

  // Gerar relatório para envio
  const linhas = [
    `LASTRA — RELATÓRIO DE ESTADOS INTERATIVOS`,
    `Página: ${PAGINA} | Sprint: ${SPRINT} | Data: ${new Date().toLocaleString('pt-BR')}`,
    `Total capturas: ${capturas.filter(c => !c.erro).length} | Erros: ${capturas.filter(c => c.erro).length}`,
    ``,
    `CAPTURAS REALIZADAS`,
    `${'─'.repeat(60)}`,
    `Screenshots em: ${SS_DIR}/`,
    ``,
  ];

  let tipoAtual = '';
  for (const c of capturas) {
    if (c.tipo !== tipoAtual) {
      linhas.push(`\n[${c.tipo.toUpperCase()}]`);
      tipoAtual = c.tipo;
    }
    const status = c.erro ? `❌ ERRO: ${c.erro}` : `✅ ${c.arquivo}`;
    linhas.push(`  ${c.estado.padEnd(25)} ${status}`);
    linhas.push(`  └─ ${c.descricao}`);
  }

  linhas.push(``, `${'─'.repeat(60)}`);
  linhas.push(`PRÓXIMO PASSO: Enviar screenshots + este relatório para Claude`);
  linhas.push(`Claude aplica avaliação heurística e reporta problemas encontrados.`);

  const relPath = join(OUT_DIR, `estados_${SLUG}_${TIMESTAMP}.txt`);
  writeFileSync(relPath, linhas.join('\n'));
  writeFileSync(
    join(OUT_DIR, `estados_data_${SLUG}_${TIMESTAMP}.json`),
    JSON.stringify({ pagina: PAGINA, sprint: SPRINT, capturas }, null, 2)
  );

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Capturas concluídas`);
  console.log(`📸 Screenshots: ${SS_DIR}/`);
  console.log(`📄 Relatório: ${relPath}`);
  console.log(`${'═'.repeat(60)}\n`);
}

run().catch(console.error);
