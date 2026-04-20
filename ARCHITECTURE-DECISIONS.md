# 🏗️ ARCHITECTURE-DECISIONS — ObraConectada

**Função deste arquivo:** registrar decisões permanentes e restrições que não devem ser rediscutidas a cada tarefa.  
Este arquivo existe para proteger coerência, performance, compatibilidade e previsibilidade do sistema.

> Tudo aqui deve ser tratado como regra estável até que exista motivo forte e explícito para revisão.

---

# 1) COMO USAR

Consultar este arquivo sempre que a tarefa envolver:
- arquitetura de página;
- state e contexts;
- dependências de hooks;
- fetch de dados;
- Supabase;
- RLS;
- migrations;
- performance;
- estruturas compartilhadas entre módulos.

Se uma descoberta nova for estrutural e durável, ela deve ser promovida para cá.

---

# 2) CRITÉRIO PARA ENTRAR AQUI

Uma decisão só deve entrar neste arquivo se:
- for amplamente reaplicável;
- reduzir risco sistêmico;
- proteger consistência;
- economizar tempo de decisão futura;
- impedir reincidência de erro importante.

Se for apenas contextual ou recente, ela pertence ao `PROJECT-MEMORY.md`.

---

# 3) PRINCÍPIOS-GUIA

## 3.1 Clareza > improviso
A solução deve ser previsível para quem continua o sistema depois.

## 3.2 Compatibilidade > agressividade
Mudanças em dados e banco devem priorizar segurança e continuidade.

## 3.3 Reuso > reinvenção
Antes de criar nova estrutura, procurar pattern existente.

## 3.4 Coerência global > otimização local egoísta
Uma solução isoladamente elegante, mas inconsistente com o resto do sistema, não é boa solução.

## 3.5 Causa raiz > paliativo
Correções devem preferir a origem do problema, não só o sintoma.

---

# 4) DECISÕES PERMANENTES

## AD-001 — Dependências devem usar IDs primitivos
**Status:** Ativa

### Regra
Em `useEffect`, `useCallback`, `useMemo` e fluxos derivados, usar IDs primitivos sempre que possível (`userId`, `companyId`, `obraId` etc.), nunca o objeto inteiro por conveniência.

### Motivo
Objetos inteiros aumentam instabilidade de dependências, re-renders e recomputações difíceis de prever.

### Implicação prática
Preferir:
```ts
const userId = user?.id;
```
a depender diretamente de `user` como dependency source.

### Quando aplicar
- contexts;
- hooks;
- memos;
- callbacks;
- queries dependentes de entidade;
- sincronizações entre páginas e auth.

---

## AD-002 — Em páginas densas, tabs não desmontam
**Status:** Ativa

### Regra
Páginas com abas densas devem manter seus painéis montados e alternar visibilidade via `display:none` ou abordagem equivalente de preservação.

### Motivo
Desmontagem condicional pode reexecutar effects, recriar subtree, resetar estados e piorar sensação de performance.

### Quando aplicar
- previews;
- formulários complexos;
- páginas com múltiplos painéis;
- listas pesadas;
- telas que o usuário alterna repetidamente.

### Exceção
Só desmontar se houver justificativa clara e ganho validado superior ao custo de recomposição.

---

## AD-003 — Fetch principal fica no componente pai
**Status:** Ativa

### Regra
Em páginas densas ou multiabas, o componente pai deve concentrar a orquestração principal de carregamento e distribuir dados aos filhos.

### Motivo
Isso melhora coordenação de loading, consistência, previsibilidade, cache mental da página e evita fetch duplicado ou fragmentado.

### Quando aplicar
- dashboards;
- páginas com tabs;
- telas com KPIs + listas + previews;
- módulos com vários widgets dependentes do mesmo contexto.

### Exceção
Child fetch independente apenas quando houver isolamento claro e benefício real comprovado.

---

## AD-004 — Estratégia de migration deve ser aditiva e segura
**Status:** Ativa

### Regra
Migrations devem privilegiar compatibilidade e adoção incremental.

### Permitido como padrão
- `ADD COLUMN IF NOT EXISTS`
- `CREATE TABLE IF NOT EXISTS`

### Não usar como prática padrão
- `DROP`
- `ALTER COLUMN` destrutivo
- mudanças de contrato sem plano explícito de compatibilidade

### Motivo
O sistema deve reduzir chance de ruptura em ambientes, dados ou fluxos já dependentes da estrutura atual.

---

## AD-005 — RLS é regra estrutural, não detalhe de implementação
**Status:** Ativa

### Regra
Toda feature que toca dados multiempresa deve ser pensada desde o início considerando segregação por `company_id` e compatibilidade real com policies.

### Motivo
RLS não pode ser tratada como etapa final de ajuste; isso gera bugs tardios e fluxos que funcionam parcialmente só em contexto local.

### Aplicação obrigatória
- criação de dados;
- onboarding;
- seeds;
- demo mode;
- inserts automáticos;
- páginas com leitura/escrita multiempresa.

---

## AD-006 — Fluxos automáticos não podem depender de estado legado implícito
**Status:** Ativa

### Regra
Seeds, demos, auto-preenchimentos e bootstraps devem usar entradas explícitas e contratos claros, não depender de IDs herdados, estados legados ou premissas frágeis de navegação.

### Motivo
Esse tipo de acoplamento tende a quebrar em refactors, alterações de RLS ou mudanças de fluxo.

### Aplicar em
- demo mode;
- seed de dados;
- onboarding assistido;
- criação automática de estruturas de obra.

---

## AD-007 — `/orcamento` é referência operacional de qualidade estrutural e visual
**Status:** Ativa

### Regra
Novas páginas devem buscar coerência de densidade, clareza e hierarquia com a experiência já validada em `/orcamento`, salvo necessidade específica muito bem justificada.

### Motivo
Isso reduz heterogeneidade do produto e preserva a sensação premium do sistema.

### Observação
A referência não é para copiar mecanicamente, mas para calibrar padrão de qualidade.

---

## AD-008 — Nomenclatura do produto deve ser consistente
**Status:** Ativa

### Regra
Os termos oficiais do sistema devem ser usados consistentemente em UI, docs, prompts e modelagem conceitual.

### Termos mandatórios
- Obra
- Etapa
- Composição
- Insumo
- Cotação
- Pagamento
- Custo Real
- Diário de Campo

### Motivo
Mudanças arbitrárias de terminologia geram ruído cognitivo e confusão de produto.

---

## AD-009 — Componentes `ui/` do shadcn não devem ser editados diretamente
**Status:** Ativa

### Regra
Não alterar diretamente `src/components/ui/` como estratégia de customização rotineira.

### Motivo
Preserva previsibilidade, facilita manutenção e evita espalhar efeitos colaterais em base compartilhada.

### Estratégia correta
Compor, estilizar externamente, encapsular ou criar wrappers quando necessário.

---

## AD-010 — Toda descoberta estrutural relevante deve ser promovida
**Status:** Ativa

### Regra
Se uma solução deixa de ser apenas correção local e passa a orientar decisões futuras do sistema, ela não deve ficar enterrada apenas no `PROJECT-MEMORY.md`.

### Destino
- regra durável → `ARCHITECTURE-DECISIONS.md`
- receita reaplicável → `PATTERNS.md`

### Motivo
Sem promoção, a memória fica fraca, difusa e pouco acionável.

---

# 5) DECISÕES CANDIDATAS A FUTURA CONSOLIDAÇÃO

Usar esta seção para itens fortes ainda em observação antes de promover para a seção principal.

```md
## CANDIDATA — [título]
**Origem:** [linkar contexto ou resumir]
**Por que pode virar regra:**
[explicação]
**Critério para promoção definitiva:**
[o que ainda precisa validar]
```

---

# 6) COMO PROPOR NOVA DECISÃO

Antes de adicionar uma nova decisão, validar:
- isso vale para várias tarefas, não só uma?
- isso reduz risco sistêmico?
- isso realmente economiza tempo de decisão futura?
- isso evita uma classe de erro, e não apenas um caso isolado?

Se a resposta for majoritariamente “sim”, a decisão provavelmente deve entrar aqui.

---

**Última atualização:** 2026-04-19
