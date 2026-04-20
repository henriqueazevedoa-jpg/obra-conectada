---
description: Modo INSPEÇÃO — mapear, classificar e diagnosticar código antes de alterar
---

# 🔍 MODO INSPEÇÃO

Produzir diagnóstico classificado antes de qualquer alteração. Nenhum arquivo é modificado neste modo.

---

## Quando usar
Quando é necessário entender antes de mexer: código desconhecido, área complexa, preparar refactor ou feature, ou quando o problema não está confirmado.

## Quando NÃO usar
- Quando a causa do bug já está confirmada → `/debug`
- Quando o que fazer já está claro e pronto para execução → ir direto ao modo certo
- Para implementar qualquer mudança

---

## Leitura obrigatória

1. **SESSION-TEMPLATE.md** — contexto arquitetural
2. **PROJECT-MEMORY.md** — registros da área inspecionada
3. **ARCHITECTURE-DECISIONS.md** — regras para comparar com o código encontrado
4. **PATTERNS.md** — padrões para avaliar aderência
5. **VISUAL.md** — se o escopo incluir interface

---

## Diagnóstico inicial

Antes de inspecionar, definir:

- [ ] Qual é o escopo? (arquivo, módulo, área, fluxo)
- [ ] Qual é o objetivo? (entender / diagnosticar / preparar feature / preparar refactor)
- [ ] Há comportamento conhecido nessa área? (verificar PROJECT-MEMORY)
- [ ] Há decisão arquitetural que deveria estar sendo seguida aqui?

**Hipótese dominante antes de começar:**
> [Formular uma hipótese — mesmo que fraca. Ajuda a focar a inspeção e será confirmada ou refutada.]

---

## Ferramentas de inspeção

```bash
# Dependências instáveis
grep -r "\[user\]\|\[company\]\|\[obras\]" src/contexts/ src/components/

# Effects sem deps
grep -rn "useEffect.*\[\]" src/contexts/

# Tabs desmontando
grep -rn "activeTab === " src/pages/ src/components/

# Fetch fragmentado
grep -rn "useEffect" src/components/ | grep -i "supabase\|fetch\|from("

# TypeScript
npx tsc --noEmit
```

---

## Categorias de classificação

| Categoria | Exemplos |
|---|---|
| `ARQUITETURA` | Violação de AD, estrutura inadequada, acoplamento errado |
| `PERFORMANCE` | Tabs desmontando, deps instáveis, re-renders, fetch duplicado |
| `TIPAGEM` | any implícito, tipo incorreto, interface incompleta |
| `FETCH` | Query fragmentada, sem filtro de company, sem tratamento de erro |
| `UI` | Violação de VISUAL.md, tabela plana, cor hardcodada |
| `ESTADO` | Estado derivável mantido separado, source of truth difusa |
| `RISCO` | Código que pode quebrar em mudanças próximas, coupling frágil |

## Gravidade dos achados

| Nível | Critério |
|---|---|
| 🔴 Crítico | Está causando bug ou risco de dados |
| 🟡 Dívida técnica | Funciona, mas vai dificultar manutenção |
| 🟢 Melhoria | Boa oportunidade, sem urgência |
| 💡 Candidato | Pode virar feature, refactor ou migração |

---

## O que fazer com os achados

| Achado | Próximo passo |
|---|---|
| Bug ativo | `/debug` |
| Antipadrão sistêmico | `/migracao` |
| Oportunidade de feature | Documentar e propor no sprint |
| Melhoria de UI | `/ui` |
| Dívida técnica sem urgência | Registrar no PROJECT-MEMORY |

---

## Regras

- ❌ Não alterar nenhum arquivo durante inspeção
- ❌ Não propor solução sem concluir o diagnóstico
- ✅ Classificar cada achado com categoria e gravidade
- ✅ Confirmar a hipótese ou reformulá-la ao final
- ✅ Confirmar com o usuário antes de avançar para implementação

---

## Saída obrigatória

```
INSPEÇÃO — Resultado
──────────────────────────────────────
Escopo:              [arquivos / área / módulo]
Objetivo:            [o que se queria entender]
Hipótese inicial:    [a hipótese formulada antes]
Hipótese confirmada? [sim | não | parcialmente — explicar]
Confiança:           [alta | média | baixa]

Achados:
  [Categoria] [🔴/🟡/🟢/💡] — Descrição
  Localização: [arquivo:linha]
  Próximo passo: [ação recomendada]

Resumo:
- Críticos:       [N]
- Dívida técnica: [N]
- Melhorias:      [N]
- Candidatos:     [N]

Recomendação: [workflow sugerido, ou "Nenhuma ação necessária"]
```

---

## Gatilho de aprendizado

Se a inspeção revelar antipadrão sistêmico, risco não documentado ou violação de decisão:

- Registrar em `PROJECT-MEMORY.md` com tipo relevante
- Se for regra que deveria estar em ARCHITECTURE-DECISIONS → promover
- Se for antipadrão visual recorrente → promover para PATTERNS

---

**Status:** Aguardando inspeção
**Próximo passo:** Definir escopo → Formular hipótese → Consultar PROJECT-MEMORY → Mapear → Classificar achados
