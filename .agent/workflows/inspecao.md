---
description: Modo INSPEÇÃO — mapear código antes de qualquer alteração
---

# 🔍 MODO INSPEÇÃO

Leia o arquivo SESSION-TEMPLATE.md integralmente antes de qualquer ação.

## Regras Obrigatórias

- ❌ **NÃO alterar** nenhum arquivo até mapear completamente
- ✅ Verificar dependências de useCallback/useEffect (grep por `[user]`, `[company]`, `[obras]`)
- ✅ Reportar tudo que foi encontrado antes de propor qualquer mudança
- ✅ Confirmar com o usuário antes de avançar para correções

## Atalho de Diagnóstico — Verificar Primeiro

```bash
# Procurar padrões de dependência ruins
grep -r "\[user\]\|\[company\]\|\[obras\]" src/contexts/ src/components/

# Procurar infinite loops
grep -r "useEffect.*\[\]" src/contexts/

# Procurar re-renders excessivos
grep -n "const.*useCallback.*async" src/contexts/
```

## Tarefa desta Sessão

**Descrição:**  
[SUBSTITUIR — o que precisa ser inspecionado]

**Arquivo(s) a inspecionar:**  
[SUBSTITUIR — caminho dos arquivos]

**Checklist de Inspeção:**
- ☐ Dependências corretas em useCallback?
- ☐ Há infinite loops ou re-renders desnecessários?
- ☐ State está bem estruturado?
- ☐ Queries ao Supabase são otimizadas?
- ☐ Tipos TypeScript estão corretos?

**Resultado Esperado:**  
[SUBSTITUIR — o que se espera descobrir/confirmar]

---

**Status:** Aguardando inspeção  
**Próximo passo:** Mapear completamente antes de propor mudanças
