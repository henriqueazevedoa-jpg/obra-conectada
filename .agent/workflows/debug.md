---
description: Modo DEBUG — identificar e confirmar causa raiz antes de qualquer correção
---

# 🐛 MODO DEBUG

Nenhuma alteração antes de confirmar a causa raiz. Diagnóstico primeiro, correção depois.

---

## Quando usar
Há um comportamento incorreto, crash, lentidão ou loop ativo que precisa ser resolvido.

## Quando NÃO usar
- Para dívida técnica sem bug ativo → `/inspecao`
- Para refatorar código que funciona mas está feio → `/migracao`
- Para explorar código sem problema identificado → `/inspecao`

---

## Leitura obrigatória

1. **SESSION-TEMPLATE.md** — contexto técnico
2. **PROJECT-MEMORY.md** — entradas da área do bug + tipo `BUGFIX` e `ANTIPADRAO`
3. **ARCHITECTURE-DECISIONS.md** — verificar se alguma regra está sendo violada
4. **PATTERNS.md** — PT-016, PT-017, PT-018 (patterns de debug)

> Checar PROJECT-MEMORY antes de investigar do zero. Bugs raramente são totalmente inéditos.

---

## Diagnóstico inicial — classificar antes de investigar

| Dimensão | Responder |
|---|---|
| **Sintoma** | O que o usuário/sistema está vendo? |
| **Gatilho** | Em qual fluxo ou condição isso acontece? |
| **Categoria** | crash / comportamento errado / lentidão / loop / falha de dados / UI quebrada |
| **Causa raiz** | O que realmente origina o problema? (preencher após investigação) |

> Não assumir que toda lentidão é "deps ruins" ou todo crash é "Rules of Hooks". Classificar primeiro.

---

## Fontes de diagnóstico — por categoria

**Crash / erro de runtime:**
- Console do browser → copiar stack trace completo
- Vite error overlay → ler exatamente a linha apontada
- `npx tsc --noEmit` → verificar erro de tipo relacionado

**Lentidão / re-render excessivo:**
```bash
# deps instáveis
grep -r "\[user\]\|\[company\]\|\[obras\]" src/contexts/ src/components/
# effects sem deps
grep -rn "useEffect.*\[\]" src/
# tabs desmontando
grep -rn "activeTab === " src/pages/ src/components/
```

**Falha silenciosa de dados (Supabase):**
- Network tab → status da request e payload
- Console → RLS aparece como `42501` ou `row-level security`
- Verificar se `company_id` está sendo passado

**UI quebrada:**
- Inspecionar elemento no browser (não ir direto ao código)
- Verificar z-index, position, overflow, `isActive`, `display:none`

---

## Execução

1. Classificar o problema (tabela acima)
2. Consultar PROJECT-MEMORY por bug similar
3. Escolher fonte de diagnóstico pela categoria
4. Confirmar causa raiz antes de alterar qualquer arquivo
5. Aplicar correção **mínima** que resolve a causa raiz
6. Verificar se o mesmo padrão existe em outros arquivos

---

## Regras

- ❌ Não alterar nada até confirmar a causa raiz
- ❌ Não assumir a categoria do bug sem classificar
- ✅ Correção mínima — não aproveitar para refatorar
- ✅ Verificar propagação do mesmo padrão em outros arquivos
- ✅ Reportar causa raiz antes de qualquer alteração

---

## Saída obrigatória

```
DEBUG — Diagnóstico
──────────────────────────────────────
Sintoma:            [o que o usuário ou sistema vê]
Gatilho:            [em qual fluxo / condição]
Categoria:          [crash | comportamento errado | lentidão | loop | dados | UI]
Causa raiz:         [o que realmente origina o problema]
Evidência:          [console | network | profiler | grep | diff | reprodução]
Confiança:          [alta | média | baixa]

Memória consultada:
- [registro relevante do PROJECT-MEMORY, ou "Nenhum"]

Decisão violada:
- [AD-XXX aplicável, ou "Nenhuma"]

Correção proposta:
- Arquivo(s): [lista]
- Mudança:    [descrição mínima]

Risco residual:
- [impacto possível em outro fluxo, ou "Nenhum"]

Verificação pós-correção:
- [ ] Reproduzir steps — comportamento esperado?
- [ ] Console limpo?
- [ ] TypeScript sem erros?
- [ ] Mesmo padrão em outros arquivos?
```

---

## Gatilho de aprendizado

Se o bug for inédito, recorrente ou tiver causa raiz não óbvia:

- Registrar em `PROJECT-MEMORY.md` com tipo `BUGFIX` ou `ANTIPADRAO`
- Se virar regra durável → `ARCHITECTURE-DECISIONS.md`
- Se virar receita de diagnóstico → `PATTERNS.md`

---

**Status:** Aguardando diagnóstico
**Próximo passo:** Classificar o problema → Consultar PROJECT-MEMORY → Identificar causa raiz
