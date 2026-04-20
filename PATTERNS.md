# 🧩 PATTERNS — ObraConectada

**Função deste arquivo:** armazenar receitas, estruturas e abordagens reutilizáveis para acelerar implementação com consistência.  
Este arquivo deve responder à pergunta: **“como normalmente fazemos isso bem neste projeto?”**

> Se `ARCHITECTURE-DECISIONS.md` define regras, este arquivo define caminhos preferenciais de execução.

---

# 1) COMO USAR

Consultar este arquivo quando a tarefa envolver:
- nova página;
- nova feature;
- revisão de estrutura;
- UI/UX;
- organização de dados na tela;
- padrão de fetch;
- contexts;
- integração Supabase;
- cards, listas, abas, drawers, previews, formulários e estados de carregamento.

Ao descobrir uma solução repetível e útil, promover para cá.

---

# 2) CRITÉRIO PARA ENTRAR AQUI

Um pattern deve:
- ser reaplicável;
- economizar tempo em futuras implementações;
- melhorar consistência;
- já ter se mostrado útil ou promissor no projeto.

Não usar este arquivo para:
- regra arquitetural rígida (isso vai para `ARCHITECTURE-DECISIONS.md`);
- memória puramente cronológica (isso vai para `PROJECT-MEMORY.md`).

---

# 3) PATTERNS ESTRUTURAIS

## PT-001 — Estrutura-base de página densa

### Usar quando
A página tiver mistura de:
- filtros;
- KPIs;
- abas;
- listas;
- preview;
- ações rápidas.

### Estrutura recomendada
1. Header claro com título + contexto + ação principal
2. Linha ou bloco de filtros
3. KPIs em cards
4. Tabs estruturando áreas de trabalho
5. Conteúdo em cards/listas/drawers, evitando visual pobre
6. Estados explícitos de vazio, erro e carregamento

### Referência
- `OrcamentoPage.tsx`
- rota `/orcamento`

### Benefício
Mantém hierarquia forte, leitura rápida e sensação premium.

---

## PT-002 — Tabs para páginas com múltiplos painéis

### Usar quando
A página tiver seções como:
- resumo;
- preview;
- detalhes;
- listas relacionadas;
- configurações locais.

### Abordagem
- manter painéis montados;
- alternar com `display:none`;
- evitar resets desnecessários;
- manter navegação clara com ícones inline.

### Evitar
- desmontagem condicional por padrão;
- fetch isolado e descoordenado por aba;
- perda de estado ao trocar de painel.

---

## PT-003 — Orquestração de dados no pai

### Usar quando
Vários componentes dependem do mesmo núcleo de dados.

### Abordagem
- carregar no pai;
- derivar estados úteis no pai;
- repassar props ou contexto controlado;
- manter uma fonte clara de verdade da página.

### Benefício
Melhor controle de loading, previsibilidade e depuração.

---

## PT-004 — Página nova deve calibrar visual com `/orcamento`

### Usar quando
Qualquer nova página, redesign ou revisão visual estiver sendo construída.

### Abordagem
- revisar `OrcamentoPage.tsx`;
- comparar densidade visual, hierarquia, proporção de espaços e qualidade dos cards;
- adaptar a linguagem visual, não copiar cegamente a estrutura.

### Benefício
Mantém unidade de produto.

---

# 4) PATTERNS DE UI/UX

## PT-005 — KPIs em cards, não em linha improvisada

### Usar quando
Houver números principais, contagens, totais, alertas ou destaques.

### Estrutura
- grid responsivo;
- cards consistentes;
- label clara;
- valor em destaque;
- apoio visual com hierarquia simples.

### Evitar
- texto solto com divisor;
- visual corporativo seco;
- excesso de informação por card.

---

## PT-006 — Listas em cards com borda lateral quando houver status

### Usar quando
Itens tiverem significado contextual como:
- status;
- prioridade;
- categoria visual;
- urgência;
- tipo de evento.

### Estrutura
- card com borda esquerda colorida;
- informações agrupadas em blocos claros;
- ações pontuais discretas.

### Benefício
Melhora escaneabilidade e dá mais qualidade percebida que tabela plana.

---

## PT-007 — Ícone inline nas abas e não em faixa separada

### Usar quando
A interface tiver tabs ou cabeçalhos de seção com identidade visual.

### Benefício
A solução fica mais limpa, moderna e compacta.

---

## PT-008 — Estado vazio deve orientar, não só informar

### Usar quando
A tela ou bloco puder não ter dados.

### Estrutura sugerida
- título simples do vazio;
- texto curto explicando o que falta;
- CTA contextual;
- se útil, dica de primeiro passo.

### Evitar
- apenas “Nenhum item encontrado” sem próximo passo.

---

## PT-009 — Estado de carregamento deve preservar layout mental

### Usar quando
A página carrega dados relevantes e tem estrutura visual conhecida.

### Abordagem
- skeletons ou placeholders próximos ao layout final;
- evitar saltos bruscos;
- não desmontar e reconstruir tudo sem necessidade.

---

# 5) PATTERNS DE DADOS E CONTEXTOS

## PT-010 — Dependências derivadas com primitivas estáveis

### Usar quando
Qualquer hook depender de entidade de auth, company, obra ou seleção atual.

### Abordagem
- derivar `const userId = user?.id`;
- derivar `const companyId = company?.id`;
- usar essas primitivas em deps e queries.

### Benefício
Menos instabilidade e menor chance de re-render involuntário.

---

## PT-011 — Contexto enxuto e propósito claro

### Usar quando
For necessário criar ou revisar contextos.

### Abordagem
- contextos não devem virar depósito genérico de tudo;
- expor apenas o que a árvore realmente precisa;
- preferir responsabilidades bem delimitadas;
- evitar trafegar objetos gigantes se bastam identificadores e seletores úteis.

---

## PT-012 — Fluxo de demo/seed explícito

### Usar quando
Houver demo mode, seed de dados, bootstrap inicial ou auto-preenchimento.

### Abordagem
- contratos explícitos;
- IDs explícitos;
- compatibilidade com RLS desde o início;
- sem dependência de estado legado implícito.

### Evitar
- reaproveitar “por conveniência” uma variável antiga de navegação ou contexto não garantido.

---

# 6) PATTERNS DE SUPABASE

## PT-013 — Queries devem seguir o contexto real da página

### Usar quando
Uma página ou feature acessa múltiplos conjuntos de dados.

### Abordagem
- mapear claramente: qual é a entidade central da tela?
- carregar a partir dessa entidade principal;
- evitar consultas dispersas sem uma orquestração clara.

---

## PT-014 — RLS deve ser pensada no desenho da feature

### Usar quando
Houver leitura, escrita, seed, bootstrap, demo ou automação.

### Abordagem
- projetar a feature já considerando segregação por empresa e regras reais de acesso;
- não tratar policy como ajuste tardio;
- revisar paths de insert/update que dependem de contexto da empresa/obra.

---

## PT-015 — Migração segura é incremental

### Usar quando
A tarefa exigir evolução de schema.

### Abordagem
- adicionar sem quebrar;
- manter compatibilidade;
- revisar impacto em tipos, contextos e páginas;
- mapear efeitos colaterais antes de concluir.

---

# 7) PATTERNS DE DEBUG

## PT-016 — Debug começa por repetição conhecida

### Usar quando
Aparecer bug aparentemente novo.

### Abordagem
Antes de investigar do zero, verificar:
- se já houve erro parecido no `PROJECT-MEMORY`;
- se a área já tem antipadrão conhecido;
- se existe decisão permanente sendo violada.

### Benefício
Economiza tempo e reduz false starts.

---

## PT-017 — Isolar sintoma, causa e gatilho

### Usar quando
O problema parecer ambíguo ou intermitente.

### Estrutura mental
- **Sintoma:** o que o usuário vê
- **Causa raiz:** o que realmente origina o problema
- **Gatilho:** em qual fluxo ou condição isso dispara

### Benefício
Evita corrigir o sintoma errado.

---

## PT-018 — Lentidão em UI deve investigar 4 frentes primeiro

### Usar quando
A queixa for “está lento”, “trava”, “pisca”, “demora para trocar”.

### Verificar primeiro
1. tabs desmontando;
2. deps instáveis em hooks;
3. fetch duplicado ou fragmentado;
4. recomposição visual excessiva.

---

## PT-021 — ❌ ANTIPADRÃO: Hook após `early return` condicional

### Usar quando
Qualquer componente tiver `if (loading) return (...)` ou `if (!dados) return (...)` antes de um `useEffect`, `useMemo` ou `useCallback`.

### Causa
React exige que hooks sejam chamados **sempre no mesmo número e na mesma ordem** a cada render. Hooks posicionados após `return` condicional são pulados em certos ciclos, causando crash "Rendered fewer hooks than expected".

### ❌ Errado
```tsx
if (loading) return <Skeleton />;           // early return
if (!dados.length) return <EmptyState />;   // early return
useEffect(() => { onKpisReady(...) }, [...]);  // HOOK APÓS RETURN — CRASH
```

### ✅ Correto
```tsx
// hooks sempre primeiro, ANTES de qualquer return
useEffect(() => {
  if (!isActive || loading || !dados.length) return;  // guard INTERNO
  onKpisReady([...]);
}, [isActive, loading, dados, onKpisReady]);

// early returns depois de todos os hooks
if (loading) return <Skeleton />;
if (!dados.length) return <EmptyState />;
return <Content />;
```

### Diagnóstico
- Error overlay do Vite: "Rendered more/fewer hooks than expected"
- White screen ao navegar para aba/página com dados reais (o crash só aparece quando a condição do `early return` muda entre renders)

---

# 8) PATTERNS DE ESCRITA DE MEMÓRIA

## PT-019 — Toda descoberta relevante deve sair em formato acionável

### Abordagem
Registrar sempre como:
- contexto;
- problema;
- causa raiz;
- solução;
- regra extraída;
- quando reutilizar.

### Motivo
Sem isso, a memória perde capacidade prática de acelerar o fluxo.

---

## PT-020 — Aprendizado sobe de nível quando amadurece

### Abordagem
- incidente recente → `PROJECT-MEMORY.md`
- regra durável → `ARCHITECTURE-DECISIONS.md`
- receita reaplicável → `PATTERNS.md`

### Motivo
Sem promoção, o conhecimento fica enterrado e não gera ganho cumulativo real.

---

# 9) TEMPLATE DE NOVO PATTERN

```md
## PT-XXX — [Nome do pattern]

### Usar quando
[cenário]

### Abordagem
[como executar]

### Evitar
[erros comuns / antipadrões]

### Benefício
[por que este pattern existe]
```

---

# 10) CANDIDATOS A PATTERN

Usar esta seção para soluções promissoras ainda não totalmente consolidadas.

```md
## CANDIDATO — [Nome]
**Contexto:**
[onde surgiu]

**Por que pode virar pattern:**
[explicação]

**O que ainda falta validar:**
[critérios]
```

---

**Última atualização:** 2026-04-19
