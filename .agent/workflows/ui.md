---
description: Modo UI — implementar ou revisar interface sem alterar lógica de negócio
---

# 🎨 MODO UI

Implementar, revisar ou padronizar interface visual. Não toca em lógica, dados ou comportamento.

---

## Quando usar
Mudança é exclusivamente visual: layout, espaçamento, cores, componentes, densidade, estrutura de página.

## Quando NÃO usar
- Para corrigir bug de comportamento, lógica ou dados → `/debug`
- Para criar feature com lógica nova → `/feature`
- Para alterar queries, handlers, contexts ou estado

---

## Subtipos

| Subtipo | Quando usar |
|---|---|
| **UI-POLISH** | Ajustes pontuais de espaçamento, cor ou tipografia sem alterar estrutura |
| **UI-RELAYOUT** | Reorganizar estrutura de uma ou mais páginas/componentes |
| **UI-SYSTEM** | Implementar ou padronizar elementos do design system em múltiplos lugares |

---

## Leitura obrigatória

1. **SESSION-TEMPLATE.md** — contexto técnico e restrições
2. **VISUAL.md** — fonte de verdade visual: paleta, tokens, estrutura, checklist
3. **PROJECT-MEMORY.md** — últimos 5 + entradas de área UI/VISUAL
4. **PATTERNS.md** — PT-001 a PT-009

> Abrir `OrcamentoPage.tsx` como referência estrutural antes de alterar.
> Abrir `/orcamento` no browser para calibrar visualmente.

---

## Diagnóstico visual obrigatório

Antes de alterar qualquer arquivo:

- [ ] Estado atual do componente/página visto no browser?
- [ ] Subtipo identificado? (polish / relayout / system)
- [ ] Quais elementos mudam — e quais devem ser preservados?
- [ ] Há referência visual equivalente já implementada no projeto?
- [ ] A mudança afeta outras páginas ou componentes além do escopo?

---

## Regras invioláveis

- ❌ Não alterar lógica, queries, handlers, contexts ou estado
- ❌ Não modificar `src/components/ui/` diretamente — compor ou encapsular
- ❌ Não hardcodar valores fora dos tokens de `VISUAL.md`
- ❌ Não desmontar abas condicionalmente — usar `display:none`
- ✅ Seguir estritamente `VISUAL.md` para cores, tipografia, espaçamentos e estrutura
- ✅ Preservar todos os estados existentes (loading, error, empty, filled)
- ✅ Reportar arquivos alterados e o que mudou

> Regras visuais específicas (tokens exatos, hierarquia de componentes, checklist completo) estão em `VISUAL.md`. Não duplicar aqui.

---

## Saída obrigatória

```
UI — Resultado
──────────────────────────────────────
Subtipo:           [polish | relayout | system]
Componentes:       [arquivos alterados]
O que mudou:       [descrição das mudanças visuais]
O que foi mantido: [lógica ou estrutura preservada intencionalmente]
Risco residual:    [impacto em outros componentes, ou "Nenhum"]
```

---

## Gatilho de aprendizado

Se surgir inconsistência visual sistêmica, antipadrão novo ou decisão de UI que deve ser propagada:

- Registrar em `PROJECT-MEMORY.md` com tipo `UX` ou `PADRAO`
- Se virar regra durável → `ARCHITECTURE-DECISIONS.md`
- Se virar receita visual → `PATTERNS.md`

---

**Status:** Aguardando diagnóstico visual
**Próximo passo:** Identificar subtipo → Abrir VISUAL.md → Abrir /orcamento no browser
