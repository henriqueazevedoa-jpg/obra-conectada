# 📋 SESSION-TEMPLATE — ObraConectada

**Versão:** 3.1  
**Stack:** React 18 + TypeScript + Supabase + Tailwind CSS  
**Última atualização:** 2026-04-22  
**Objetivo desta versão:** aumentar drasticamente consistência entre workflows, reduzir retrabalho, preservar aprendizados úteis e melhorar qualidade de execução técnica/visual.

> ⚠️ **ARQUIVOS OBRIGATÓRIOS PARA QUALQUER TAREFA**
>
> 1. `SESSION-TEMPLATE.md` — regras operacionais da sessão.
> 2. `VISUAL.md` — design system e regras de UI.
> 3. `PROJECT-MEMORY.md` — memória tática cronológica do projeto.
> 4. `ARCHITECTURE-DECISIONS.md` — decisões permanentes e restrições.
> 5. `PATTERNS.md` — receitas e padrões reutilizáveis.
> 6. `PLANO_GERAL_STATUS.md` — status atual dos prompts (✅/⬜).
> 7. `PLANO_GERAL.txt` — especificações completas de cada prompt.
>    **Consultar este arquivo ANTES de pedir spec ao usuário.**
>    Se o prompt estiver na fila, a spec já está aqui.

---

# 1) PRINCÍPIO CENTRAL

Este projeto não deve depender apenas da qualidade do raciocínio pontual do workflow.  
Ele deve depender de um **sistema de execução assistido por memória**.

Toda tarefa deve:
- reutilizar decisões já validadas;
- evitar erros reincidentes;
- preservar consistência arquitetural e visual;
- transformar descobertas úteis em ativos reaproveitáveis.

Em outras palavras:
- **não repetir erro conhecido**;
- **não reinventar solução já descoberta**;
- **não quebrar padrões consolidados**;
- **não tratar descoberta importante como detalhe descartável**.

---

# 2) HIERARQUIA DE MEMÓRIA

## 2.1 Memória tática recente
**Arquivo:** `PROJECT-MEMORY.md`

Usar para:
- bugs corrigidos;
- macetes técnicos;
- armadilhas reais encontradas;
- decisões táticas recentes;
- soluções pontuais que podem reaparecer.

Não usar para:
- regras permanentes já consolidadas;
- documentação de arquitetura estável;
- descrição trivial do que foi feito.

---

## 2.2 Memória estrutural permanente
**Arquivo:** `ARCHITECTURE-DECISIONS.md`

Usar para:
- regras duráveis;
- restrições do sistema;
- decisões que não devem ser reavaliadas a cada tarefa;
- princípios de arquitetura, performance, fetch, estado, RLS, migrations.

---

## 2.3 Memória de execução por analogia
**Arquivo:** `PATTERNS.md`

Usar para:
- padrões reaplicáveis;
- receitas de implementação;
- estrutura de páginas, contextos, fetch, tabs, cards, drawers, formulários, listas, integração Supabase.

---

# 3) PROTOCOLO DE LEITURA OBRIGATÓRIA

## 3.1 Antes de começar qualquer tarefa
Ler sempre:
1. este arquivo (`SESSION-TEMPLATE.md`);
2. os **últimos 5 registros** do `PROJECT-MEMORY.md`;
3. os registros do `PROJECT-MEMORY.md` relacionados à área da tarefa;
4. o `ARCHITECTURE-DECISIONS.md` se a tarefa tocar arquitetura, dados, performance, RLS, contextos ou migrações;
5. o `PATTERNS.md` se a tarefa envolver implementação nova, UI, páginas, fluxos, contexts, Supabase ou componentes reaproveitáveis;
6. o `VISUAL.md` se qualquer parte da tarefa tocar interface;
7. o `PLANO_GERAL_STATUS.md` para verificar o status do sprint atual e o que já foi concluído;
8. o `PLANO_GERAL.txt` buscando pelo número do PROMPT correspondente à tarefa — a spec completa está lá. Nunca pedir spec ao usuário se ela puder ser encontrada neste arquivo.

---

## 3.2 Consulta temática mínima por modo
- **UI:** `VISUAL.md` + memória recente visual + padrões de página/lista/KPI/tabs.
- **FEATURE:** memória recente + decisões permanentes + padrões estruturais aplicáveis.
- **DEBUG:** memória recente + bugs semelhantes + decisões de arquitetura relacionadas.
- **MIGRAÇÃO:** memória recente + decisões de migrations/RLS/dados + padrões de compatibilidade.
- **INSPEÇÃO:** memória recente + decisões permanentes da área inspecionada.

---

# 4) PROTOCOLO DE ESCRITA DE MEMÓRIA

## 4.1 Ao finalizar a tarefa
Registrar no `PROJECT-MEMORY.md` apenas se houver pelo menos um dos itens abaixo:
- bug com causa raiz identificada;
- workaround importante;
- macete técnico reutilizável;
- antipadrão detectado;
- descoberta que evita retrabalho futuro;
- decisão tática relevante;
- limitação real de ferramenta ou stack;
- regra nova extraída de incidente recorrente.

---

## 4.2 Promover o aprendizado quando necessário
- Se o aprendizado for **durável e estrutural**, promover também para `ARCHITECTURE-DECISIONS.md`.
- Se o aprendizado virar **receita replicável**, promover também para `PATTERNS.md`.
- Se o item for só contextual e recente, manter apenas em `PROJECT-MEMORY.md`.

---

## 4.3 O que NÃO registrar na memória
Não registrar:
- resumo genérico do que foi implementado;
- alterações puramente cosméticas sem lição reutilizável;
- refactors sem descoberta técnica;
- decisões já documentadas em `VISUAL.md`, `ARCHITECTURE-DECISIONS.md` ou `PATTERNS.md`;
- tarefas executadas com sucesso sem novo aprendizado.

---

# 5) TEMPLATE MÍNIMO PARA NOVA ENTRADA NO PROJECT-MEMORY

Toda entrada de memória deve conter, sempre que aplicável:
- **Contexto**
- **Problema ou oportunidade**
- **Causa raiz**
- **Solução aplicada**
- **Regra extraída**
- **Quando reutilizar**
- **Hipótese invalidada** (se houver)
- **Promover para memória permanente?**

---

# 6) CHECKLIST UNIVERSAL PRÉ-EXECUÇÃO

Antes de escrever código ou emitir conclusão:
- ☐ A tarefa foi classificada corretamente em um modo?
- ☐ A memória recente foi consultada?
- ☐ As regras permanentes aplicáveis foram consultadas?
- ☐ Os padrões reutilizáveis aplicáveis foram consultados?
- ☐ A solução respeita as restrições de arquitetura já definidas?
- ☐ Se houver UI, a solução respeita o `VISUAL.md` e a referência `/orcamento`?
- ☐ A proposta evita reintroduzir erro já conhecido?

---

# 7) MODOS DE TRABALHO

Escolher **um** modo principal por tarefa.  
Se a tarefa tiver natureza mista, o modo principal deve refletir o risco dominante.

---

# 7A) MODO INSPEÇÃO

```md
MODO: INSPEÇÃO

TAREFA:
[Descrever o que precisa ser inspecionado]

ARQUIVOS RELEVANTES:
- [listar arquivos]

CONSULTAS DE MEMÓRIA OBRIGATÓRIAS:
- Últimos 5 registros do PROJECT-MEMORY
- Registros da área inspecionada
- Decisões permanentes relacionadas

CHECKLIST DE INSPEÇÃO:
- ☐ Dependências de useCallback/useEffect corretas?
- ☐ Há loops, re-renders ou recomputações desnecessárias?
- ☐ Há objetos inteiros em deps quando deveria haver IDs primitivos?
- ☐ State está bem segmentado e com responsabilidades claras?
- ☐ Queries ao Supabase são mínimas e bem localizadas?
- ☐ Tipos TypeScript estão corretos e úteis?
- ☐ Abas estão montadas com display:none em vez de desmontagem?
- ☐ Fetch está centralizado no pai quando aplicável?
- ☐ Há lógica duplicada que deveria virar pattern?

NÃO FAZER:
- Corrigir sem localizar causa raiz
- Declarar “está bom” sem validar dependências e fluxo real
- Ignorar decisões permanentes já registradas

PÓS-TAREFA — APRENDIZADO:
- ☐ A inspeção encontrou antipadrão recorrente?
- ☐ A inspeção encontrou débito sistêmico?
- ☐ Registrar no PROJECT-MEMORY se houver lição reutilizável
- ☐ Promover para ARCHITECTURE-DECISIONS ou PATTERNS se necessário
```

---

# 7B) MODO UI

> Antes de qualquer alteração visual:
> 1. Ler `VISUAL.md` completo.
> 2. Ler memória recente visual.
> 3. Abrir `OrcamentoPage.tsx` como referência de estrutura.
> 4. Usar `/orcamento` como referência visual de densidade e qualidade.

```md
MODO: UI

TAREFA:
[Descrever a mudança visual/UX]

CONSULTAS DE MEMÓRIA OBRIGATÓRIAS:
- VISUAL.md
- Últimos 5 registros do PROJECT-MEMORY
- Entradas recentes de UI/UX/CSS/TABS/CARDS
- Patterns de páginas, cards, listagens e abas

CHECKLIST UI:
- ☐ Ícone inline na linha de abas?
- ☐ KPIs em cards e não em linha pobre?
- ☐ Lista em cards com borda lateral quando aplicável?
- ☐ Abas mantidas com display:none?
- ☐ Nenhuma cor hardcoded fora dos tokens permitidos?
- ☐ Tipografia, espaçamento e densidade compatíveis com /orcamento?
- ☐ Componentes respeitam consistência visual global?
- ☐ Solução é boa em desktop e mobile?

NÃO FAZER:
- Introduzir visual fora do design system
- Adotar tabela plana quando card-list é superior para a UX proposta
- Resolver layout com gambiarra não documentada
- Criar exceção visual sem critério real

PÓS-TAREFA — APRENDIZADO:
- ☐ Houve limitação real de layout, Tailwind ou componente?
- ☐ Houve workaround visual útil para o futuro?
- ☐ Registrar “macete” no PROJECT-MEMORY
- ☐ Promover padrão reaplicável para PATTERNS
```

---

# 7C) MODO FEATURE

> Se a feature tocar UI, `VISUAL.md` é obrigatório.

```md
MODO: FEATURE

TAREFA:
[Nome da feature, escopo, user stories e limites]

CONSULTAS DE MEMÓRIA OBRIGATÓRIAS:
- Últimos 5 registros do PROJECT-MEMORY
- Registros temáticos da área da feature
- ARCHITECTURE-DECISIONS aplicáveis
- PATTERNS aplicáveis
- VISUAL.md se houver interface

FLUXO RECOMENDADO:
1. ☐ Entender escopo e impacto da feature
2. ☐ Confirmar regras permanentes aplicáveis
3. ☐ Reaproveitar patterns existentes antes de inventar nova estrutura
4. ☐ Definir tipos em `src/types/`
5. ☐ Estruturar dados/contexto com IDs primitivos
6. ☐ Implementar fetch no nível correto
7. ☐ Construir componentes e página
8. ☐ Adicionar rota e integração no app
9. ☐ Validar coerência visual e arquitetural
10. ☐ Testar fluxo principal e estados vazios/erro/carregamento

NÃO FAZER:
- Introduzir nova feature quebrando regra consolidada
- Distribuir fetch por abas/components sem necessidade
- Acoplar feature a estado legado implícito
- Ignorar impacto em performance, RLS ou estrutura de dados

PÓS-TAREFA — APRENDIZADO:
- ☐ Surgiu nova regra de negócio relevante?
- ☐ Surgiu novo padrão estrutural reaproveitável?
- ☐ Alguma hipótese anterior foi invalidada?
- ☐ Registrar no PROJECT-MEMORY
- ☐ Promover para ARCHITECTURE-DECISIONS ou PATTERNS se necessário
```

---

# 7D) MODO MIGRAÇÃO

```md
MODO: MIGRAÇÃO

TAREFA:
[O que migrar, origem, destino, impactos]

CONSULTAS DE MEMÓRIA OBRIGATÓRIAS:
- Últimos 5 registros do PROJECT-MEMORY
- Registros de MIGRAÇÃO / RLS / SUPABASE / COMPATIBILIDADE
- ARCHITECTURE-DECISIONS de banco e migrations
- Patterns de migração segura, se existirem

CHECKLIST DE MIGRAÇÃO:
- ☐ A estratégia é aditiva e compatível?
- ☐ Há risco de quebrar fluxo atual?
- ☐ Tipos/contextos foram atualizados?
- ☐ Queries existentes continuam compatíveis?
- ☐ `npm run type-check` foi considerado?
- ☐ Páginas afetadas foram mapeadas e testadas?
- ☐ A migração respeita a política de não usar DROP/ALTER destrutivo?

NÃO FAZER:
- Assumir que uma migração pequena não tem efeito colateral
- Alterar contrato de dados sem mapear impacto
- Introduzir ruptura silenciosa em contexts ou pages existentes

PÓS-TAREFA — APRENDIZADO:
- ☐ Houve efeito colateral inesperado?
- ☐ Houve decisão de compatibilidade relevante?
- ☐ Registrar “o que não fazer” no PROJECT-MEMORY
- ☐ Promover regra permanente se necessário
```

---

# 7E) MODO DEBUG

```md
MODO: DEBUG

TAREFA:
[Problema, como reproduzir, contexto]

CONSULTAS DE MEMÓRIA OBRIGATÓRIAS:
- Últimos 5 registros do PROJECT-MEMORY
- Entradas parecidas por área/erro/tipo
- ARCHITECTURE-DECISIONS relacionadas
- Patterns úteis para isolamento de causa raiz

INVESTIGAÇÃO:
- ☐ O problema já apareceu antes?
- ☐ O sintoma está sendo separado da causa raiz?
- ☐ Console / Network / React DevTools foram considerados?
- ☐ Dependências de hooks foram verificadas?
- ☐ Estado ou props estão gerando efeito cascata?
- ☐ Se houver lentidão: tabs desmontam? fetch duplica? state recalcula? queries repetem?
- ☐ Existe acoplamento implícito com IDs, contexto, auth, obra ativa ou demo seed?

NÃO FAZER:
- Aplicar paliativo sem entender a causa
- Mudar muitos pontos ao mesmo tempo sem isolamento
- Tratar problema estrutural como bug superficial
- Encerrar debug sem registrar aprendizado reutilizável

PÓS-TAREFA — APRENDIZADO:
- ☐ Causa raiz identificada?
- ☐ Solução validada?
- ☐ Regra extraída?
- ☐ Registrar no PROJECT-MEMORY
- ☐ Promover para memória permanente se necessário
```

---

# 8) CONTEXTO DE PRODUTO

## ObraConectada
**O que é:** SaaS de gestão de obras para construtoras brasileiras com operação enxuta e necessidade de organização premium.  
**Público principal:** empresas com aproximadamente 2–20 obras.  
**Ambição de UX:** sensação premium, moderna, clara, eficiente e agradável de operar.

### Referências de sensação
- Linear
- Notion
- Vercel

### Resultado desejado
O usuário deve sentir:
- clareza;
- velocidade;
- organização;
- confiança;
- vontade de continuar usando.

---

# 9) PERFIS E ACESSOS

| Perfil | Conta | Acesso |
|--------|-------|--------|
| Administrador | Sim | Total (1 por empresa) |
| Responsável | Sim | Obras atribuídas |
| Funcionário | Não | Link de Operação `/o/:token` |
| Cliente | Não | Link de Visualização `/v/:token` |

---

# 10) PLANOS

| Plano | Obras | Responsáveis | IA | Preço |
|-------|-------|--------------|----|-------|
| Start | 2 | 1 adicional | Não | R$ 199/mês |
| Pro | 5 | 3 adicionais | 100 msg/mês | R$ 499/mês |
| Enterprise | Ilimitadas | Ilimitados | Ilimitada | Custom |

---

# 11) NOMENCLATURA OBRIGATÓRIA

Usar consistentemente:
- **Obra**
- **Etapa** (`orcamento_categorias` no banco)
- **Composição**
- **Insumo**
- **Cotação**
- **Pagamento**
- **Custo Real**
- **Diário de Campo**

Não variar terminologia sem motivo muito forte.

---

# 12) BANCO DE DADOS (SUPABASE)

| Tabela | Propósito |
|--------|-----------|
| `companies` | Empresas clientes |
| `profiles` | Usuários |
| `obras` | Projetos |
| `orcamento_categorias` | Etapas |
| `orcamento_composicoes` | Composições de preço |
| `orcamento_subitens` | Insumos |
| `sinapi_composicoes` | Base pública SINAPI |
| `sinapi_insumos` | Insumos SINAPI |
| `cotacao_lotes` | Lotes de cotação |
| `cronograma_tarefas` | Gantt (`PADRAO`, `MARCO`, `RESUMO`) |
| `pagamentos` | Lançamentos financeiros |
| `obra_links` | Links públicos (tokens) |

---

# 13) REGRAS DE BANCO

- RLS: tudo segregado por `company_id`.
- Migrations: apenas estratégia aditiva e segura.
- Permitido:
  - `ADD COLUMN IF NOT EXISTS`
  - `CREATE TABLE IF NOT EXISTS`
- Proibido como prática padrão:
  - `DROP`
  - `ALTER COLUMN` destrutivo
  - mudanças que rompam compatibilidade sem estratégia explícita

---

# 14) DECISÕES ARQUITETURAIS-BASE

## Performance
- Usar **IDs primitivos** em dependências.
- Nunca depender de objeto inteiro quando basta `user?.id`, `companyId`, `obraId` etc.
- Em telas densas, **abas devem permanecer montadas** e alternar via `display: none`.
- Fetch de dados deve ficar preferencialmente no **componente pai**, distribuindo dados por props.

## Visual
- Cor de ação primária: roxo `#534AB7`.
- Estrutura-base:
  - ícone inline nas abas;
  - KPIs em cards;
  - listas em cards com borda lateral quando adequado.

---

# 15) REFERÊNCIA RÁPIDA DE ESTRUTURA

```txt
src/
├── components/
│   ├── ui/              # shadcn/ui — não editar
│   ├── orcamento/       # OrcamentoEditor, CatalogDrawer
│   └── AppLayout.tsx
├── contexts/            # AuthContext, CompanyContext
├── pages/
│   ├── OrcamentoPage.tsx  ← referência estrutural
│   ├── CronogramaPage.tsx ← referência de densidade
│   └── ...
├── integrations/supabase/untyped.ts  ← usar para queries
```

---

# 16) IMPORTS PADRÃO

```typescript
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
```

---

# 17) CHECKLIST UNIVERSAL PÓS-TAREFA

Antes de encerrar qualquer tarefa:
- ☐ A solução respeita arquitetura e padrões existentes?
- ☐ Não houve reintrodução de erro já conhecido?
- ☐ A solução ficou coerente com o resto do sistema?
- ☐ A memória foi atualizada apenas se houve aprendizado real?
- ☐ Algum item deveria ser promovido para regra permanente ou pattern?

---

# 18) COMO USAR

1. Carregar este arquivo + `VISUAL.md` + `PROJECT-MEMORY.md`
   + `ARCHITECTURE-DECISIONS.md` + `PATTERNS.md`
   + `PLANO_GERAL_STATUS.md` + `PLANO_GERAL.txt`.
2. Escolher um modo principal.
3. Descrever a tarefa.
4. Consultar a memória obrigatória do modo.
5. Executar respeitando decisões permanentes e patterns existentes.
6. Registrar apenas aprendizados reais.
7. Promover itens estruturais ou replicáveis quando necessário.

---

# 19) META DESTE SISTEMA

Este sistema existe para produzir um delta real de performance no fluxo de trabalho por meio de:
- menos reincidência de erro;
- menos decisões repetidas;
- menos inconsistência visual e estrutural;
- mais reaproveitamento de soluções já validadas;
- mais previsibilidade e velocidade nos workflows.

---

**Versão:** 3.1  
**Atualizado:** 2026-04-22
