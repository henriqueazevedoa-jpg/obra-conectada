---
description: Modo FEATURE — implementar nova funcionalidade completa
---

# ⚙️ MODO FEATURE

Leia o arquivo SESSION-TEMPLATE.md integralmente antes de qualquer ação.

## Ordem Obrigatória de Implementação

1. ☐ Inspecionar o que já existe antes de criar qualquer coisa
2. ☐ Verificar se as tabelas necessárias já existem no banco
3. ☐ Definir tipos/interfaces em `src/types/`
4. ☐ Criar context em `src/contexts/` (se state compartilhado)
5. ☐ Criar componente principal em `src/components/[Feature]/`
6. ☐ Criar página em `src/pages/[Feature]Page.tsx`
7. ☐ Adicionar rota em `src/App.tsx`
8. ☐ Integrar com AuthProvider/CompanyProvider
9. ☐ Testar no navegador

## Regras Obrigatórias

- ✅ Manter padrão de IDs primitivos em useCallback (`userId`, `companyId`)
- ✅ Zero erros TypeScript antes de considerar concluído
- ✅ Implementar em blocos e aguardar confirmação antes de avançar
- ✅ Queries ao Supabase devem filtrar por `company_id`
- ✅ Migrations: apenas `ADD COLUMN IF NOT EXISTS`, **nunca** `ALTER/DROP`

## Tarefa desta Sessão

**Descrição:**  
[SUBSTITUIR — feature nome, escopo, user stories]

**Tabelas Necessárias:**  
[SUBSTITUIR ou "verificar" — quais tabelas precisam ser criadas]

**Arquivos a criar/modificar:**
- `src/types/xxx.ts` — tipos novos
- `src/contexts/XXXContext.tsx` — context (se necessário)
- `src/components/[Feature]/` — componentes
- `src/pages/XXXPage.tsx` — página
- `src/App.tsx` — adicionar rota

**Resultado Esperado:**  
[SUBSTITUIR — feature completa e funcional descrita]

---

**Status:** Aguardando implementação  
**Próximo passo:** Mapear existentes antes de criar novos
