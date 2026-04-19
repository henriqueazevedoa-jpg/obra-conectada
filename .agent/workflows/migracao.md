---
description: Modo MIGRAÇÃO — refatorar padrão em múltiplos arquivos sem quebrar comportamento
---

# 🔄 MODO MIGRAÇÃO

Leia o arquivo SESSION-TEMPLATE.md integralmente antes de qualquer ação.

## Regras Obrigatórias

- ✅ Manter nomes de props e retornos **exatamente iguais** — não quebrar componentes consumidores
- ✅ Confirmar comportamento preservado após cada arquivo alterado
- ✅ Migrations de banco: **apenas** `ADD COLUMN IF NOT EXISTS`, **NUNCA** `ALTER/DROP`
- ✅ Implementar arquivo por arquivo, reportando cada um antes de avançar
- ✅ Zero erros TypeScript antes de considerar concluído
- ✅ Testar todas as páginas afetadas após a migração

## Checklist de Migração

- ☐ Git: `git checkout -b migration/descriptive-name`
- ☐ TypeScript: sem erros (`npm run type-check`)
- ☐ Componentes: todos os afetados testados
- ☐ Context: dependências corretas
- ☐ Database: migrations preparadas (se necessário)

## Atalho — Verificar Escopo

```bash
# Encontrar todos os arquivos que usam o padrão antigo
grep -r "padraoAntigo" src/

# Type check antes de começar
npm run type-check
```

## Tarefa desta Sessão

**O que está sendo migrado:**  
[SUBSTITUIR — descrever o padrão antigo e novo]

**Arquivos afetados:**  
[SUBSTITUIR — listar todos os arquivos que serão tocados]

**Backwards Compatible:**  
[sim/não — se sim, detalhar como]

**Rollback Plan:**  
[SUBSTITUIR — como reverter se der problema]

**Resultado Esperado:**  
[SUBSTITUIR — comportamento funcional mantido, código melhorado]

---

**Status:** Aguardando migração  
**Próximo passo:** Confirmar escopo antes de começar
