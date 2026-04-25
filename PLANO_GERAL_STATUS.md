================================================================
OBRACONECTADA (LASTRA) — STATUS DOS PROMPTS
Atualizar ao fim de cada sprint
================================================================

COMO USAR: Ao iniciar nova sessão, leia este arquivo primeiro.
Ao concluir um sprint, atualize o status aqui.

----------------------------------------------------------------
STATUS ATUAL — Atualizado em: 24/04/2026
----------------------------------------------------------------

✅ CONCLUÍDOS (Prompts 1-55B):
  - [x] Migração inicial e Setup Supabase (5300a98)
  - [x] Onboarding e Schema Backend (16b99ef, 594fb3e)
  - [x] Refatoração de ObrasContext e RLS (2dabf5d, 39c30c5)
  - [x] Onboarding Flow e Company Context (b6eedac)
  - [x] Ações de Equipe e UI Polishing (c787f06)
  - [x] Sprint 55A: Topbar Lastra e Sidebar Navigation
  - [x] Sprint 55B: Wizard de Importação do Orçamento

⬜ SPRINT 55C — Cotação reformulada: split view + comparativo

----------------------------------------------------------------
GRUPO VISUAL — Refinamento e estabilização (2026-04)
Objetivo: sistema estável e visualmente consistente para produção
Regra: cada sprint tem critério de saída binário antes de avançar
----------------------------------------------------------------

✅ SPRINT-A — Bugs críticos (sem tocar UI)
  Escopo:
    - Nome ObraFácil → Lastra em toda a aplicação
    - Bloco DEV na tela de login condicionado a import.meta.env.DEV
    - Sidebar: ícone ativo segue rota atual em todas as páginas
    - Erros 400: /painel, /diario, /agenda, /admin/calculadora
    - Calculadora pública em branco (/calculadora)
    - Tabs de configurações não lendo ?tab= da URL
    - TS2367 em ComposicaoRow.tsx (FonteBadge + 'sugerido')
  Critério de saída:
    - [ ] tsc --noEmit zero erros novos
    - [ ] Login sem bloco DEV em aba anônima
    - [ ] Topbar "Lastra" em todas as páginas
    - [ ] Sidebar correto em /orcamento, /cronograma, /financeiro, /diario
    - [ ] Zero erros 400 nas 4 páginas
    - [ ] /calculadora renderiza
    - [ ] /configuracoes?tab=calendario abre aba correta
    - [x] Wizard de Importação do Orçamento
    - [x] Correções no core de salvamento (Supabase upsert cascade)

✅ SPRINT-D3 — Cronograma: Visual & Calendário
  Escopo: Gantt Visual, Interações (Linhas, Baseline, Tooltips), Configuração de Calendário por Obra
  Status: ✅ Concluído (Fix syntax error aplicado)

⬜ SPRINT-B — Design system global
  Escopo:
    - Background conteúdo: #fff → #F7F7FB
    - Semântica de cor unificada (PT-022)
    - KPI cards: mini-contexto e tendência
    - Empty states: reduzir altura, ícone menor
    - Sidebar: labels de texto visíveis (tooltip ou expansão)
    - Linha "hoje" no cronograma some no empty state
    - Desvio -100% no custo real: verde → cinza neutro
    - Banner compras remove quando sem dados
    - KPI tarefas atrasadas=0: âmbar → verde/neutro
  Critério de saída:
    - [ ] tsc --noEmit zero erros novos
    - [ ] Screenshots antes/depois de 5 páginas afetadas
    - [ ] Nenhuma regressão em páginas não afetadas
    - [ ] Cores semânticas corretas em todas as páginas

⬜ SPRINT-C — Dashboard do orçamento
  Escopo: redesign KPIs + layout sem scroll em 1080p
  Critério: dashboard carrega e encaixa sem rolagem

⬜ SPRINT-D — Seed e dados demo
  Escopo: 3 obras com dados ricos em todos os módulos
  Critério: nenhuma página mostra empty state indevido

✅ SPRINT-D2 — Cronograma: Fixes de lógica + Wizard Importação
  Escopo: Batch baseline, progresso com peso, FF/SF, Wizard 3 passos
  Critério: tsc --noEmit sem erros e fluxos concluídos

⬜ SPRINT-E — Refinamento módulo a módulo
  Painel → Cronograma → Financeiro → Canteiro (um por sprint)

✅ SPRINT-E (CRON-B) — Cronograma: Outputs & Integrações
  Escopo: PDFs, modo apresentação, marcos vinculados a contratos, fluxo projetado
  Entregue em: 24/04/2026
  - [x] Bloco 1: PDF Proposta Comercial (gerarPropostaComercial, botão Estimativo)
  - [x] Bloco 2: PDF Cronograma de Obra (gerarCronogramaPdf, botão Analítico/Execução)
  - [x] Bloco 3: Modo Apresentação fullscreen (ModoApresentacao, ESC/setas)
  - [x] Bloco 4: Marcos — migration cronograma_marcos + hook + MarcosPanel + badge ◆
  - [x] Bloco 5: Fluxo Projetado — hook useFluxoCaixaProjetado + FluxoProjetadoTab (Curva S)
  - [x] tsc --noEmit zero erros novos
  Novos arquivos:
    src/hooks/useMarcos.ts
    src/hooks/useFluxoCaixaProjetado.ts
    src/components/cronograma/ModoApresentacao.tsx
    src/components/cronograma/MarcosPanel.tsx
    src/components/cronograma/FluxoProjetadoTab.tsx
    src/lib/pdf/propostaComercialPdf.ts
    src/lib/pdf/cronogramaPdf.ts

✅ SPRINT-F — Financeiro: Seed + Refinamentos Visuais PT-022
  Escopo: seed realista nas 3 obras fixas + correções de semântica de cor
  Entregue em: 25/04/2026
  Bloco 1 — Seed (via MCP Supabase):
  - [x] pagamentos: a1=12, a2=4, a3=10 (26 total) — pago/previsto/atrasado
  - [x] custo_real_itens: a1=8, a2=2, a3=10 (20 total) — por categoria/etapa
  - [x] recebiveis: a1=3, a2=1, a3=3 (7 total) — recebido/pendente
  Bloco 2 — Refinamentos Visuais:
  - [x] RecebiveisTab: corrigido calcStatus (status 'aberto' → 'pendente' alinhado ao banco)
  - [x] CustoRealTab: corrigido KPI Desvio (sem orçamento = neutro, não vermelho falso)
  - [x] Badges PT-022 já alinhados em PagamentosTab (getStatusStyle correto)
  - [x] tsc --noEmit zero erros


----------------------------------------------------------------
GRUPO J — Produto (quando sistema estável)
----------------------------------------------------------------

⬜ PROMPT 55 — Landing Page
⬜ PROMPT 56 — Onboarding
⬜ PROMPT 57 — Assistente IA

----------------------------------------------------------------
BACKLOG — Descobertos mas fora de escopo dos sprints ativos
----------------------------------------------------------------

(itens descobertos durante sprints entram aqui)
- Fix auth scripts Playwright centralizado em lib/auth.mjs
- GanttCanvasPanel.tsx syntax error corrigido (Sprint D3)
- Seed financeiro pendente (Sprint F em andamento) 🔄
- Hotfix visual orçamento pendente 🔄

----------------------------------------------------------------
REGRAS DE OPERAÇÃO
----------------------------------------------------------------

1. Ler PLANO_GERAL_STATUS.md + SESSION-TEMPLATE.md antes de qualquer sprint
2. Não avançar sprint sem confirmar critério de saída
3. Problemas descobertos fora do escopo → BACKLOG (não corrigir agora)
4. Atualizar este arquivo ao fim de cada sprint
5. tsc --noEmit é o portão de saída obrigatório
