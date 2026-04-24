import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function run() {
  const child = spawn('npm', ['run', 'dev'], { shell: true });
  await new Promise(r => setTimeout(r, 10000));
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Login
  await page.goto('http://127.0.0.1:8080/login');
  await page.fill('input[type="email"]', 'admin@obrafacil.dev');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://127.0.0.1:8080/obras', { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  // Select Obra
  try {
    const primeiraObra = page.locator('[data-obra-id], .obra-card, tr[data-id]').first();
    if (await primeiraObra.isVisible()) {
      await primeiraObra.click();
      await page.waitForTimeout(1500);
    }
  } catch(e) {}
  
  // Visit pages and collect logs
  const pagesToVisit = ['/painel', '/diario', '/agenda', '/admin/calculadora', '/calculadora'];
  
  for (const url of pagesToVisit) {
    console.log('\n--- ' + url + ' ---');
    const logs = [];
    const onConsole = msg => { if(msg.type() === 'error') logs.push(msg.text()); };
    page.on('console', onConsole);
    
    try {
      await page.goto('http://127.0.0.1:8080' + url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      logs.forEach(l => console.log('ERROR:', l));
    } catch(e) {
      console.log('CRASH:', e.message);
    }
    page.off('console', onConsole);
  }
  
  await browser.close();
  child.kill();
  process.exit(0);
}
run();
