---
description: Iniciar sessão de sprint — orquestrador de contexto, risco e próximo passo
---

# 🚀 MODO SPRINT

Ponto de entrada de toda sessão de trabalho. Não implementa — orienta.

---

## Quando usar
Ao iniciar qualquer sessão de trabalho, para entender o estado atual, riscos e o que fazer a seguir.

## Quando NÃO usar
Não usar para implementar diretamente. Sprint orienta — o workflow específico executa.

---

## Leitura obrigatória (nesta ordem)

1. **SESSION-TEMPLATE.md** — arquitetura, regras fixas, stack
2. **PLANO_GERAL_STATUS.md** — fila de sprints e status atual
3. **PROJECT-MEMORY.md** — últimos 5 registros + entradas da área do próximo item
4. **ARCHITECTURE-DECISIONS.md** — decisões relevantes para o próximo item
5. **PATTERNS.md** — patterns aplicáveis ao próximo item

---

## Diagnóstico inicial

Após ler os arquivos, responder:

**1. Estado da sessão**
- Qual sprint está ativo e qual é o objetivo?
- Qual é o item atual (em andamento ou próximo)?
- Há itens concluídos que ainda precisam de commit ou validação?

**2. Memória relevante**
- Há bugs conhecidos na área do próximo item?
- Há decisão arquitetural que se aplica diretamente?
- Há pattern preferencial para o escopo?

**3. Riscos e dependências**
- O próximo item depende de algo não concluído?
- Há algo que o próximo item vai impactar?
- Há risco técnico conhecido (RLS, performance, tipagem, fetch)?

**4. Classificação do próximo item**

| Status | Critério |
|---|---|
| ✅ Pronto para executar | Contexto claro, sem bloqueio, workflow identificado |
| 🔍 Exige inspeção antes | Escopo ou código ainda não compreendido o suficiente |
| 🔒 Bloqueado por dependência | Depende de item não concluído ou recurso não disponível |
| ❓ Bloqueado por contexto ausente | Falta informação, decisão ou definição para avançar |

---

## Saída obrigatória

```
SPRINT — Diagnóstico de sessão
──────────────────────────────────────
Sprint:             [ID + nome]
Item atual:         [descrição]
Próximo item:       [descrição]
Status do próximo:  [pronto | exige inspeção | bloqueado — motivo]

Memória relevante:
- [registro ou decisão aplicável, ou "Nenhum"]

Risco principal:
- [risco técnico identificado, ou "Nenhum"]

Dependências:
- [bloqueante identificado, ou "Nenhuma"]

Workflow recomendado: [sprint | ui | feature | debug | inspecao | migracao | memory]
Arquivos obrigatórios para aquele modo:
- [lista]

Critério de conclusão:
- [o que define "pronto" para este item]
```

---

## Regras

- ✅ Trabalhar um item por vez
- ✅ Confirmar com o usuário antes de avançar para o próximo item
- ✅ Atualizar PLANO_GERAL_STATUS.md ao concluir cada item
- ✅ Registrar aprendizado no PROJECT-MEMORY se houver descoberta relevante
- ❌ Não iniciar implementação sem identificar riscos e dependências
- ❌ Não recomendar workflow sem verificar memória da área

---

## Gatilho de aprendizado

Se durante a organização da sprint surgir risco sistêmico, antipadrão recorrente ou decisão que vale reutilizar:

- Registrar no `PROJECT-MEMORY.md` antes de continuar
- Se for regra durável → `ARCHITECTURE-DECISIONS.md`
- Se for receita de organização de sprint → `PATTERNS.md`

---

**Status:** Aguardando leitura de contexto
**Próximo passo:** SESSION-TEMPLATE.md → PLANO_GERAL_STATUS.md → PROJECT-MEMORY.md (últimos 5)
