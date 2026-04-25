import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:8080';
const EMAIL = 'admin@applastra.com.br';
const SENHA = 'admin123';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  const report = [];
  const log = (msg) => { console.log(msg); report.push(msg); };

  // Setup console capture
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', error => {
    consoleErrors.push(`[PAGE ERROR] ${error.message}`);
  });

  log('--- INICIANDO AUDITORIA ---');

  // Login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', SENHA);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/obras`);
  log('✅ Login realizado.');

  // 1. Abrir /orcamento com Obra 1
  await page.waitForSelector('[data-obra-id="a1000000-0000-0000-0000-000000000001"]');
  await page.locator('[data-obra-id="a1000000-0000-0000-0000-000000000001"]').click();
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/orcamento`);
  await page.waitForTimeout(3000); // wait for data
  log('\n--- ABA VISÃO GERAL : Obra 1 (Vila Nova) ---');
  
  // Screenshots and basic checks
  await page.screenshot({ path: 'src/_auditoria/screenshots/audit_visao_geral_obra1.png', fullPage: true });
  
  const kpis = await page.locator('.kpi-card, [data-kpi]').allInnerTexts().catch(() => []);
  log(`KPIs encontrados:\n${kpis.join('\n')}`);
  
  const curvaAbcText = await page.locator('.curva-abc, [data-curva-abc]').allInnerTexts().catch(() => []);
  log(`Curva ABC:\n${curvaAbcText.join('\n')}`);
  
  const hasCotarA = await page.locator('text=/Cotar.*A/i').isVisible().catch(() => false);
  log(`Botão "Cotar itens A" existe: ${hasCotarA}`);

  const etapasText = await page.locator('.etapa-row, [data-etapa]').allInnerTexts().catch(() => []);
  log(`Etapas listadas (${etapasText.length}):`);

  // 3. Trocar para Obra 2
  await page.goto(`${BASE}/obras`);
  await page.waitForSelector('[data-obra-id="a2000000-0000-0000-0000-000000000001"]');
  await page.locator('[data-obra-id="a2000000-0000-0000-0000-000000000001"]').click();
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/orcamento`);
  await page.waitForTimeout(3000);
  log('\n--- ABA VISÃO GERAL : Obra 2 (Alphaville) ---');
  const kpisObra2 = await page.locator('.kpi-card, [data-kpi]').allInnerTexts().catch(() => []);
  log(`KPIs encontrados (Obra 2):\n${kpisObra2.join('\n')}`);

  // 4. Trocar para Obra 3
  await page.goto(`${BASE}/obras`);
  await page.waitForSelector('[data-obra-id="a3000000-0000-0000-0000-000000000001"]');
  await page.locator('[data-obra-id="a3000000-0000-0000-0000-000000000001"]').click();
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/orcamento`);
  await page.waitForTimeout(3000);
  log('\n--- ABA VISÃO GERAL : Obra 3 (Cajamar) ---');
  const classeAObra3 = await page.locator('text=/Classe A/i').allInnerTexts().catch(() => []);
  log(`Itens Classe A encontrados:\n${classeAObra3.join('\n')}`);

  // 5. Voltar para Obra 1 -> aba Planilha
  await page.goto(`${BASE}/obras`);
  await page.waitForSelector('[data-obra-id="a1000000-0000-0000-0000-000000000001"]');
  await page.locator('[data-obra-id="a1000000-0000-0000-0000-000000000001"]').click();
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/orcamento?tab=planilha`);
  await page.waitForTimeout(3000);
  log('\n--- ABA PLANILHA : Obra 1 ---');
  await page.screenshot({ path: 'src/_auditoria/screenshots/audit_planilha_obra1.png', fullPage: true });

  // Composicoes expand arrow
  const rows = await page.locator('[data-composicao-id], tr.composicao-row').all();
  log(`Total de linhas de composição: ${rows.length}`);
  for (let i = 0; i < rows.length; i++) {
    const text = await rows[i].innerText();
    const hasArrow = await rows[i].locator('svg.lucide-chevron-right, svg.lucide-chevron-down').isVisible().catch(() => false);
    log(`Linha [${text.split('\n')[0]}] tem seta: ${hasArrow}`);
    // Hover to check menu
    await rows[i].hover();
    await page.waitForTimeout(100);
    const hasMenu = await rows[i].locator('button:has(.lucide-more-horizontal), [data-actions]').isVisible().catch(() => false);
    log(`  Menu visível no hover: ${hasMenu}`);
  }

  // Inline editing check (try to click quantity)
  log(`Verificando edição inline...`);
  const firstQty = page.locator('td.quantidade, [data-cell="quantidade"]').first();
  if (await firstQty.isVisible().catch(() => false)) {
    await firstQty.click();
    await page.waitForTimeout(500);
    const isInput = await page.locator('input[type="number"]').isVisible().catch(() => false);
    log(`  Clique em quantidade abre input: ${isInput}`);
  } else {
    log(`  Célula de quantidade não encontrada para teste.`);
  }

  // Toolbar
  const hasOrcamentoRapido = await page.locator('text=/Orçamento Rápido/i').isVisible().catch(() => false);
  log(`Botão Orçamento Rápido: ${hasOrcamentoRapido}`);
  const hasNovaEtapa = await page.locator('text=/Nova etapa/i').isVisible().catch(() => false);
  log(`Botão Nova etapa: ${hasNovaEtapa}`);
  const bdiBadge = await page.locator('text=/BDI/i').first().innerText().catch(() => 'Não encontrado');
  log(`Badge BDI: ${bdiBadge}`);

  // 7. Aba Cotação & Preços
  await page.goto(`${BASE}/orcamento?tab=cotacao`);
  await page.waitForTimeout(3000);
  log('\n--- ABA COTAÇÃO & PREÇOS ---');
  await page.screenshot({ path: 'src/_auditoria/screenshots/audit_cotacao.png', fullPage: true });

  const btnEnviar = await page.locator('button:has-text("Enviar Cotação"), button:has-text("Enviar Cotações")').first();
  if (await btnEnviar.isVisible()) {
    await btnEnviar.click();
    await page.waitForTimeout(1000);
    const title = await page.locator('[role="dialog"] h2').first().innerText().catch(() => 'Sem título');
    log(`Drawer de Enviar Cotação abriu: ${title}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  const btnInserir = await page.locator('button:has-text("Inserir Preços"), button:has-text("Inserir Preço")').first();
  if (await btnInserir.isVisible()) {
    await btnInserir.click();
    await page.waitForTimeout(1000);
    const title = await page.locator('[role="dialog"] h2').first().innerText().catch(() => 'Sem título');
    log(`Drawer de Inserir Preços abriu: ${title}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Add Fornecedor
  log(`Testando inclusão de fornecedor...`);
  const btnFornecedor = await page.locator('button:has-text("Fornecedor")').first();
  if (await btnFornecedor.isVisible()) {
    await btnFornecedor.click();
    await page.waitForTimeout(1000);
    const inputNome = page.locator('[role="dialog"] input[placeholder*="Nome"], [role="dialog"] input[name="nome"]').first();
    if (await inputNome.isVisible()) {
      await inputNome.fill('Fornecedor Teste Auto');
      await page.locator('[role="dialog"] button:has-text("Salvar")').click();
      await page.waitForTimeout(2000);
      log(`  Fornecedor inserido via UI.`);
    } else {
      log(`  Input de nome não encontrado no modal.`);
      await page.keyboard.press('Escape');
    }
  } else {
    log(`  Botão + Fornecedor não encontrado.`);
  }

  log(`\n--- CONSOLE LOGS ---`);
  log(consoleErrors.join('\n'));

  fs.writeFileSync('src/_auditoria/audit_report.txt', report.join('\n'));
  console.log('Auditoria concluída. Relatório salvo.');
  await browser.close();
}

run().catch(console.error);
