/**
 * Lastra — Inventário de elementos interativos + Análise estática (Camada 0)
 *
 * ⚠️  MODELO RECOMENDADO: Gemini Flash (coleta mecânica)
 *     Análise posterior: Claude
 *
 * Uso:
 *   node src/_auditoria/inventariar_pagina.mjs --pagina /orcamento?tab=planilha --sprint hotfix-orcamento
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fazerLogin, autenticarENavegar } from './lib/auth.mjs';

const BASE    = 'http://localhost:8080';
const SRC_DIR = resolve('src');

const args      = process.argv.slice(2);
const PAGINA    = args.find((_, i) => args[i-1] === '--pagina') ?? '/orcamento?tab=planilha';
const SPRINT    = args.find((_, i) => args[i-1] === '--sprint') ?? 'analise';
const TIMESTAMP = new Date().toISOString().slice(0,16).replace('T','_').replace(':','h');
const SLUG      = PAGINA.replace(/[/?=&]/g, '_').replace(/^_+/, '');
const OUT_DIR   = `src/_auditoria/sprints/${SPRINT}`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const H = {
  H1: 'Visibilidade do estado do sistema',
  H3: 'Controle e liberdade do usuário',
  H4: 'Consistência e padrões',
  H6: 'Reconhecimento em vez de memorização',
  H7: 'Flexibilidade e eficiência de uso',
  H8: 'Design estético e minimalista',
};

const T = { touch_min: 44, overlap_px: 4 };

const ROTA_COMPONENTES = {
  '/orcamento?tab=planilha':  ['OrcamentoEditor', 'EtapaBlock', 'ComposicaoRow', 'InsumoRow'],
  '/orcamento?tab=cotacao':   ['CotacaoCentralTab', 'CotacaoComparativo', 'FornecedorDrawer'],
  '/orcamento':               ['OrcamentoCentral', 'OrcamentoEditor', 'OrcamentoDashboard'],
  '/cronograma':              ['CronogramaPage', 'GanttCanvasPanel', 'TaskDetailDrawer'],
  '/financeiro':              ['FinanceiroCentral', 'PagamentosTab', 'CustoRealTab'],
  '/painel':                  ['PainelObraPage'],
  '/contatos':                ['ContatosPage', 'ContatoDrawer'],
  '/contratos':               ['ContratosPage', 'ContratoDrawer'],
  '/diario':                  ['DiarioCentral', 'DiarioTab'],
  '/estoque':                 ['EstoqueCentral'],
  '/equipe':                  ['EquipeCentral'],
  '/compras':                 ['ComprasCentral'],
};

const TIPOS = [
  { tipo: 'button',         seletor: 'button' },
  { tipo: 'overflow_menu',  seletor: '[data-radix-dropdown-menu-trigger], button[aria-haspopup="menu"]' },
  { tipo: 'dropdown',       seletor: '[role="combobox"]' },
  { tipo: 'input_editavel', seletor: 'input:not([type="hidden"])' },
  { tipo: 'etapa_row',      seletor: '[data-etapa], .etapa-row' },
  { tipo: 'composicao_row', seletor: '[data-composicao], .composicao-row' },
  { tipo: 'checkbox',       seletor: 'input[type="checkbox"], [role="checkbox"]' },
  { tipo: 'icon_btn',       seletor: 'button:has(svg)' },
];

function inferirEstados(tipo) {
  return ({
    button:         ['default', 'hover'],
    overflow_menu:  ['fechado', 'aberto'],
    composicao_row: ['default', 'hover', 'expandida'],
    etapa_row:      ['default', 'hover'],
    input_editavel: ['default', 'focus'],
    checkbox:       ['desmarcado', 'marcado', 'bulk_ativo'],
    dropdown:       ['fechado', 'aberto'],
    icon_btn:       ['default', 'hover'],
  }[tipo]) || ['default', 'hover'];
}

// ── Busca recursiva cross-platform (Windows + Linux) ─────────
function buscarArquivo(nome) {
  function walk(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
          const found = walk(full);
          if (found) return found;
        } else if (e.name === `${nome}.tsx` || e.name === `${nome}.ts`) {
          return full;
        }
      }
    } catch {}
    return null;
  }
  return walk(SRC_DIR);
}

function extrairHandlers(nome) {
  const arquivo = buscarArquivo(nome);
  if (!arquivo) return null;

  const conteudo = readFileSync(arquivo, 'utf8');

  // onClick handlers
  const onClickHandlers = [];
  const reOnClick = /onClick=\{([^}]{1,120})\}/g;
  let m;
  while ((m = reOnClick.exec(conteudo)) !== null) onClickHandlers.push(m[1].trim());

  // DB writes
  const dbWrites = [];
  const reDb = /(?:const|async function|function)\s+(\w+)[^(]*\([^)]*\)[^{]*\{[^}]*\.(insert|upsert|update|delete)\(/gs;
  while ((m = reDb.exec(conteudo)) !== null) dbWrites.push({ fn: m[1], op: m[2] });

  // Textos de botões
  const btnTexts = [];
  const reBtn = /<[Bb]utton[^>]*>([^<]{2,50})<\/[Bb]utton>/g;
  while ((m = reBtn.exec(conteudo)) !== null) btnTexts.push(m[1].trim());

  // Tabelas acessadas
  const tabelas = [];
  const reFrom = /\.from\(['"`](\w+)['"`]\)/g;
  while ((m = reFrom.exec(conteudo)) !== null) {
    if (!tabelas.includes(m[1])) tabelas.push(m[1]);
  }

  return {
    arquivo: arquivo.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', ''),
    linhas: conteudo.split('\n').length,
    onClickHandlers: onClickHandlers.slice(0, 20),
    dbWrites: dbWrites.slice(0, 10),
    btnTexts: [...new Set(btnTexts)].slice(0, 20),
    tabelasAcessadas: tabelas,
  };
}

function checklistMecanico(handlers, nome) {
  const problemas = [];
  if (!handlers) return problemas;

  // Botões duplicados
  const cont = {};
  handlers.btnTexts.forEach(b => { cont[b] = (cont[b]||0)+1; });
  Object.entries(cont).forEach(([txt, n]) => {
    if (n > 1) problemas.push({ tipo: 'botao_duplicado',
      descricao: `Botão "${txt}" aparece ${n}x`, severidade: 'medio', heuristica: 'H4' });
  });

  // onClick vazio
  handlers.onClickHandlers.forEach(h => {
    if (h === '() => {}' || h === 'undefined' || h === 'null') {
      problemas.push({ tipo: 'handler_vazio', descricao: `onClick vazio: ${h}`,
        severidade: 'critico', heuristica: 'H1' });
    }
  });

  // Fornecedor sem tabela contatos
  const nMin = nome.toLowerCase();
  if (nMin.includes('fornecedor') || nMin.includes('cotacao')) {
    const temContatos = handlers.tabelasAcessadas.some(t =>
      t.toLowerCase().includes('contato') || t.toLowerCase().includes('contact'));
    if (!temContatos) problemas.push({
      tipo: 'side_effect_ausente',
      descricao: `Componente de fornecedor não acessa tabela de contatos`,
      severidade: 'alto', heuristica: 'H4',
      sugestao: 'Criar contato ao salvar fornecedor; notificar usuário para preencher dados',
    });
  }

  // Ação destrutiva sem AlertDialog
  const temDestruir = handlers.btnTexts.some(b => /excluir|deletar|remover|apagar/i.test(b));
  if (temDestruir) {
    try {
      const c = readFileSync(resolve(handlers.arquivo), 'utf8');
      if (!c.includes('AlertDialog')) {
        problemas.push({ tipo: 'acao_destrutiva_sem_confirmacao',
          descricao: `Botão destrutivo sem AlertDialog`, severidade: 'alto', heuristica: 'H3' });
      }
    } catch {}
  }

  return problemas;
}

async function analisarDOM(page, seletor, tipo) {
  return await page.evaluate(({ sel, tipo, T }) => {
    const els = document.querySelectorAll(sel);
    if (!els.length) return null;

    const el    = els[0];
    const rect  = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const violations = [];
    const warnings   = [];

    if (['button','overflow_menu','checkbox','icon_btn'].includes(tipo)) {
      if (rect.width < T.touch_min || rect.height < T.touch_min) {
        violations.push({ tipo: 'touch_target_pequeno',
          descricao: `${Math.round(rect.width)}×${Math.round(rect.height)}px — mínimo ${T.touch_min}px`,
          severidade: 'alto', heuristica: 'H7' });
      }
    }

    const top = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
    if (top && top !== el && !el.contains(top)) {
      const tr = top.getBoundingClientRect();
      if (tr.left < rect.right - T.overlap_px && tr.right > rect.left + T.overlap_px &&
          tr.top  < rect.bottom - T.overlap_px && tr.bottom > rect.top + T.overlap_px) {
        violations.push({ tipo: 'sobreposicao',
          descricao: `Sobreposto por <${top.tagName.toLowerCase()}> "${top.textContent?.trim().slice(0,30)}"`,
          severidade: 'critico', heuristica: 'H8' });
      }
    }

    if (parseFloat(style.opacity) < 0.3 && parseFloat(style.opacity) > 0) {
      warnings.push({ tipo: 'baixa_opacidade',
        descricao: `opacity: ${style.opacity}`, heuristica: 'H1' });
    }

    if (el.scrollWidth > el.clientWidth + 4) {
      warnings.push({ tipo: 'texto_truncado',
        descricao: `scrollWidth(${el.scrollWidth}) > clientWidth(${el.clientWidth})`,
        heuristica: 'H6' });
    }

    if (tipo === 'button') {
      const cont = {};
      Array.from(els).map(e => e.textContent?.trim().slice(0,40)).filter(Boolean)
        .forEach(t => { cont[t] = (cont[t]||0)+1; });
      const dups = Object.entries(cont).filter(([,n]) => n > 1).map(([t,n]) => `"${t}"×${n}`);
      if (dups.length) violations.push({ tipo: 'botao_duplicado_dom',
        descricao: `Duplicados no DOM: ${dups.join(' | ')}`,
        severidade: 'medio', heuristica: 'H4' });
    }

    return {
      instancias: els.length,
      amostra: {
        tag: el.tagName.toLowerCase(),
        texto: el.textContent?.trim().slice(0,60) || '',
        label: el.getAttribute('aria-label') || el.getAttribute('title') || '',
        dimensoes: { w: Math.round(rect.width), h: Math.round(rect.height) },
        posicao:   { x: Math.round(rect.left),  y: Math.round(rect.top) },
      },
      violations,
      warnings,
    };
  }, { sel: seletor, tipo, T });
}

async function run() {
  console.log(`\n🔬 Lastra — Inventário + Análise Estática`);
  console.log(`   Página: ${PAGINA} | Sprint: ${SPRINT}\n`);

  const rotaBase = Object.keys(ROTA_COMPONENTES)
    .sort((a, b) => b.length - a.length)
    .find(r => PAGINA.startsWith(r));
  const componentes = rotaBase ? ROTA_COMPONENTES[rotaBase] : [];

  const codigoExtraido     = {};
  const problemasEstaticos = [];

  console.log(`📂 Extraindo handlers (${componentes.length} componentes)...`);
  for (const comp of componentes) {
    const h = extrairHandlers(comp);
    if (h) {
      codigoExtraido[comp] = h;
      const probs = checklistMecanico(h, comp);
      if (probs.length > 0) problemasEstaticos.push({ componente: comp, problemas: probs });
      console.log(`  ✅ ${comp} — ${h.linhas}L | tabelas: ${h.tabelasAcessadas.join(', ')||'nenhuma'}`);
    } else {
      console.log(`  ⬜ ${comp} — não encontrado`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await ctx.newPage();

  const successObras = await autenticarENavegar(page, '/obras', { timeout: 10000 });
  if (successObras) {
    await page.waitForTimeout(1500);
    await page.locator('[data-obra-id="a1000000-0000-0000-0000-000000000001"]').first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  const successPage = await autenticarENavegar(page, PAGINA, { timeout: 12000 });
  if (!successPage) throw new Error("Falha de autenticação na página alvo");
  await page.waitForTimeout(2500);

  const inventario   = {};
  const violacoesDOM = [];

  console.log(`\n🔍 Varrendo DOM...`);
  for (const { tipo, seletor } of TIPOS) {
    const r = await analisarDOM(page, seletor, tipo);
    if (!r) { console.log(`  ⬜ ${tipo}`); continue; }
    inventario[tipo] = r;
    if (r.violations.length > 0) violacoesDOM.push({ tipo, ...r });
    const icon = r.violations.length > 0 ? '❌' : r.warnings.length > 0 ? '⚠️ ' : '✅';
    console.log(`  ${icon} ${tipo.padEnd(18)} ${r.instancias}x${r.violations.length > 0 ? ` — ${r.violations.length} violação(ões)` : ''}`);
  }

  await browser.close();

  const interativos   = ['button','overflow_menu','composicao_row','etapa_row','checkbox'];
  const escopoCaptura = [];
  const escopoIgnorar = [];

  for (const [tipo, dados] of Object.entries(inventario)) {
    const temViolacao = dados.violations.length > 0;
    const temWarning  = dados.warnings.length > 0 && interativos.includes(tipo);
    const compProb    = problemasEstaticos.length > 0;
    if (temViolacao || temWarning || compProb) {
      escopoCaptura.push({ tipo, instancias: dados.instancias,
        estados: inferirEstados(tipo),
        motivo: temViolacao ? `${dados.violations.length} violação(ões)` :
                temWarning  ? 'warning em elemento interativo' : 'componente com problema estático' });
    } else {
      escopoIgnorar.push({ tipo, instancias: dados.instancias });
    }
  }

  const L = [];
  L.push(`LASTRA — INVENTÁRIO DE ELEMENTOS INTERATIVOS`);
  L.push(`⚠️  PRÓXIMA ETAPA: Enviar este arquivo para Claude (análise heurística)`);
  L.push(`Página: ${PAGINA} | Sprint: ${SPRINT} | ${new Date().toLocaleString('pt-BR')}`);
  L.push(``);
  L.push(`${'═'.repeat(60)}`);
  L.push(`1. ANÁLISE DE CÓDIGO (Checklist Mecânico)`);
  L.push(`${'═'.repeat(60)}`);

  if (problemasEstaticos.length === 0) {
    L.push(`✅ Nenhum problema mecânico em ${componentes.length} componentes.`);
  } else {
    for (const { componente, problemas } of problemasEstaticos) {
      L.push(`\n[${componente}]`);
      for (const p of problemas) {
        const ic = p.severidade === 'critico' ? '🔴' : p.severidade === 'alto' ? '🟠' : '🟡';
        L.push(`  ${ic} [${p.severidade.toUpperCase()}] ${p.descricao}`);
        L.push(`     Heurística: ${H[p.heuristica]}`);
        if (p.sugestao) L.push(`     Sugestão: ${p.sugestao}`);
      }
    }
  }

  L.push(``, `${'═'.repeat(60)}`);
  L.push(`2. ANÁLISE DOM (Camada 0)`);
  L.push(`${'═'.repeat(60)}`);

  if (violacoesDOM.length === 0) {
    L.push(`✅ Nenhuma violação DOM detectada.`);
  } else {
    for (const v of violacoesDOM) {
      L.push(`\n[${v.tipo.toUpperCase()}] ${v.instancias}x`);
      L.push(`  Amostra: "${v.amostra.texto}" — ${v.amostra.dimensoes.w}×${v.amostra.dimensoes.h}px`);
      for (const viol of v.violations) {
        const ic = viol.severidade === 'critico' ? '🔴' : viol.severidade === 'alto' ? '🟠' : '🟡';
        L.push(`  ${ic} ${viol.descricao}`);
        L.push(`     ${H[viol.heuristica]}`);
      }
    }
  }

  L.push(``, `${'═'.repeat(60)}`);
  L.push(`3. HANDLERS EXTRAÍDOS`);
  L.push(`${'═'.repeat(60)}`);
  for (const [comp, d] of Object.entries(codigoExtraido)) {
    L.push(`\n[${comp}] — ${d.arquivo}`);
    L.push(`  Tabelas acessadas: ${d.tabelasAcessadas.join(', ') || 'nenhuma'}`);
    L.push(`  DB writes: ${d.dbWrites.map(w=>`${w.fn}(${w.op})`).join(', ') || 'nenhum'}`);
    L.push(`  Botões: ${d.btnTexts.join(' | ') || 'nenhum'}`);
    L.push(`  onClick handlers: ${d.onClickHandlers.length}`);
  }

  L.push(``, `${'═'.repeat(60)}`);
  L.push(`4. ESCOPO DE CAPTURA RECOMENDADO`);
  L.push(`${'═'.repeat(60)}`);
  L.push(`Capturar ${escopoCaptura.length} tipos | Ignorar ${escopoIgnorar.length} tipos`);
  L.push(`Parâmetro: --escopo ${escopoCaptura.map(e=>e.tipo).join(',')}`);
  L.push(``);
  for (const e of escopoCaptura) {
    L.push(`📸 ${e.tipo} (${e.instancias}x) — ${e.motivo}`);
    L.push(`   Estados: ${e.estados.join(', ')}`);
  }
  L.push(`\nIgnorados (sem violações):`);
  escopoIgnorar.forEach(e => L.push(`  ✅ ${e.tipo} (${e.instancias}x)`));

  L.push(``, `${'═'.repeat(60)}`);
  L.push(`PRÓXIMOS PASSOS`);
  L.push(`${'═'.repeat(60)}`);
  L.push(`1. Enviar este .txt para Claude`);
  L.push(`2. Claude faz análise heurística completa + define problemas`);
  L.push(`3. Rodar capturar_estados.mjs (modelo: Gemini Flash ou terminal):`);
  L.push(`   node src/_auditoria/capturar_estados.mjs \\`);
  L.push(`     --sprint ${SPRINT} --pagina "${PAGINA}" \\`);
  L.push(`     --escopo ${escopoCaptura.map(e=>e.tipo).join(',')}`);
  L.push(`4. Enviar screenshots + relatório para Claude`);
  L.push(`5. Sprint de correção com Sonnet 4.6`);

  const txt  = L.join('\n');
  const json = { pagina: PAGINA, sprint: SPRINT, timestamp: TIMESTAMP,
    componentes, codigoExtraido, inventario, problemasEstaticos,
    violacoesDOM, escopoCaptura, escopoIgnorar };

  const base = `inventario_${SLUG}_${TIMESTAMP}`;
  writeFileSync(join(OUT_DIR, `${base}.txt`),  txt);
  writeFileSync(join(OUT_DIR, `${base}.json`), JSON.stringify(json, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Inventário concluído`);
  console.log(`📄 Enviar para Claude: ${OUT_DIR}\\${base}.txt`);
  console.log(`${'═'.repeat(60)}\n`);
}

run().catch(console.error);
