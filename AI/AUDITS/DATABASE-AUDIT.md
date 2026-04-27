# DATABASE-AUDIT

## Resumo executivo
- Total de tabelas: ~92
- Total com RLS: ~79
- Total sem RLS: ~13
- Tabelas sensíveis sem RLS: `processamento_custos`, `projeto_quantitativos`
- Fonte dos dados: banco real (Supabase via pg_tables)

## Achados críticos
| Criticidade | Objeto | Problema | Evidência | Correção sugerida |
|-------------|--------|----------|-----------|-------------------|
| BLOQUEADOR | Tabela `processamento_custos` | Sem RLS ativado (rowsecurity = false) | Query em pg_tables | Executar `ALTER TABLE processamento_custos ENABLE ROW LEVEL SECURITY;` e criar policy baseada em `company_id`. |
| BLOQUEADOR | Tabela `projeto_quantitativos`| Sem RLS ativado (rowsecurity = false) | Query em pg_tables | Executar `ALTER TABLE projeto_quantitativos ENABLE ROW LEVEL SECURITY;` e criar policy. |
| BAIXO | Tabelas `sinapi_*` | Sem RLS ativado | Query em pg_tables | Por ser catálogo global, pode ficar sem RLS se o app consumir em service role, mas a boa prática é `ENABLE RLS` com policy public read. |

## Inventário de tabelas
A maioria (90%) das tabelas sensíveis de clientes (obras, recebiveis, diarios, documentos) já possui RLS = true.

## Inventário de policies
Não explorado na sua totalidade em detalhes, mas é exigido garantir que `company_id` esteja atrelado à chamada do `auth.jwt() -> app_metadata`.

## Inventário de RPCs
A avaliar as functions de seed ou processamento_custos para restrição de escopo de `company_id`.

## Riscos de pgvector/embeddings
A tabela `projeto_chunks` utiliza embeddings. O isolamento deve ocorrer estritamente ao filtrar `WHERE company_id = X AND obra_id = Y` no HNSW.

## Próximas ações
1. Habilitar RLS nas tabelas faltantes (`processamento_custos`, `projeto_quantitativos`).
2. Adicionar as respectivas policies restritivas por tenant (`company_id`).
