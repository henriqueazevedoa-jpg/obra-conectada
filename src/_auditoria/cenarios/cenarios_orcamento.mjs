/**
 * Lastra — Cenários comportamentais do Orçamento
 *
 * Uso (via rodar_testes.mjs — não executar diretamente):
 *   node src/_auditoria/rodar_testes.mjs --sprint sprint-c --modulo orcamento
 */

export const CENARIOS_ORCAMENTO = [

  // ── CENÁRIO 1 — Trocar obra atualiza o orçamento ────────────
  {
    id: 'ORC-001',
    nome: 'Trocar obra atualiza dados do orçamento',
    critico: true,
    passos: async (page, BASE) => {
      // Selecionar Obra 1
      await page.goto(`${BASE}/obras`);
      await page.waitForSelector('[data-obra-id="a1000000-0000-0000-0000-000000000001"]', { timeout: 10000 }).catch(() => {});
      const obra1 = page.locator('[data-obra-id="a1000000-0000-0000-0000-000000000001"]').first();
      if (!await obra1.isVisible()) return { ok: false, motivo: 'Obra 1 não encontrada — seed não aplicado?' };
      await obra1.click();
      await page.waitForTimeout(2000);

      await page.goto(`${BASE}/orcamento`);
      await page.waitForTimeout(3000);
      const etapa1 = await page.textContent('.etapa-nome, [data-etapa-nome]').catch(() => null)
        ?? await page.locator('text=Serviços Preliminares').first().textContent().catch(() => null);

      // Selecionar Obra 3
      await page.goto(`${BASE}/obras`);
      await page.waitForSelector('[data-obra-id="a3000000-0000-0000-0000-000000000001"]', { timeout: 10000 }).catch(() => {});
      const obra3 = page.locator('[data-obra-id="a3000000-0000-0000-0000-000000000001"]').first();
      await obra3.click();
      await page.waitForTimeout(2000);

      await page.goto(`${BASE}/orcamento`);
      await page.waitForTimeout(3000);
      const etapa3 = await page.locator('text=Estrutura Metálica').first().isVisible().catch(() => false);

      const passou = etapa3 === true;
      return {
        ok: passou,
        motivo: passou ? null : `Dados não atualizaram ao trocar obra. Etapa1: "${etapa1}", Obra3 mostra Estrutura Metálica: ${etapa3}`,
        detalhe: { etapa1, etapa3_visivel: etapa3 },
      };
    },
  },

  // ── CENÁRIO 2 — KPIs do dashboard batem com o seed ─────────
  {
    id: 'ORC-002',
    nome: 'KPIs do orçamento refletem dados reais',
    critico: true,
    passos: async (page, BASE) => {
      // Selecionar Obra 1 (total esperado: R$ 468.720)
      await page.goto(`${BASE}/obras`);
      await page.waitForSelector('[data-obra-id="a1000000-0000-0000-0000-000000000001"]', { timeout: 10000 }).catch(() => {});
      await page.locator('[data-obra-id="a1000000-0000-0000-0000-000000000001"]').first().click();
      await page.waitForTimeout(2000);

      await page.goto(`${BASE}/orcamento`);
      await page.waitForTimeout(3500);

      const totalText = await page.locator('text=/R\\$.*468|R\\$.*60[.,]0|R\\$.*170[.,]210/i').first().textContent().catch(() => null);
      const temTotal = totalText !== null;

      // Verificar KPI "Sem Preço" — Obra 1 tem 4 composições sem preço
      const semPrecoEl = await page.locator('text=/sem preço|Sem Preço/i').first().isVisible().catch(() => false);

      return {
        ok: temTotal,
        motivo: temTotal ? null : 'Total do orçamento não aparece ou está incorreto',
        detalhe: { totalText, semPrecoVisivel: semPrecoEl },
      };
    },
  },

  // ── CENÁRIO 3 — Curva ABC tem itens ────────────────────────
  {
    id: 'ORC-003',
    nome: 'Curva ABC exibe itens com dados reais',
    critico: false,
    passos: async (page, BASE) => {
      await page.goto(`${BASE}/obras`);
      await page.waitForTimeout(3000);
      await page.locator('[data-obra-id="a3000000-0000-0000-0000-000000000001"]').first().click();
      await page.waitForTimeout(2000);

      await page.goto(`${BASE}/orcamento`);
      await page.waitForTimeout(3500);

      // Obra 3 tem estrutura metálica como item Classe A
      const temClasseA = await page.locator('text=/Classe A|classe a|A •/i').first().isVisible().catch(() => false);
      const temEstrutura = await page.locator('text=/Estrutura metálica|metálica/i').first().isVisible().catch(() => false);

      return {
        ok: temClasseA,
        motivo: temClasseA ? null : 'Curva ABC não exibe itens Classe A',
        detalhe: { temClasseA, temEstrutura },
      };
    },
  },

  // ── CENÁRIO 4 — Planilha exibe etapas corretas ──────────────
  {
    id: 'ORC-004',
    nome: 'Aba Planilha exibe etapas da obra selecionada',
    critico: true,
    passos: async (page, BASE) => {
      await page.goto(`${BASE}/obras`);
      await page.waitForSelector('[data-obra-id="a2000000-0000-0000-0000-000000000001"]', { timeout: 10000 }).catch(() => {});
      await page.locator('[data-obra-id="a2000000-0000-0000-0000-000000000001"]').first().click();
      await page.waitForTimeout(2000);

      await page.goto(`${BASE}/orcamento?tab=planilha`);
      await page.waitForTimeout(3500);

      // Obra 2 tem etapa "Elevador"
      const temElevador = await page.locator('text=Elevador').first().isVisible().catch(() => false);
      // Não deve mostrar etapa da Obra 1
      const temCobertura = await page.locator('text=Telha cerâmica francesa').first().isVisible().catch(() => false);

      const passou = temElevador && !temCobertura;
      return {
        ok: passou,
        motivo: passou ? null : `Planilha mostra dados incorretos. Elevador(Obra2): ${temElevador}, Telha(Obra1): ${temCobertura}`,
        detalhe: { temElevador, temCobertura },
      };
    },
  },

  // ── CENÁRIO 5 — Cotação exibe fornecedores ──────────────────
  {
    id: 'ORC-005',
    nome: 'Aba Cotação exibe cotações da obra',
    critico: false,
    passos: async (page, BASE) => {
      await page.goto(`${BASE}/obras`);
      await page.waitForTimeout(3000);
      await page.locator('[data-obra-id="a3000000-0000-0000-0000-000000000001"]').first().click();
      await page.waitForTimeout(2000);

      await page.goto(`${BASE}/orcamento?tab=cotacao`);
      await page.waitForTimeout(3500);

      const temMetalPro = await page.locator('text=MetalPro').first().isVisible().catch(() => false);
      const temConcremax = await page.locator('text=Concremax').first().isVisible().catch(() => false);

      return {
        ok: temMetalPro || temConcremax,
        motivo: (temMetalPro || temConcremax) ? null : 'Fornecedores da cotação não aparecem',
        detalhe: { temMetalPro, temConcremax },
      };
    },
  },
];
