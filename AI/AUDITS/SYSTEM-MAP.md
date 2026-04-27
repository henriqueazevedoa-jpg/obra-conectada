# SYSTEM-MAP

## Obras

- **Páginas/componentes:** `ObrasLista`, `ObraSelecionar`, `ObrasLayout`, etc.
- **Hooks/services:** `useObraSelection`, `ObraContext`.
- **Tabelas relacionadas:** `obras`, `obra_memberships`.
- **Usa company_id? Como?:** Acesso total filtrado por `company_id`.
- **Usa obra_id? Como?:** Contexto base. Todos os outros módulos herdam este UUID em estado global/session/local storage para fazer fetch.
- **Integra com:** Quase todos os módulos.
- **Estado aparente:** Maduro
- **Evidências:** Presente na estrutura global `PageShell` e nos Providers.
- **Observações:** O switch de obra é o coração da navegação.

## Orçamento

- **Páginas/componentes:** `OrcamentoCentral`, `Planilha`, componentes de biblioteca, grid de insumos/composições.
- **Hooks/services:** `useOrcamento`, `Supabase`.
- **Tabelas relacionadas:** `orcamento_versoes`, `orcamento_categorias`, `orcamento_subitens`, `orcamento_composicoes`.
- **Usa company_id? Como?:** Sim, em todos os selects e em tabela.
- **Usa obra_id? Como?:** Base do isolamento de cada orçamento.
- **Integra com:** SINAPI, Financeiro (Custo Previsto), Dashboard.
- **Estado aparente:** Funcional
- **Evidências:** Grid drag & drop e planilhas complexas ativas.
- **Observações:** Interface complexa, refatorada recentemente.

## Financeiro (Pagamentos & Recebíveis)

- **Páginas/componentes:** `FinanceiroCentral`, `PagamentosTab`, `RecebiveisTab`, `DashboardFinanceiro`.
- **Hooks/services:** Services do financeiro diretos em `supabase.from(...)`.
- **Tabelas relacionadas:** `pagamentos`, `pagamento_itens`, `recebiveis`, `custo_real_itens`.
- **Usa company_id? Como?:** Sim.
- **Usa obra_id? Como?:** Filtro padrão.
- **Integra com:** Dashboard (Custo Real x Previsto).
- **Estado aparente:** Funcional / Frágil
- **Evidências:** Status estático vs dinâmico em `RecebiveisTab` causa UI bugs.
- **Observações:** Carece de hooks unificados e possui muito data-fetching no component-level.

## Cronograma (Gantt)

- **Páginas/componentes:** `GanttContainer`, `MarcosPanel`, `TarefasList`.
- **Hooks/services:** `useCronograma`, contexts locais.
- **Tabelas relacionadas:** `cronograma_tarefas`, `cronograma_dependencias`, `cronograma_historico`.
- **Usa company_id? Como?:** Sim.
- **Usa obra_id? Como?:** Sim.
- **Integra com:** Calendário, Pendências.
- **Estado aparente:** Funcional
- **Evidências:** Atualizações recentes em dependências DND (FS, SS).
- **Observações:** Alto acoplamento com library de UI externa (se houver) ou custom logic pesada.

## Contratos

- **Páginas/componentes:** `ContratosListTab`, formulários de medição, campos ART (`art_numero`, `art_arquivo_url`).
- **Hooks/services:** Queries em tempo real.
- **Tabelas relacionadas:** `contratos`, `contratos_medicoes`.
- **Usa company_id? Como?:** Sim.
- **Usa obra_id? Como?:** Sim.
- **Integra com:** Pagamentos, Recebíveis, Dashboard.
- **Estado aparente:** Frágil
- **Evidências:** Erros 400 frequentes por falha no resource route (`contratos_medicoes`).
- **Observações:** Revisar foreign keys urgentes no Supabase.

## Intelligence (Chat RAG / PDF Pipeline)

- **Páginas/componentes:** `ChatPanel`, `PDFViewer`.
- **Hooks/services:** Funções Edge/Python, workers.
- **Tabelas relacionadas:** `projeto_chunks`, `projeto_quantitativos`, `chat_sessions`.
- **Usa company_id? Como?:** Fundamental para isolamento (vetores de RAG não podem vazar).
- **Usa obra_id? Como?:** Fundamental.
- **Integra com:** Python Worker, Supabase Edge Functions.
- **Estado aparente:** Incompleto / Em desenvolvimento
- **Evidências:** Scripts no `worker/main.py` de extração ativa. Tabelas de quantitativos ainda sem RLS (`processamento_custos`).
- **Observações:** Pipeline crítico para a IA do produto.
