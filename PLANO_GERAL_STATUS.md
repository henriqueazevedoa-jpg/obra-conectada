================================================================
OBRACONECTADA (LASTRA) — STATUS DOS PROMPTS
Atualizar ao fim de cada sprint
================================================================

COMO USAR: Ao iniciar nova sessão, leia este arquivo primeiro.
Ao concluir um sprint, atualize o status aqui.

----------------------------------------------------------------
STATUS ATUAL — Atualizado em: 22/04/2026 (18h46)
----------------------------------------------------------------

✅ CONCLUÍDOS (Prompts 1-43 do plano):
- PROMPT 1  — Cotação: bug do stepper
- PROMPT 2  — Cotação: regras de filtragem
- PROMPT 3  — Cronograma Blocos 1-6 (CPM, SPI, baseline, Gantt)
- PROMPT 4  — Financeiro Sprint 0 (migration FK, badge Indireto)
- PROMPT 5  — Financeiro Sprint 1: Pagamentos
- PROMPT 6  — Financeiro Sprint 2: Custo Real
- PROMPT 7  — Financeiro Sprint 3: Fluxo de Caixa e DRE
- PROMPT 8  — Execução Sprint 1: Diário (cleanup UI)
- PROMPT 10 — Execução Sprint 3: Equipe
- PROMPT 11 — Execução Sprint 4: Agenda
- PROMPT 12 — Execução Sprint 5: Pedidos de Material & Recebimentos
- PROMPT 14 — Contatos: Melhorias
- PROMPT 15 — Links Públicos Sprint 1
- PROMPT 16 — Links Públicos Sprint 2
- PROMPT 17 — Links Públicos Sprint 3
- PROMPT 18 — Aceite de Convites e Cadastro
- PROMPT 19 — Usuários: Atribuição de obras
- PROMPT 20 — Cotação Sprint 1: Restaurar aba no Orçamento
- PROMPT 21 — Cotação Sprint 2: Reestruturar CotacaoCentral
- PROMPT 22 — Compras Sprint 1: ComprasCentral 4 abas
- PROMPT 23 — Compras Sprint 2: Alimentar preco_historico
- PROMPT 24 — Notificações Sprint A: Infraestrutura
- PROMPT 25 — Notificações Sprint B: Diário Reformulado
- PROMPT 26 — Notificações Sprint C: Checagem Semanal
- PROMPT 29 — MENU-1: Reestruturação
- PROMPT 30 — MENU-2: Separar Módulos
- PROMPT 31 — CFG-1: Página de Configurações
- PROMPT 33 — CRON-2: Amdahl
- PROMPT 34 — CRON-3: Aba Medição
- PROMPT 35 — CRON-4: Impedimentos
- PROMPT 36 — CRON-5: Configurações
- PROMPT 38 — Contratos-1: Migration
- PROMPT 37 — PERM-1: Permissões por módulo
- PROMPT 39 — Contratos-2: CRUD de contratos
- PROMPT 40 — Contratos-3: Aditivos
- PROMPT 41 — Contratos-4: Medições — criação e itens
- PROMPT 42 — Contratos-5: BM — PDF e aprovação virtual
- PROMPT 43 — Contratos-6: Financeiro — Recebíveis
- PROMPT 50 — Dashboard Painel da Obra: Briefing + KPIs
- PROMPT 51 — Dashboard Engenheiro
- PROMPT 52 — Dashboard Gestor
- PROMPT 53 — Dashboard Cliente
- PROMPT 54 — Relatórios: Galeria estruturada por categoria
- SPRINT 55A — Orçamento: PageShell/KPIs + Dashboard (Curva ABC, accordion etapas, banner)
  Inclui: correções pós-sprint (filtro __classe_a__, prevKpisRef estabilização)


⬛ PULADO:
- PROMPT 9  — Execução Sprint 2: Pendências
  Motivo: incorporada à Agenda (Sprint 4)

----------------------------------------------------------------
FILA DE EXECUÇÃO — ORDEM OBRIGATÓRIA
----------------------------------------------------------------

O número de referência é o do PLANO_GERAL.txt atualizado.

GRUPO A — Cotação/Compras reformulada
(Sem conflitos com nada. Executar agora.)

✅ PROMPT 20 — Cotação Sprint 1: Restaurar aba no Orçamento
✅ PROMPT 21 — Cotação Sprint 2: Reestruturar CotacaoCentral
✅ PROMPT 22 — Compras Sprint 1: ComprasCentral 4 abas
✅ PROMPT 23 — Compras Sprint 2: Alimentar preco_historico

GRUPO B — Notificações (infraestrutura primeiro)
(Sprint 24 deve rodar antes de todos os outros do grupo.)

✅ PROMPT 24 — Notificações Sprint A: Infraestrutura
               ← DESBLOQUEADOR: deve rodar antes de PROMPT 42
✅ PROMPT 25 — Notificações Sprint B: Diário Reformulado
               ← Deve rodar antes de PROMPT 34 (CRON-3)
✅ PROMPT 26 — Notificações Sprint C: Checagem Semanal
✅ PROMPT 27 — Notificações Sprint D: Automáticas nos módulos
✅ PROMPT 28 — Notificações Sprint E: Push e Email via Resend

GRUPO C — Cronograma avançado
(CRON-1 pode rodar junto com Grupo A. CRON-3 depende do PROMPT 25.)

✅ PROMPT 32 — CRON-1: Migration (pode rodar AGORA junto com Grupo A)
✅ PROMPT 33 — CRON-2: Amdahl — sugestão de duração
✅ PROMPT 34 — CRON-3: Aba Medição (APÓS PROMPT 25)
✅ PROMPT 35 — CRON-4: Impedimentos
✅ PROMPT 36 — CRON-5: Configurações — Calendário e Produtividade

GRUPO D — Menu e Configurações
(Executar após Grupos A e B para evitar conflitos de componentes.)

✅ PROMPT 29 — MENU-1: Reestruturação do menu lateral
✅ PROMPT 30 — MENU-2: Separar Diário/Estoque/Equipe
✅ PROMPT 31 — CFG-1: Página de Configurações

GRUPO E — Permissões
(Depende de CFG-1 do Grupo D.)

✅ PROMPT 37 — PERM-1: Permissões por módulo
               ← Deve rodar antes de PROMPT 39 (Contratos-2)

GRUPO F — Contratos e Medições
(Contratos-1 pode rodar cedo. Contratos-2 depende de PERM-1.
 Contratos-5 depende de PROMPT 24. Contratos-6 depende de Contratos-5.)

✅ PROMPT 38 — Contratos-1: Migration (pode rodar AGORA junto com Grupo A)
✅ PROMPT 39 — Contratos-2: CRUD de contratos
✅ PROMPT 40 — Contratos-3: Aditivos
✅ PROMPT 41 — Contratos-4: Medições — criação e itens
✅ PROMPT 42 — Contratos-5: BM — PDF e aprovação (APÓS PROMPT 24)
✅ PROMPT 43 — Contratos-6: Financeiro — Recebíveis
✅ PROMPT 44 — Contratos-7: BM na página de Relatórios

GRUPO G — Perfil e Admin
(Independente. Pode rodar em qualquer momento após Grupo D.)

✅ PROMPT 45 — Perfil: Foto + dados profissionais + ART
✅ PROMPT 46 — Admin Sprint 1: Correções e completude
✅ PROMPT 47 — Admin Sprint 2: Dois perfis de acesso
✅ PROMPT 48 — Admin Sprint 3: Dashboard de analytics
🔒 PROMPT 49 — Admin Sprint 4: Integração de cobrança (NÃO AGORA)

GRUPO H — Dashboards
(Depende de Grupos B, E e F concluídos.)

✅ PROMPT 50 — Dashboard Painel da Obra: Briefing + KPIs
✅ PROMPT 51 — Dashboard Engenheiro
✅ PROMPT 52 — Dashboard Gestor
✅ PROMPT 53 — Dashboard Cliente (link público reformulado)

GRUPO I — Relatórios
(Depende de Contratos-7 para BM e Dashboards para links.)

✅ PROMPT 54 — Relatórios: Galeria estruturada por categoria

GRUPO J — Produto
(Executar quando o sistema estiver pronto para venda.)

⬜ PROMPT 55 — Landing Page: Atualização completa (ADIADO — aguarda sistema estável)
⬜ PROMPT 56 — Onboarding: Fluxo de primeiro acesso
⬜ PROMPT 57 — Assistente IA: Guia contextual

----------------------------------------------------------------
GRUPO ORÇ — Reformulação do Orçamento (55A-55C)
(Sprint interno criado durante execução. Deriva do prompt de
Refatoração Completa do Módulo de Orçamento.)
----------------------------------------------------------------

✅ SPRINT 55A — Orçamento: PageShell/KPIs + Dashboard
  Partes 1 e 2 do prompt ORCAMENTO-REFACTOR.
  - OrcamentoCentral: PageShell + 4 KPIs via onKpisReady
  - OrcamentoDashboard: Curva ABC (BLOCO 1), accordion 3 níveis (BLOCO 2),
    gráfico pizza toggle (BLOCO 3), banner dica dismissível
  - Correções: filtro __classe_a__ no CotacaoCentral, prevKpisRef
  Commit: 3d89746 (main)

⬜ SPRINT 55B — Orçamento: Planilha modo denso + Popovers
  Partes 3, 4 e 5 do prompt ORCAMENTO-REFACTOR.
  - OrcamentoEditor: layout Excel (~36px/linha), campo preço sem spinner,
    navegação Tab/Enter/Shift+Enter, toolbar reorganizada
  - SinapiPricePopover.tsx: popover 420px ancorado na linha, busca
    sinapi_insumos + sinapi_composicoes + preco_historico, badge fonte
  - ListaCotacaoPopover.tsx: popover 280px, criar lista inline, bulk action
    com checkbox + toolbar flutuante
  - INSERT em preco_historico nos gatilhos 1 (onBlur editor) e 2 (Usar SINAPI)

⬜ SPRINT 55C — Cotação reformulada: split view + comparativo
  Parte 6 do prompt ORCAMENTO-REFACTOR.
  - Painel ABC colapsável no topo da aba
  - Split view esquerda/direita (260px lista + restante detalhe)
  - Drag-and-drop entre listas via @dnd-kit/sortable
  - Tabela comparativa com highlight melhor preço por linha/fornecedor
  - "Aplicar fornecedor X ao orçamento" (batch update preços)
  - Edição inline onBlur → UPDATE cotacao_links.respostas
  - INSERT em preco_historico nos gatilhos 3 (edição inline) e 4 (aplicar fornecedor)
  - Garantir que CotacaoPublicaPage.handleSubmit insere preco_historico (gatilho 1)

GRUPO K — Estoque Global (ADIADO)
(Retomar após Dashboards funcionando com dados reais.)

🔒 PROMPT 58 — Estoque Global

----------------------------------------------------------------
SEQUÊNCIA OTIMIZADA PARA EXECUÇÃO IMEDIATA
----------------------------------------------------------------

Rodadas que podem ser iniciadas agora em paralelo:

RODADA 1 (sem dependências entre si):
  PROMPT 20 — Cotação Sprint 1
  PROMPT 24 — Notificações Sprint A (infraestrutura)
  PROMPT 32 — CRON-1 (migration)
  PROMPT 38 — Contratos-1 (migration)

RODADA 2 (após Rodada 1):
  PROMPT 21 — Cotação Sprint 2
  PROMPT 22 — Compras Sprint 1
  PROMPT 25 — Notificações Sprint B (Diário)
  PROMPT 33 — CRON-2 (Amdahl)
  PROMPT 35 — CRON-4 (Impedimentos)
  PROMPT 36 — CRON-5 (Configurações)

RODADA 3 (após Rodada 2):
  PROMPT 23 — Compras Sprint 2
  PROMPT 26 — Notificações Sprint C
  PROMPT 27 — Notificações Sprint D
  PROMPT 34 — CRON-3 (Medição — após PROMPT 25)
  PROMPT 29 — MENU-1
  PROMPT 30 — MENU-2
  PROMPT 31 — CFG-1

RODADA 4 (após Rodada 3):
  PROMPT 28 — Notificações Sprint E
  PROMPT 37 — PERM-1
  PROMPT 39 a 44 — Contratos 2 a 7

RODADA 5 (após Rodada 4):
  PROMPT 45 a 48 — Perfil e Admin
  PROMPT 50 a 53 — Dashboards
  PROMPT 54 — Relatórios

RODADA 6 (sistema pronto):
  PROMPT 55 a 57 — Landing, Onboarding, IA

----------------------------------------------------------------
DEPENDÊNCIAS CRÍTICAS — RESUMO
----------------------------------------------------------------

PROMPT 24 (Notif A) → obrigatório antes de PROMPT 42 (Contratos-5)
PROMPT 25 (Diário)  → obrigatório antes de PROMPT 34 (CRON-3)
PROMPT 31 (CFG-1)   → obrigatório antes de PROMPT 37 (PERM-1)
PROMPT 37 (PERM-1)  → obrigatório antes de PROMPT 39 (Contratos-2)
PROMPT 42 (Contratos-5) → obrigatório antes de PROMPT 43 (Contratos-6)
PROMPT 38 (Contratos-1) → obrigatório antes de PROMPT 39-44
PROMPT 32 (CRON-1)  → obrigatório antes de PROMPT 33-36

----------------------------------------------------------------
SPRINTS UX CANCELADOS
----------------------------------------------------------------

Os seguintes sprints UX que constavam no status anterior
foram cancelados por não constarem no plano original e por
terem baixa prioridade relativa aos módulos principais:

❌ UX-1 — Drag and Drop Listas de Compra/Cotação
❌ UX-2 — Sticky Bottom Bar Comparativo de Preços
❌ UX-3 — Sparklines Histórico de Preços
❌ UX-4 — Side Panels para NF Manual
❌ UX-5 — Data Tables expansíveis RecebimentosTab
❌ UX-6 — Dashboard Híbrido Cotação x Execução

----------------------------------------------------------------
REGRAS DE OPERAÇÃO
----------------------------------------------------------------

1. Inspecionar arquivos relevantes antes de qualquer código
2. Não avançar sem confirmar a entrega anterior
3. Reportar o que foi encontrado antes de implementar
4. Zero erros TypeScript antes de marcar como concluído
5. Atualizar este arquivo ao fim de cada sprint
6. Ao iniciar nova sessão: ler este arquivo E o PLANO_GERAL.txt
