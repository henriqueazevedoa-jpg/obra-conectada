import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const outDir = 'src/_auditoria';
fs.mkdirSync(`${outDir}/screenshots`, { recursive: true });
fs.mkdirSync(`${outDir}/logs`, { recursive: true });
fs.mkdirSync(`${outDir}/schema`, { recursive: true });
fs.mkdirSync(`${outDir}/frontend`, { recursive: true });

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return e.stdout || e.message;
  }
}

// Helper: Recursively get files
function getFiles(dir, matchExt = ['.ts', '.tsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    if (filePath.includes('node_modules') || filePath.includes('_auditoria')) return;
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, matchExt));
    } else {
      if (!matchExt || matchExt.some(ext => filePath.endsWith(ext))) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const allTsFiles = getFiles('src', ['.ts', '.tsx']);

function grep(regex, filesArr) {
  let count = 0;
  let matches = [];
  filesArr.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (regex.test(line)) {
        count++;
        matches.push(`${f}:${idx+1}: ${line.trim()}`);
      }
    });
  });
  return { count, matches };
}

console.log('BLOCO 1 - TypeScript Errors & Code Smells');
const tscOutput = runCommand('npx tsc --noEmit');
const errorCount = (tscOutput.match(/error TS/g) || []).length;
fs.writeFileSync(`${outDir}/logs/tsc_errors.txt`, tscOutput + '\nTotal de erros:\n' + errorCount);

const tscFiles = {};
(tscOutput.match(/(.*?)\(\d+,\d+\): error TS/g) || []).forEach(match => {
  const file = match.split('(')[0].trim();
  tscFiles[file] = (tscFiles[file] || 0) + 1;
});
const tscFilesSorted = Object.entries(tscFiles).sort((a, b) => b[1] - a[1]).map(([f, c]) => `${c} ${f}`).join('\n');
fs.writeFileSync(`${outDir}/logs/tsc_por_arquivo.txt`, tscFilesSorted);

let codeSmells = '=== CODE SMELLS ===\nsupabase as any:\n';
codeSmells += grep(/supabase as any/, allTsFiles).count + '\n';
codeSmells += 'ts-ignore:\n';
codeSmells += grep(/@ts-ignore|@ts-expect-error/, allTsFiles).count + '\n';
codeSmells += 'TODO/FIXME:\n';
codeSmells += grep(/TODO|FIXME|HACK|XXX/, allTsFiles).matches.join('\n') + '\n';
codeSmells += 'console.error hardcoded:\n';
codeSmells += grep(/console\.error|console\.warn/, allTsFiles).count + '\n';
fs.writeFileSync(`${outDir}/logs/code_smells.txt`, codeSmells);

console.log('BLOCO 3 - Map Routes and Components');
if (fs.existsSync('src/App.tsx')) {
  fs.writeFileSync(`${outDir}/logs/rotas.txt`, grep(/path=|Route|element=/, ['src/App.tsx']).matches.join('\n'));
}
fs.writeFileSync(`${outDir}/logs/hooks.txt`, getFiles('src/hooks').join('\n'));
fs.writeFileSync(`${outDir}/logs/contexts.txt`, getFiles('src/contexts').join('\n'));
fs.writeFileSync(`${outDir}/logs/queries_sem_tipo.txt`, "Calculated via node script:\n" + grep(/\.from\(/, allTsFiles).count + " total .from() calls\n");
fs.writeFileSync(`${outDir}/logs/imports_locais.txt`, grep(/^import.*\.\//, allTsFiles).matches.slice(0, 200).join('\n'));

console.log('BLOCO 5 - Frontend Files');
try { fs.copyFileSync('src/App.tsx', `${outDir}/frontend/App.tsx`); } catch (e) {}
try { fs.copyFileSync('src/components/AppLayout.tsx', `${outDir}/frontend/AppLayout.tsx`); } catch (e) {}
try { fs.copyFileSync('src/components/Sidebar.tsx', `${outDir}/frontend/Sidebar.tsx`); } catch (e) {}
getFiles('src/contexts', ['.tsx']).forEach(f => {
  try { fs.copyFileSync(f, `${outDir}/frontend/${path.basename(f)}`); } catch(e){}
});

fs.writeFileSync(`${outDir}/logs/componentes_orcamento.txt`, getFiles('src/components/orcamento', ['.tsx']).map(f=>path.basename(f)).join('\n'));
fs.writeFileSync(`${outDir}/logs/componentes_cronograma.txt`, getFiles('src/components/cronograma', ['.tsx']).map(f=>path.basename(f)).join('\n'));
fs.writeFileSync(`${outDir}/logs/paginas.txt`, getFiles('src/pages', ['.tsx']).map(f=>path.basename(f)).join('\n'));

const sortedFiles = allTsFiles.map(f => ({ file: f, lines: fs.readFileSync(f, 'utf8').split('\n').length }))
  .sort((a,b) => b.lines - a.lines).slice(0,30).map(x => `${x.lines} ${x.file}`);
fs.writeFileSync(`${outDir}/logs/arquivos_grandes.txt`, sortedFiles.join('\n'));

console.log('BLOCO 6 - Queries 400/500');
fs.writeFileSync(`${outDir}/logs/total_queries.txt`, String(grep(/\.select|\.insert|\.update|\.delete/, allTsFiles).count));

let planoFiles = [];
if(fs.existsSync('src/hooks/useCalculadoraAcesso.ts')) planoFiles.push('src/hooks/useCalculadoraAcesso.ts');
if(fs.existsSync('src/contexts/CompanyContext.tsx')) planoFiles.push('src/contexts/CompanyContext.tsx');
fs.writeFileSync(`${outDir}/logs/queries_plano.txt`, grep(/plano\b|plan\b/, planoFiles).matches.join('\n'));
fs.writeFileSync(`${outDir}/logs/queries_role.txt`, grep(/role\b|is_admin|superadmin/, allTsFiles).matches.join('\n'));

console.log('BLOCO 4 - Screenshots');
const BASE = 'http://127.0.0.1:8080';
const OUT  = `${outDir}/screenshots`;
const EMAIL = 'admin@obrafacil.dev';
const SENHA = 'admin123'; 

const PAGINAS = [
  { rota: '/login',          nome: '00_login',          auth: false },
  { rota: '/onboarding',     nome: '01_onboarding',     auth: false },
  { rota: '/obras',          nome: '02_obras',           auth: true  },
  { rota: '/painel',         nome: '03_painel',          auth: true  },
  { rota: '/dashboard',      nome: '04_dashboard',       auth: true  },
  { rota: '/orcamento',               nome: '05_orcamento_visao_geral', auth: true },
  { rota: '/orcamento?tab=planilha',  nome: '06_orcamento_planilha',    auth: true },
  { rota: '/orcamento?tab=cotacao',   nome: '07_orcamento_cotacao',     auth: true },
  { rota: '/cronograma',     nome: '08_cronograma',      auth: true  },
  { rota: '/financeiro',                    nome: '09_financeiro',             auth: true },
  { rota: '/financeiro?tab=pagamentos',     nome: '10_financeiro_pagamentos',  auth: true },
  { rota: '/financeiro?tab=custo-real',     nome: '11_financeiro_custo_real',  auth: true },
  { rota: '/financeiro?tab=fluxo-caixa',   nome: '12_financeiro_fluxo',       auth: true },
  { rota: '/diario',         nome: '13_diario',          auth: true  },
  { rota: '/estoque',        nome: '14_estoque',         auth: true  },
  { rota: '/equipe',         nome: '15_equipe',          auth: true  },
  { rota: '/compras',        nome: '16_compras',         auth: true  },
  { rota: '/agenda',         nome: '17_agenda',          auth: true  },
  { rota: '/documentos',     nome: '18_documentos',      auth: true  },
  { rota: '/contatos',       nome: '19_contatos',        auth: true  },
  { rota: '/contratos',      nome: '20_contratos',       auth: true  },
  { rota: '/relatorios',     nome: '21_relatorios',      auth: true  },
  { rota: '/biblioteca',     nome: '22_biblioteca',      auth: true  },
  { rota: '/configuracoes',                        nome: '23_config_empresa',      auth: true },
  { rota: '/configuracoes?tab=calendario',         nome: '24_config_calendario',   auth: true },
  { rota: '/configuracoes?tab=orcamento',          nome: '25_config_orcamento',    auth: true },
  { rota: '/configuracoes?tab=calculadora',        nome: '26_config_calculadora',  auth: true },
  { rota: '/admin/dashboard',   nome: '27_admin_dashboard',    auth: true },
  { rota: '/admin/companies',   nome: '28_admin_companies',    auth: true },
  { rota: '/admin/plans',       nome: '29_admin_plans',        auth: true },
  { rota: '/admin/calculadora', nome: '30_admin_calculadora',  auth: true },
  { rota: '/admin/feedbacks',   nome: '31_admin_feedbacks',    auth: true },
  { rota: '/calculadora',       nome: '32_calculadora_publica', auth: false },
  { rota: '/perfil',            nome: '33_perfil',             auth: true  },
];

const RELATORIO = [];

async function captureScreenshots() {
  console.log('Iniciando dev server...');
  const child = spawn('npm', ['run', 'dev'], { shell: true, stdio: 'inherit' });
  await new Promise(r => setTimeout(r, 20000)); // wait for vite to start

  console.log('Iniciando Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(`PAGE_ERROR: ${err.message}`));

  console.log('Fazendo login...');
  try {
    await page.goto(`${BASE}/login`, { timeout: 15000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', SENHA);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/obras`, { timeout: 10000 });
    console.log('Login OK');
  } catch (e) {
    console.error('Falha no login:', e.message);
    await page.screenshot({ path: `${OUT}/LOGIN_FALHOU.png`, fullPage: true });
    await browser.close();
    child.kill();
    return;
  }

  try {
    await page.goto(`${BASE}/obras`, { timeout: 10000 });
    await page.waitForTimeout(2000);
    const primeiraObra = page.locator('[data-obra-id], .obra-card, tr[data-id]').first();
    if (await primeiraObra.isVisible()) {
      await primeiraObra.click();
      await page.waitForTimeout(1500);
      console.log('Obra selecionada');
    }
  } catch (e) {
    console.log('Não foi possível selecionar obra:', e.message);
  }

  for (const p of PAGINAS) {
    const errosPagina = [];
    const handler = msg => { if (msg.type() === 'error') errosPagina.push(msg.text()); };
    page.on('console', handler);

    let status = 'ok';
    let tempoMs = 0;

    try {
      if (!p.auth) {
        const pubContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const pubPage = await pubContext.newPage();
        const t0 = Date.now();
        await pubPage.goto(`${BASE}${p.rota}`, { timeout: 12000, waitUntil: 'networkidle' });
        tempoMs = Date.now() - t0;
        await pubPage.waitForTimeout(1500);
        await pubPage.screenshot({ path: `${OUT}/${p.nome}.png`, fullPage: true });
        await pubContext.close();
      } else {
        const t0 = Date.now();
        await page.goto(`${BASE}${p.rota}`, { timeout: 12000, waitUntil: 'networkidle' });
        tempoMs = Date.now() - t0;
        await page.waitForTimeout(2000); 
        await page.screenshot({ path: `${OUT}/${p.nome}.png`, fullPage: true });
      }
    } catch (e) {
      status = `ERRO: ${e.message.slice(0, 120)}`;
      try {
        await page.screenshot({ path: `${OUT}/${p.nome}_CRASH.png`, fullPage: true });
      } catch {}
    }

    page.off('console', handler);

    RELATORIO.push({
      rota: p.rota,
      nome: p.nome,
      status,
      tempo_ms: tempoMs,
      erros_console: errosPagina.length,
      erros_detalhe: errosPagina.slice(0, 5),
    });

    console.log(`${status === 'ok' ? '✅' : '❌'} ${p.nome} (${tempoMs}ms) — ${errosPagina.length} erros console`);
  }

  await browser.close();
  child.kill();

  fs.writeFileSync(
    `${outDir}/logs/relatorio_paginas.json`,
    JSON.stringify(RELATORIO, null, 2)
  );

  const resumo = RELATORIO.map(r =>
    `${r.status === 'ok' ? '✅' : '❌'} ${r.rota.padEnd(45)} ${r.tempo_ms}ms  ${r.erros_console} erros console`
    + (r.status !== 'ok' ? `\n   ↳ ${r.status}` : '')
    + (r.erros_detalhe.length ? `\n   ↳ ${r.erros_detalhe[0]}` : '')
  ).join('\n');

  fs.writeFileSync(`${outDir}/logs/resumo_paginas.txt`, resumo);

  console.log('BLOCO 7 - Gerar Relatorio Final');
  const schemaPath = fs.existsSync(`${outDir}/schema/contagem_dados.txt`) ? fs.readFileSync(`${outDir}/schema/contagem_dados.txt`, 'utf8') : "Ver schema/contagem_dados.txt";
  const relatorioFinal = `# Lastra — Auditoria do Sistema
Gerado em: ${new Date().toISOString()}

## 1. Erros TypeScript
${fs.readFileSync(`${outDir}/logs/tsc_por_arquivo.txt`, 'utf8')}

## 2. Status das Páginas
${fs.readFileSync(`${outDir}/logs/resumo_paginas.txt`, 'utf8')}

## 3. Arquivos Maiores
${fs.readFileSync(`${outDir}/logs/arquivos_grandes.txt`, 'utf8')}

## 4. Contagem de Dados no Banco
${schemaPath}

## 5. Code Smells
${fs.readFileSync(`${outDir}/logs/code_smells.txt`, 'utf8')}
`;

  fs.writeFileSync(`${outDir}/RELATORIO_AUDITORIA.md`, relatorioFinal);
  console.log('Auditoria concluída com sucesso!');
}

captureScreenshots().catch(e => {
  console.error(e);
  process.exit(1);
});
