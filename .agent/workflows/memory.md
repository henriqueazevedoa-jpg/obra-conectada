---
description: Modo MEMORY — revisar, consolidar e promover registros do sistema de memória
---

# 🧠 MODO MEMORY

Manutenção do sistema de memória operacional. Limpeza, consolidação e promoção de aprendizados.

---

## Quando usar
- Ao final de sprint longa com muitos registros novos
- Quando o PROJECT-MEMORY parecer longo, redundante ou difuso
- Ao perceber registros que já deveriam ser regras permanentes
- Periodicamente (sugestão: a cada 5–10 sessões significativas)

## Quando NÃO usar
- Para registrar um aprendizado novo isolado — isso ocorre ao final de cada workflow
- Para corrigir bugs ou implementar features — usar o workflow correto
- Para qualquer detalhe trivial ou reversível que não gera valor futuro

---

## Leitura obrigatória

1. **PROJECT-MEMORY.md** — completo
2. **ARCHITECTURE-DECISIONS.md** — completo
3. **PATTERNS.md** — completo

---

## Diagnóstico inicial

- Quantos registros há no PROJECT-MEMORY?
- Há registros claramente duplicados ou sobrepostos?
- Há entradas marcadas como "Promover para AD/PATTERNS" ainda não promovidas?
- Há áreas do projeto com muita incidência de problemas mas sem decisão ou pattern documentado?

---

## Execução

### Passo 1 — Revisar PROJECT-MEMORY

Para cada registro, classificar:

| Classificação | Critério | Ação |
|---|---|---|
| **Manter** | Tático, recente, ainda relevante como contexto operacional | Nenhuma |
| **Promover para AD** | Regra durável, amplamente reaplicável **e** reduz risco sistêmico | Escrever em ARCHITECTURE-DECISIONS |
| **Promover para PATTERNS** | Receita concreta, testada, reaplicável em contextos diferentes | Escrever em PATTERNS |
| **Promover para ambos** | Atende os dois critérios acima | Promover para AD e PATTERNS |
| **Arquivar** | Obsoleto, já promovido, ou sem valor operacional futuro | Mover para seção de arquivo ou remover |
| **Duplicado** | Mesmo aprendizado em mais de um registro | Mesclar e eliminar duplicata |

**Critérios objetivos de promoção:**

Para **ARCHITECTURE-DECISIONS**: o item deve responder "sim" a pelo menos 3 das 4 perguntas:
1. Vale para múltiplas tarefas, não só um caso?
2. Reduz risco sistêmico se seguido?
3. Economiza tempo de decisão futura?
4. Evita uma classe de erro, não apenas um caso isolado?

Para **PATTERNS**: o item deve:
1. Ser uma receita de **como fazer**, não uma proibição
2. Já ter sido executada ao menos uma vez com sucesso
3. Ser reaplicável em contexto diferente do original

---

### Passo 2 — Verificar ARCHITECTURE-DECISIONS

- Há decisões sem `Status: Ativa`? Verificar se ainda fazem sentido.
- Há `CANDIDATAS` maduras o suficiente para promoção definitiva?
- Há lacunas evidentes (área com muitos problemas mas sem decisão)?

---

### Passo 3 — Verificar PATTERNS

- Há `CANDIDATOS` prontos para promoção?
- Há antipadrão recorrente que deveria virar pattern formal?
- Há pattern desatualizado após mudança de stack ou arquitetura?

---

### Passo 4 — Gerar consolidação periódica

Adicionar no PROJECT-MEMORY:

```md
## Consolidação — [Mês Ano]
**Período:** [data início] – [data fim]
**Registros revisados:** [N]

Promovidos para ARCHITECTURE-DECISIONS:
- [item]

Promovidos para PATTERNS:
- [item]

Arquivados / removidos:
- [motivo]

Erros mais recorrentes no período:
- [item]

Áreas com maior atrito:
- [item]

Antipadrões identificados:
- [item]
```

---

## Regras

- ❌ Não promover com base em caso único — precisa de pelo menos uma repetição
- ❌ Não deletar sem razão clara — memória fraca é melhor que lacuna
- ❌ Não promover o que é apenas contextual e passageiro
- ✅ Só promover para AD o que for regra durável e redutora de risco
- ✅ Só promover para PATTERNS o que for receita concreta e testada
- ✅ Registrar a consolidação no próprio PROJECT-MEMORY

---

## Saída obrigatória

```
MEMORY — Consolidação
──────────────────────────────────────
Registros revisados:          [N]
Promovidos para AD:           [N] — [títulos]
Promovidos para PATTERNS:     [N] — [títulos]
Promovidos para ambos:        [N]
Arquivados:                   [N]
Duplicatas removidas:         [N]

Candidatos a AD não promovidos:
- [item — motivo para aguardar]

Candidatos a PATTERN não promovidos:
- [item — motivo para aguardar]

Lacunas detectadas:
- [área sem decisão ou pattern que deveria ter]

Saúde da memória: [forte | razoável | precisa atenção]
```

---

**Status:** Aguardando revisão dos três arquivos
**Próximo passo:** Ler PROJECT-MEMORY → ARCHITECTURE-DECISIONS → PATTERNS → Classificar → Consolidar
