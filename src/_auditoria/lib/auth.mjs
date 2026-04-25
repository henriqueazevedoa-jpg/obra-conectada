const BASE = 'http://localhost:8080';
const EMAIL = 'admin@applastra.com.br';
const SENHA = 'admin123'; // ajustar se diferente

export async function fazerLogin(page) {
  console.log('🔐 Fazendo login...');
  await page.goto(`${BASE}/login`, { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', SENHA);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForTimeout(1000); // Dar tempo para o Supabase salvar a sessão no localStorage
  console.log('✅ Login OK\n');
}

export async function autenticarENavegar(page, rota, opcoes = {}) {
  const { timeout = 5000 } = opcoes;
  const urlComBase = rota.startsWith('http') ? rota : `${BASE}${rota}`;

  console.log('→ navegando para: ' + rota);
  await page.goto(urlComBase);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Se caiu no login, autenticar e tentar de novo
  if (page.url().includes('/login')) {
    console.warn('⚠ redirecionado para login: ' + rota);
    await fazerLogin(page);
    
    console.log('↺ Reautenticado em: ' + rota);
    await page.goto(urlComBase);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }

  // Segunda verificação — se ainda está no login, erro explícito
  if (page.url().includes('/login')) {
    console.error('❌ Falha de autenticação em: ' + rota);
    return false;
  }

  return true;
}
