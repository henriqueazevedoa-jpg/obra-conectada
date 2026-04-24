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
[conteúdo original preservado — ver versão anterior]

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

⬜ SPRINT-E — Refinamento módulo a módulo
  Painel → Cronograma → Financeiro → Canteiro (um por sprint)

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
- Botões inline orçamento: substituir por menu ⋯ (descoberto Sprint-A)
- Badge lista duplicada na coluna T. do orçamento
- z-index rodapé planilha (linhas passam por cima)
- Nomes SINAPI em ALL CAPS na biblioteca (text-transform)
- Botão "Gerar PDF" em relatórios com baixo contraste

----------------------------------------------------------------
REGRAS DE OPERAÇÃO
----------------------------------------------------------------

1. Ler PLANO_GERAL_STATUS.md + SESSION-TEMPLATE.md antes de qualquer sprint
2. Não avançar sprint sem confirmar critério de saída
3. Problemas descobertos fora do escopo → BACKLOG (não corrigir agora)
4. Atualizar este arquivo ao fim de cada sprint
5. tsc --noEmit é o portão de saída obrigatório
