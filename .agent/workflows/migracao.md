---
description: Modo MIGRAÇÃO — refatorar padrão em múltiplos arquivos com zero breaking change
---

# 🔄 MODO MIGRAÇÃO

Padronizar, extrair ou remover antipadrão com garantia de compatibilidade. Arquivo por arquivo.

---

## Quando usar
Padronização de padrão existente em múltiplos arquivos, remoção de antipadrão sistêmico, extração de abstração. O comportamento final deve ser equivalente ao anterior.

## Quando NÃO usar
- Para adicionar funcionalidade nova → `/feature`
- Para correção de bug → `/debug`
- Para mudança em arquivo único sem escopo amplo — fazer diretamente sem modo formal

---

## Escala da migração

Identificar o lote antes de começar — influencia cautela, validação e risco:

| Lote | Critério | Abordagem |
|---|---|---|
| **Pequeno** | 1–3 arquivos | Executar diretamente, verificar TypeScript ao final |
| **Médio** | 4–10 arquivos | Executar em grupos, verificar TypeScript após cada grupo |
| **Amplo** | 10+ arquivos | Criar branch, executar em batches, testar páginas afetadas |

---

## Leitura obrigatória

1. **SESSION-TEMPLATE.md** — contexto técnico e estrutura
2. **PROJECT-MEMORY.md** — registros da área + tipo `MIGRACAO` e `ANTIPADRAO`
3. **ARCHITECTURE-DECISIONS.md** — qual decisão esta migração implementa
4. **PATTERNS.md** — qual pattern deve ser aplicado no padrão novo

---

## Diagnóstico inicial — mapeamento obrigatório

```bash
# Encontrar todas as ocorrências do padrão antigo
grep -r "[padrão antigo]" src/

# TypeScript antes de começar
npx tsc --noEmit

# Mapear páginas/componentes impactados
grep -r "[padrão antigo]" src/ --include="*.tsx" --include="*.ts"
```

- [ ] Todos os arquivos afetados mapeados?
- [ ] Lote identificado? (pequeno / médio / amplo)
- [ ] Qual decisão arquitetural esta migração implementa?
- [ ] Qual é o padrão novo?
- [ ] Há risco de quebra em consumidores?
- [ ] Plano de rollback definido?

---

## Execução — sequência por arquivo

1. Identificar todas as ocorrências do padrão antigo
2. Aplicar o padrão novo
3. `npx tsc --noEmit` — TypeScript limpo
4. Confirmar que comportamento está preservado
5. Reportar o que foi alterado
6. Avançar para o próximo arquivo

---

## Regras

- ✅ Backward compatible por padrão — nenhuma breaking change sem necessidade explícita
- ✅ Um arquivo por vez — confirmar antes de avançar
- ✅ Migrations de banco: aditivas (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`)
- ✅ Registrar aprendizado ao concluir
- ❌ Não alterar comportamento — apenas padrão/estrutura
- ❌ Não renomear props ou contratos sem necessidade — consumidores quebram silenciosamente
- ❌ `DROP`, `ALTER COLUMN` destrutivo ou mudança de contrato sem plano

---

## Saída obrigatória

```
MIGRAÇÃO — Resultado
──────────────────────────────────────
Escala:             [pequeno | médio | amplo]
Padrão removido:    [descrição do antipadrão]
Padrão aplicado:    [descrição da solução nova]
Decisão aplicada:   [AD-XXX]

Arquivos migrados:
- [arquivo] — [o que mudou]

Backwards compatible: [sim | não — detalhar se não]
TypeScript:           [ ] Sem erros após migração
Testado:              [ ] Páginas afetadas verificadas no browser

Antipadrão removido:  [o que foi eliminado]
Regra validada:       [qual AD ou pattern foi confirmado na prática]
```

---

## Gatilho de aprendizado — obrigatório ao final

Migrações sem aprendizado são oportunidades desperdiçadas:

- **PROJECT-MEMORY.md** — antipadrão removido, causa, solução, quando reutilizar
- **ARCHITECTURE-DECISIONS.md** — se a migração consolidou regra não documentada
- **PATTERNS.md** — se o padrão novo for receita reaplicável para outros módulos

---

**Status:** Aguardando mapeamento
**Próximo passo:** Mapear escopo → Identificar escala → Ler ARCHITECTURE-DECISIONS → Executar arquivo por arquivo
