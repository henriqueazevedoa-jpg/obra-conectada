---
description: Modo FEATURE — implementar nova funcionalidade com contexto real e reaproveitamento
---

# ⚙️ MODO FEATURE

Implementação de funcionalidade nova. Antes de criar, verificar o que já existe e o que pode ser reaproveitado.

---

## Quando usar
A tarefa entrega algo que o sistema ainda não faz: nova capacidade, novo módulo, nova integração ou expansão de comportamento existente.

## Quando NÃO usar
- Para refatoração estrutural sem funcionalidade nova → `/migracao`
- Para ajuste visual puro → `/ui`
- Para investigar código antes de implementar → `/inspecao` primeiro

---

## Leitura obrigatória

1. **SESSION-TEMPLATE.md** — stack, estrutura, regras
2. **PROJECT-MEMORY.md** — registros da área + entradas recentes
3. **ARCHITECTURE-DECISIONS.md** — regras aplicáveis (RLS, fetch, contexts, migrations)
4. **PATTERNS.md** — patterns aplicáveis à feature
5. **VISUAL.md** — se a feature tiver interface

---

## Diagnóstico inicial — avaliar escopo antes de implementar

- [ ] A feature exige rota nova ou é expansão de existente?
- [ ] Exige contexto novo ou pode usar existente?
- [ ] Exige tabela nova ou pode estender existente?
- [ ] Há componentes reaproveitáveis?
- [ ] Há pattern registrado para esse tipo de feature?
- [ ] Tem UI? → Consultar VISUAL.md

> A sequência abaixo é orientadora — adaptar ao escopo real. Feature simples não precisa de todos os passos.

---

## Execução — sequência recomendada

1. **Mapear o que existe** — não criar o que já está lá
2. **Definir schema** — confirmar tabelas, colunas, relacionamentos
3. **Migrations** — apenas aditivas (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`)
4. **Tipos TypeScript** — `src/types/` se necessário
5. **Context** — apenas se state for compartilhado entre componentes distantes
6. **Componentes** — `src/components/[Feature]/`
7. **Página** — `src/pages/` se necessário
8. **Rota** — `src/App.tsx` se necessário
9. **Integração com auth/company/RLS** — obrigatória se mexer com dados multiempresa
10. **Testar no browser** com dados reais

---

## Regras

- ✅ Dependências de hooks com primitivas estáveis (`userId`, `companyId`, `obraId`)
- ✅ Queries ao Supabase filtradas por `company_id` quando multiempresa
- ✅ RLS pensada no desenho — não como ajuste tardio
- ✅ Zero erros TypeScript antes de considerar concluído
- ✅ Implementar em blocos e reportar antes de avançar
- ❌ Não criar estrutura nova sem verificar o que já existe
- ❌ Migrations destrutivas (`ALTER COLUMN` destrutivo, `DROP`)
- ❌ Presumir que toda feature precisa de rota + context + página

---

## Saída obrigatória

```
FEATURE — Resultado
──────────────────────────────────────
Feature:               [nome]
Arquivos criados:      [lista]
Arquivos alterados:    [lista]
Reaproveitamentos:     [o que foi reusado — ou "Nenhum"]
Schema:                [tabelas novas ou alteradas — ou "Nenhum"]
Escopo concluído:      [integral | parcial — detalhar se parcial]
Critério funcional:    [atendido | parcialmente | não — explicar]
Risco residual:        [impacto em outras áreas, RLS, performance — ou "Nenhum"]
TypeScript:            [ ] Sem erros
Testado:               [ ] Browser com dados reais
```

---

## Gatilho de aprendizado

Ao concluir, avaliar:

- Solução não óbvia que evita retrabalho futuro? → `PROJECT-MEMORY.md`
- Feature definiu padrão reaproveitável? → `PATTERNS.md`
- Decisão arquitetural importante foi tomada? → `ARCHITECTURE-DECISIONS.md`

---

**Status:** Aguardando avaliação de escopo
**Próximo passo:** Avaliar escopo → Ler arquivos-base → Mapear o que existe → Implementar
