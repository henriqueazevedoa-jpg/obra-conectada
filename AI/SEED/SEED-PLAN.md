# Plano de Seed Demo (Lastra)

Baseado no Pré-voo de Schema (Sprint Seed 01), desenvolvemos a seguinte arquitetura em blocos para a geração dos dados de demonstração. Esta abordagem garantirá que os erros anteriores de dependências (FKs) e Enums inválidos não se repitam.

## Arquitetura de IDs Fixos (Constants)
Definidos em `01_constants.sql` e reaproveitados ao longo de todos os scripts.
- **Company:** `bbbbbbbb-0000-0000-0000-000000000001`
- **User:** `aaaaaaaa-0000-0000-0000-000000000001`
- **Obra 1 (Principal 60%):** `a1000000-0000-0000-0000-000000000001`
- **Obra 2 (Concluída 100%):** `a2000000-0000-0000-0000-000000000002`
- **Obra 3 (Inicial 15%):** `a3000000-0000-0000-0000-000000000003`

## Metodologia de Execução (Blocos)
Cada bloco corresponderá a um script SQL separado e isolado que deverá ser executado e validado de forma independente antes de seguir para o próximo. Isso impede scripts gigantescos que ocultam erros de schema.

### Fase 1: Limpeza (Sprint Seed 02)
- **Script:** `02_clean_demo_data.sql`
- **Ação:** Deleção explícita de registros (em ordem bottom-up para evitar problemas de cascade e constraints).
- **Tabelas Afetadas:** Todo o banco será limpo SOMENTE para a `company_id` definida acima.

### Fase 2: Auth e Obras (Sprint Seed 03)
- **Script:** `03_core_obras.sql`
- **Ação:** Criação do isolamento primário.
- **Tabelas Afetadas:** `companies`, `profiles`, `obras`, `obra_memberships`, `fornecedores`, `contatos`.
- **Validação:** Checar inserção correta via RLS para a company.

### Fase 3: Orçamento Base (Sprint Seed 04)
- **Script:** `04_orcamento.sql`
- **Ação:** Inserção do modelo financeiro previsto das 3 obras.
- **Tabelas Afetadas:** `orcamento_versoes` → `orcamento_categorias` → `orcamento_composicoes` → `orcamento_subitens`.
- **Atenção:** Respeitar hierarquia `parent_id` e enums (`clt`, `mei` na mão de obra).

### Fase 4: Planejamento (Sprint Seed 05)
- **Script:** `05_cronograma.sql`
- **Ação:** Construção do diagrama de Gantt interligado com o orçamento.
- **Tabelas Afetadas:** `cronograma_tarefas`, `cronograma_dependencias`, `cronograma_marcos`.
- **Atenção:** `tipo_tarefa` DEVE ser inserido em CAIXA ALTA (`PADRAO`, `RESUMO`). `amdahl_f` / `p` entre 0.0 e 1.0.

### Fase 5: Execução, Contratos e Financeiro (Sprint Seed 06)
- **Script:** `06_financeiro_execucao.sql`
- **Ação:** Geração de realidade financeira baseada no andamento percentual das obras.
- **Tabelas Afetadas:** `contratos`, `contratos_medicoes`, `pagamentos`, `recebiveis`, `diario_registros`.
- **Validação Financeira:** Garantir as vinculações de chaves ambíguas de `contrato_id` e `obra_id` na mesma tabela.

### Fase 6: Inteligência e Arquivos (Opcional - Sprint Seed 07)
- **Script:** `07_intelligence.sql`
- **Ação:** Geração do mock do pipeline de PDF e extrações quantitativas.
- **Tabelas Afetadas:** `projeto_arquivos`, `projeto_chunks`.

## Próximos Passos (Imediatos)
1. Iniciar **Sprint Seed 02** gerando o `02_clean_demo_data.sql` completo (bottom-up deletes).
2. Executar e validar a limpeza.
3. Avançar para a Sprint Seed 03 de forma incremental.
