# Auditoria de Schema Pré-Seed (Lastra Demo)

## 1. Resumo da Estrutura Relacional (Dependências FK)

Para garantir inserções sem erros de violação de chaves estrangeiras (Foreign Keys), a ordem de inserção (SEED) deve seguir rigorosamente a árvore de dependência abaixo, partindo dos nós raiz até as folhas.

### Ordem de Inserção (Top-Down)
1. **Auth & Core:** `auth.users` (não coberto via SQL direto se gerido via Supabase Auth, mas IDs são mockados) → `companies` → `profiles`.
2. **Contexto de Obra:** `obras` → `obra_memberships` → `contatos` (clientes/fornecedores/empreiteiros) → `fornecedores`.
3. **Orçamento:** `orcamento_versoes` → `orcamento_categorias` (com auto-referência `parent_id`) → `orcamento_composicoes` (via `etapa_id`) → `orcamento_subitens`.
4. **Cronograma:** `amdahl_grupos` → `cronograma_tarefas` (depende de categoria/composição) → `cronograma_dependencias` / `cronograma_alocacoes`.
5. **Suprimentos / Contratos:** `materiais` → `material_pedidos` → `contratos` (depende de orçamento e contatos) → `contratos_escopo` → `contratos_medicoes` → `contratos_medicao_itens`.
6. **Financeiro:** `pagamentos` (depende de pedido/fornecedor/etapa/composicao) → `pagamento_itens` → `custo_real_itens` → `recebiveis` (depende de contrato/medicao).
7. **Execução / Diário:** `obra_links` → `diario_registros` → `diario_servicos` (depende de tarefas) / `diario_fotos` / `diario_materiais`.
8. **Intelligence (Pipeline AI):** `projeto_arquivos` → `projeto_paginas_raw` → `projeto_chunks` → `projeto_quantitativos` / `processamento_custos`.

## 2. Tipos Enum Sensíveis Identificados
Valores inválidos inseridos em colunas do tipo Enum causarão falhas imediatas. Valores confirmados:

- `app_role`: `gestor`, `funcionario`, `cliente`, `admin`, `engenheiro`
- `obra_status`: `planejamento`, `em_andamento`, `concluida`, `pausada`
- `tipo_implantacao`: `nova`, `em_andamento`
- `cronograma_status`: `nao_iniciada`, `em_andamento`, `concluida`, `atrasada`
- `cronograma_tarefas_tipo_tarefa`: `PADRAO`, `MARCO`, `RESUMO`
- `diario_status`: `pendente`, `aprovado`, `rejeitado`
- `clima_tipo`: `sol`, `nublado`, `chuva`, `chuvoso_forte`
- `pagamento_status`: `previsto`, `pago`, `atrasado`, `cancelado`
- `recebiveis_status`: `pendente`, `a_vencer`, `vencido`, `recebido`, `parcial`, `cancelado`
- `contratos_tipo`: `cliente`, `empreiteiro`, `fornecedor`

## 3. Check Constraints Críticas
- `amdahl_params`: `amdahl_f` e `amdahl_p` devem estar entre `0` e `1`.
- `cronograma_tarefas`: Tipo da tarefa restrito a `PADRAO`, `MARCO`, `RESUMO`.
- `orcamento_composicoes`: `regime_mo` deve ser `clt`, `mei`, `autonomo`, `pj` ou nulo. `tipo_item` deve ser `material`, `mao_obra`, `equipamento`, `servico`.
- `projeto_chunks`: `confianca` deve ser `alta`, `media`, `baixa`. `disciplina` e `tipo_conteudo` possuem listas restritas detalhadas.
- `projeto_quantitativos`: `confianca` limitada a `alta`, `media`, `baixa`.

## 4. Triggers que Alteram Dados Implicitamente
Cuidado com triggers de inserção/atualização que podem sobrescrever dados ou gerar efeitos colaterais em cascades:
- `obras`: Possui `on_obra_created` (AFTER INSERT). Isso dispara a function `handle_obra_creation()`.
- Colunas `updated_at` (várias tabelas) possuem triggers `BEFORE UPDATE` que vão modificar datas manualmente inseridas, se o seed não for cuidadoso.
- `cronograma_impedimentos`: Triggers de `update_tarefa_dias_impedidos` vão alterar dados em `cronograma_tarefas`.

## 5. Row Level Security (RLS)
Todas as tabelas críticas (`companies`, `obras`, `orcamento_*`, `cronograma_*`, `pagamentos`, `recebiveis`, `projeto_*`) estão com `rowsecurity = true`.
- **Worker Bypass:** Se o seed for injetado via `postgres` (superusuário) ou `service_role` role (backend python ou MCP direto), o RLS será ignorado (Bypass RLS). Caso contrário, deverá ser setado os claims do jwt antes das execuções ou via políticas abertas por service_role.

## 6. Parecer e Recomendações
O schema é fortemente relacional e fortemente tipado. A integridade referencial está bem consolidada. O **Limpeza (02_clean_demo_data)** precisará respeitar a ordem reversa das tabelas folhas para as raiz (via ON DELETE CASCADE nas definições do Supabase, o DELETE por `obra_id` na tabela principal geralmente limpa cascata, porém é mais seguro deletar as folhas antes, quando não se tem certeza das regras de cascade em algumas fk's).

Para os seeds, o respeito estrito aos enums (`tipo_tarefa` em maiúsculas: `PADRAO`) e aos domínios numéricos (`amdahl_f`) evitará erros de runtime de DB.
