---
description: Sistema de workflows do ObraConectada — guia de referência
---

# Workflows — ObraConectada

Sistema de execução guiado por memória operacional. Cada workflow carrega o contexto certo para o modo certo, evita retrabalho e propaga aprendizados.

---

## Qual workflow usar agora?

```
Há um bug ativo ou crash?                    → /debug
Precisa entender antes de mexer?             → /inspecao
É mudança só de layout/estilo?               → /ui
É funcionalidade nova ou expansão?           → /feature
É padronização em múltiplos arquivos?        → /migracao
Precisa organizar a sessão ou próximo passo? → /sprint
Precisa limpar ou consolidar a memória?      → /memory
```

> Em dúvida entre `/inspecao` e `/debug`: se há bug ativo, use `/debug`. Se o problema ainda não está confirmado, use `/inspecao` primeiro.

> Em dúvida entre `/feature` e `/migracao`: se está criando capacidade nova, use `/feature`. Se está apenas mudando como o código existente faz algo, use `/migracao`.

---

## Arquivos-base do sistema

| Arquivo | Função | Ler quando |
|---|---|---|
| `SESSION-TEMPLATE.md` | Constituição técnica — stack, estrutura, regras fixas | Sempre |
| `VISUAL.md` | Design system — paleta, tokens, padrões de layout | Toda tarefa com UI |
| `PROJECT-MEMORY.md` | Aprendizados cronológicos — bugs, causas raiz, táticas | Sempre — últimos 5 + área relevante |
| `ARCHITECTURE-DECISIONS.md` | Regras duráveis — não rediscutir sem motivo forte | Antes de criar arquitetura, fetch, migrations, RLS |
| `PATTERNS.md` | Receitas reaplicáveis — como este projeto faz bem as coisas | Antes de implementar feature, UI, debug ou migration |

> Cada modo define o que é obrigatório. Não ler tudo sempre — ler o certo.

---

## Workflows disponíveis

### `/sprint` — Orquestrador de sessão
Ponto de entrada de qualquer sessão. Carrega memória, identifica riscos, aponta o próximo passo e sugere o workflow certo. **Não implementa.**

**Use:** para abrir sessão, priorizar, mapear dependências, escolher modo.
**Não use:** para executar implementação diretamente.

---

### `/inspecao` — Diagnóstico de código
Mapear e classificar antes de tocar qualquer arquivo. Produz diagnóstico por categoria e gravidade.

**Use:** quando precisa entender antes de mexer, preparar refactor ou feature.
**Não use:** quando a causa já está confirmada e a solução está clara — vá direto ao modo certo.

---

### `/ui` — Layout e estilos
Implementar ou revisar interface sem alterar lógica. Distingue polish, relayout e mudança sistêmica.

**Use:** para layout, densidade, componentes visuais, padronização de UI.
**Não use:** para bugs de comportamento, lógica, fetch ou contexts.

---

### `/feature` — Nova funcionalidade
Guia de implementação completa. Consulta memória antes de criar, avalia reaproveitamento, adapta a sequência ao escopo real.

**Use:** para criar feature nova, integrar módulo, expandir capacidade existente.
**Não use:** para refatoração estrutural sem funcionalidade nova — use `/migracao`.

---

### `/debug` — Investigação de bugs
Causa raiz antes de qualquer alteração. Classifica sintoma, gatilho e categoria. Consulta memória antes de investigar do zero.

**Use:** para crash, comportamento errado, lentidão, loop, falha silenciosa de dados.
**Não use:** para dívida técnica sem bug ativo — use `/inspecao`.

---

### `/migracao` — Refatoração segura
Padronizar padrão em múltiplos arquivos sem quebrar comportamento. Zero breaking change. Aprendizado obrigatório ao final.

**Use:** para normalizar padrão, remover antipadrão sistêmico, extrair abstração.
**Não use:** para feature nova ou para mudança em arquivo único sem escopo amplo.

---

### `/memory` — Consolidação de memória
Revisar, limpar e promover registros do PROJECT-MEMORY para arquivos permanentes.

**Use:** ao final de sprint longa, quando a memória estiver difusa ou redundante.
**Não use:** para registrar qualquer detalhe — isso ocorre nos outros workflows ao final da tarefa.

---

## Protocolo universal — 3 fases

**Antes de começar**
- Ler SESSION-TEMPLATE.md
- Ler últimos 5 registros do PROJECT-MEMORY.md + registros da área relevante
- Carregar arquivos adicionais conforme o modo (ver matriz abaixo)
- Verificar se há bug conhecido, decisão ou pattern aplicável

**Durante a execução**
- Um bloco por vez — não alterar o que não está no escopo
- Reportar achados antes de alterar
- Zero erros TypeScript antes de avançar

**Ao finalizar**
- Confirmar comportamento esperado
- Avaliar aprendizado novo e registrar se aplicável
- Reportar a saída obrigatória do modo

---

## Matriz de leitura contextual por modo

| Modo | SESSION | VISUAL | MEMORY | ARCH-DECISIONS | PATTERNS |
|---|---|---|---|---|---|
| sprint | ✅ | — | ✅ últimos 5 + área | ✅ relevantes | ✅ relevantes |
| ui | ✅ | ✅ obrigatório | ✅ área UI/VISUAL | — | ✅ PT-001–PT-009 |
| debug | ✅ | — | ✅ área + BUGFIX | ✅ relevantes | ✅ PT-016–PT-018 |
| feature | ✅ | se tiver UI | ✅ área relevante | ✅ relevantes | ✅ relevantes |
| inspecao | ✅ | se tiver UI | ✅ área relevante | ✅ para comparar | ✅ como referência |
| migracao | ✅ | — | ✅ área + ANTIPADRAO | ✅ obrigatório | ✅ padrão novo |
| memory | — | — | ✅ completo | ✅ completo | ✅ completo |

---

## Gatilho de aprendizado (todos os workflows)

| Descoberta | Destino |
|---|---|
| Bug com causa raiz útil | `PROJECT-MEMORY.md` |
| Regra durável, reaplicável, reduz risco sistêmico | `ARCHITECTURE-DECISIONS.md` |
| Receita concreta, testada, reaplicável | `PATTERNS.md` |
| Atende os dois | Promover para ambos |
| Tático, contextual, recente | Só `PROJECT-MEMORY.md` |

---

## Estrutura de arquivos

```
.agent/workflows/
├── README.md        ← este arquivo
├── sprint.md        ← orquestrador de sessão
├── ui.md            ← layout e estilos
├── feature.md       ← nova funcionalidade
├── debug.md         ← investigação de bugs
├── inspecao.md      ← mapeamento de código
├── migracao.md      ← refatoração segura
└── memory.md        ← consolidação de memória

SESSION-TEMPLATE.md       ← constituição técnica
VISUAL.md                 ← design system
PROJECT-MEMORY.md         ← aprendizados cronológicos
ARCHITECTURE-DECISIONS.md ← regras duráveis
PATTERNS.md               ← receitas reaplicáveis
```

---

**Versão:** 3.1 | **Última atualização:** 2026-04-19
