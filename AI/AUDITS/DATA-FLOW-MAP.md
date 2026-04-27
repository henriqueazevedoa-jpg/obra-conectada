# DATA-FLOW-MAP

## Fluxo: Orçamento → Custo Previsto no Dashboard
- **Origem:** `orcamento_subitens` / `orcamento_composicoes`
- **Destino:** Dashboard KPIs e relatórios
- **Tabelas:** `orcamento_versoes`, `orcamento_categorias`
- **Hooks/services:** `DashboardFinanceiro`, `useOrcamento`
- **Como o vínculo é feito:** O valor total é agregado (SUM) das versões ativas de orçamento vinculadas ao `obra_id`.
- **Risco:** Desalinhamento se uma versão ativa não atualizar o valor consolidado.
- **Evidência:** `GestorDashboard.tsx`
- **Confiança:** média

## Fluxo: Pagamentos → Custo Real no Dashboard
- **Origem:** Lançamentos em `PagamentosTab`
- **Destino:** Dashboard Custo Real
- **Tabelas:** `pagamentos`, `custo_real_itens`
- **Hooks/services:** Subscriptions de realtime e fetching manual
- **Como o vínculo é feito:** Totalização dos itens de custo real vinculados a pagamentos liquidados.
- **Risco:** Pagamentos sem itens de custo vinculados podem sumir do total.
- **Evidência:** Arquivos de `custo-real`
- **Confiança:** alta

## Fluxo: Cronograma → Eventos no Calendário
- **Origem:** `cronograma_tarefas`
- **Destino:** Painel de Calendário
- **Tabelas:** `cronograma_tarefas`, `obra_calendarios`
- **Hooks/services:** `useCronograma`
- **Como o vínculo é feito:** Puxando as start/end dates das tarefas da baseline ativa.
- **Risco:** Fuso horário (timezone) offset mudando o dia no calendário.
- **Evidência:** View de Calendário na UI.
- **Confiança:** alta

## Fluxo: Fornecedores → Banco de Preços do Orçamento
- **Origem:** Cadastros no módulo Fornecedores (`precos_fornecedores`)
- **Destino:** Insumos (`orcamento_composicoes`)
- **Tabelas:** `fornecedores`, `precos_fornecedores`, `orcamento_composicoes`
- **Hooks/services:** `useInsumos`
- **Como o vínculo é feito:** Relacionamento na biblioteca de composições para puxar o último preço.
- **Risco:** Preço desatualizado sendo lockado no orçamento.
- **Evidência:** Migração recente no SQLite/Supabase.
- **Confiança:** alta

## Fluxo: Intelligence → RAG e Quantitativos
- **Origem:** PDFs processados no Worker
- **Destino:** React Frontend Chat e Grids de extração
- **Tabelas:** `projeto_arquivos`, `projeto_chunks` (embeddings), `projeto_quantitativos`
- **Hooks/services:** Edge functions (`lastra-chat`), Python worker
- **Como o vínculo é feito:** O Python processa e injeta no Supabase. O Frontend consome via WebSocket e REST.
- **Risco:** Vazamento de embeddings entre tenants (falta de isolamento vetorial) ou ausência de RLS na staging table.
- **Evidência:** Auditoria Database indicou `rowsecurity = false`.
- **Confiança:** alta
