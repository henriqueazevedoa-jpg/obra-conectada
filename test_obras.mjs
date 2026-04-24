import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login');
  await page.fill('input[type="email"]', 'admin@obrafacil.dev');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:8080/obras', { timeout: 10000 });
  await page.goto('http://localhost:8080/obras');
  await page.waitForTimeout(3000);
  await page.waitForTimeout(3000);
  const html = await page.content();
  fs.writeFileSync('obras_dom.html', html);
  console.log('Obras count in DOM:', (html.match(/data-obra-id/g) || []).length);
  await browser.close();
})();
