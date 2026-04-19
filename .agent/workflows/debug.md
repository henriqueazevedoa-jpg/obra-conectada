---
description: Modo DEBUG — investigar causa raiz antes de qualquer correção
---

# 🐛 MODO DEBUG

Leia o arquivo SESSION-TEMPLATE.md integralmente antes de qualquer ação.

## Regras Obrigatórias

- ❌ **NÃO alterar** nada até identificar e confirmar a causa raiz
- ✅ Começar verificando: grep por `[user]`, `[company]` em contexts (causa raiz mais comum)
- ✅ Propor a correção **MÍNIMA** que resolve o problema
- ✅ Verificar se o mesmo padrão problemático existe em outros arquivos
- ✅ Reportar causa raiz antes de qualquer alteração

## Atalho de Diagnóstico — Verificar Sempre Primeiro

```bash
# Procurar dependências ruins (causa raiz mais comum)
grep -r "\[user\]\|\[company\]\|\[obras\]" src/contexts/

# Verificar console para erros
# DevTools → Console → copiar erro completo

# Verificar Network tab
# DevTools → Network → requests falhando? qual URL?

# Verificar React DevTools
# DevTools → React DevTools Profiler → componente renderizando demais?

# Procurar infinite loops
grep -n "useEffect.*\[\]" src/
```

## Tarefa desta Sessão

**Problema:**  
[SUBSTITUIR — descrever o bug e como reproduzir]

**Passos para Reproduzir:**
1. [Ação 1]
2. [Ação 2]
3. [Resultado inesperado]

**Evidências:**
- Console error: [SUBSTITUIR ou "nenhum"]
- Behavior: [o que acontece vs. o que deveria]
- Network: [requests falhando? qual URL?]
- Frequência: [sempre / intermitente / sob certas condições]

**Root Cause Identificada:**  
[SUBSTITUIR — causa identificada após investigação]

**Correção Proposta:**
- Arquivo(s) afetado(s): [listar]
- Mudança: [descrever correção MÍNIMA]

**Verificação Pós-Correção:**
- ☐ Reproduzir steps novamente
- ☐ Console limpo?
- ☐ Performance melhorou?

---

**Status:** Aguardando investigação  
**Próximo passo:** Executar atalho de diagnóstico
