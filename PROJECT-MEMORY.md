# 🧠 PROJECT-MEMORY — ObraConectada

**Função deste arquivo:** ser a memória tática cronológica do projeto.  
Ele deve registrar apenas aprendizados que reduzam retrabalho, evitem repetição de erro e acelerem tarefas futuras.

> Este arquivo NÃO é diário de bordo, changelog nem espaço para descrição genérica do que foi feito.

---

# 1) COMO USAR

## No início de cada tarefa
Ler:
- os **últimos 5 registros**;
- os registros relacionados à área da tarefa;
- se necessário, cruzar com `ARCHITECTURE-DECISIONS.md` e `PATTERNS.md`.

## Ao final de cada tarefa
Registrar apenas se houver:
- causa raiz identificada;
- bug recorrente solucionado;
- antipadrão detectado;
- workaround importante;
- limitação real da stack;
- regra tática útil;
- insight que evite retrabalho futuro.

---

# 2) O QUE ENTRA E O QUE NÃO ENTRA

## Entra
- bug com explicação útil;
- correção com regra reaproveitável;
- descoberta de gargalo real;
- decisão tática relevante;
- aprendizado sobre RLS, fetch, performance, tabs, contexts, layout, fluxo ou seeds;
- hipótese invalidada que possa enganar novamente no futuro.

## Não entra
- “foi criada a página X”;
- “ajustado espaçamento” sem qualquer lição reutilizável;
- resumos vagos;
- opiniões sem impacto operacional;
- conteúdos já promovidos integralmente para arquivos permanentes;
- qualquer informação trivial que não melhore futuras execuções.

---

# 3) TAXONOMIA RECOMENDADA

## Tipos
Use um destes tipos em cada entrada:
- `BUGFIX`
- `DECISAO`
- `PADRAO`
- `ANTIPADRAO`
- `PERFORMANCE`
- `UX`
- `RLS`
- `SUPABASE`
- `MIGRACAO`
- `WORKAROUND`

## Áreas
Use ao menos uma área por entrada:
- `UI`
- `UX`
- `ORCAMENTO`
- `CRONOGRAMA`
- `PAGAMENTOS`
- `DEMO`
- `AUTH`
- `RLS`
- `SUPABASE`
- `CONTEXTS`
- `PERFORMANCE`
- `MIGRACOES`
- `MOBILE`
- `VISUAL`

## Severidade / Relevância
Sugestão:
- `ALTA`
- `MEDIA`
- `BAIXA`

---

# 4) TEMPLATE OFICIAL DE ENTRADA

Copiar sempre este bloco:

```md
## [YYYY-MM-DD HH:mm] [TIPO: ...] [ÁREA: ...] [RELEVÂNCIA: ...]
**Contexto:**
[Onde isso apareceu e em que cenário]

**Problema ou oportunidade:**
[O que estava errado, lento, frágil ou ineficiente]

**Causa raiz:**
[Por que isso realmente aconteceu]

**Solução aplicada:**
[O que foi feito de fato]

**Regra extraída:**
[Qual princípio prático nasce dessa descoberta]

**Quando reutilizar:**
[Em quais cenários futuros isso deve ser lembrado]

**Hipótese invalidada:**
[Opcional — que crença anterior se mostrou falsa]

**Promover para memória permanente?**
[Não / ARCHITECTURE-DECISIONS / PATTERNS / Ambos]
```

---

# 5) FILTRO DE QUALIDADE ANTES DE REGISTRAR

Antes de adicionar uma entrada, responder mentalmente:
- isso realmente evita retrabalho futuro?
- isso tem chance real de reaparecer?
- isso muda uma decisão futura de implementação, debug ou UI?
- isso deveria virar regra ou pattern?

Se a resposta for “não” para tudo, provavelmente **não deve entrar**.

---

# 6) PADRÕES DE ESCRITA

## Bom registro
- concreto;
- causal;
- reutilizável;
- curto o suficiente para consulta rápida;
- profundo o suficiente para orientar decisão futura.

## Registro ruim
- vago;
- descritivo demais;
- sem causa raiz;
- sem regra extraída;
- sem dizer quando reaplicar.

---

# 7) EXEMPLOS DE ENTRADAS BOAS

## [2026-04-19 10:10] [TIPO: PERFORMANCE] [ÁREA: UI, PERFORMANCE] [RELEVÂNCIA: ALTA]
**Contexto:**
Tela com preview e múltiplas abas apresentando sensação de lentidão ao alternar conteúdo.

**Problema ou oportunidade:**
Cada troca de aba parecia reexecutar trabalho demais e piorava a experiência.

**Causa raiz:**
As abas estavam sendo desmontadas condicionalmente, recriando subtree e reativando effects.

**Solução aplicada:**
Manter todas as abas montadas e alternar visibilidade com `display:none`.

**Regra extraída:**
Em telas densas com preview, formulários complexos ou listas pesadas, tabs não devem desmontar conteúdo.

**Quando reutilizar:**
Qualquer página com múltiplas abas e custo alto de recomposição visual ou de efeitos.

**Hipótese invalidada:**
“Desmontar ao trocar aba sempre melhora performance.”

**Promover para memória permanente?**
ARCHITECTURE-DECISIONS

---

## [2026-04-19 10:25] [TIPO: RLS] [ÁREA: DEMO, RLS, SUPABASE] [RELEVÂNCIA: ALTA]
**Contexto:**
Fluxo de preenchimento de demo falhando na hora de inserir dados.

**Problema ou oportunidade:**
O seed não funcionava de forma estável e quebrava a experiência do modo demo.

**Causa raiz:**
O fluxo dependia de um ID implícito/legado e de um caminho de inserção não alinhado ao modelo atual de RLS.

**Solução aplicada:**
Tornar o seed explícito, desacoplado de estado legado, e compatível com policies e contexto atual.

**Regra extraída:**
Fluxos automáticos de seed/demo não devem depender de IDs implícitos nem de premissas frágeis de contexto.

**Quando reutilizar:**
Toda vez que houver bootstrap de dados, onboarding automático ou geração assistida de dados.

**Hipótese invalidada:**
“Um fluxo de demo pode aproveitar qualquer estado legado se estiver funcionando localmente.”

**Promover para memória permanente?**
ARCHITECTURE-DECISIONS

---

## [2026-04-19 10:40] [TIPO: PADRAO] [ÁREA: UI, VISUAL] [RELEVÂNCIA: MEDIA]
**Contexto:**
Necessidade de manter consistência entre páginas novas e a experiência visual premium do sistema.

**Problema ou oportunidade:**
Páginas novas tendem a ficar heterogêneas quando o implementador improvisa densidade, estrutura e hierarquia visual.

**Causa raiz:**
Ausência de reaproveitamento explícito da referência `/orcamento` como baseline visual e estrutural.

**Solução aplicada:**
Usar `OrcamentoPage.tsx` e a rota `/orcamento` como referência operacional de estrutura e densidade.

**Regra extraída:**
Páginas novas devem se aproximar do padrão estrutural e da sensação de qualidade visual de `/orcamento`, salvo exceções justificadas.

**Quando reutilizar:**
Sempre que houver nova página, redesign parcial ou revisão de consistência visual.

**Hipótese invalidada:**
“Basta seguir o design system em abstrato para manter consistência.”

**Promover para memória permanente?**
PATTERNS

---

# 8) CONSOLIDAÇÕES PERIÓDICAS

A cada conjunto significativo de novas entradas, gerar uma consolidação resumida.

Modelo sugerido:

```md
## Consolidação — Abril 2026
- Erros mais recorrentes:
  - [item]
  - [item]
- Regras promovidas:
  - [item]
- Antipadrões detectados:
  - [item]
- Áreas com maior atrito:
  - [item]
```

Objetivo:
- reduzir entropia do log;
- destacar padrões sistêmicos;
- forçar promoção do que já deixou de ser apenas tático.

---

# 9) REGISTROS

## [2026-04-24 21:50] [TIPO: BUGFIX] [ÁREA: CRONOGRAMA, UI] [RELEVÂNCIA: ALTA]
**Contexto:**
Após Sprint D3, sistema entrou em crash com Internal Server Error 500 em GanttCanvasPanel.tsx linha 771.

**Problema ou oportunidade:**
Gemini Pro High gerou JSX incompleto — elemento SVG <line> com atributos x1/y1 mas sem tag de abertura. tsc passou mesmo com erro de sintaxe JSX.

**Causa raiz:**
Vite detecta erros de sintaxe JSX em runtime/build, mas o compilador tsc não necessariamente pega JSX malformado em todos os casos de parsing.

**Solução aplicada:**
Adicionar tag <line faltante antes dos atributos.

**Regra extraída:**
Após sprints com canvas/SVG complexo, verificar manualmente no browser antes de liberar push — tsc não garante JSX sintaticamente correto em todos os casos.

**Quando reutilizar:**
qualquer sprint que mexa em componentes canvas, SVG overlay ou JSX complexo gerado por Gemini.

**Promover para memória permanente?**
PATTERNS

---

## [2026-04-24 21:45] [TIPO: PADRAO] [ÁREA: SUPABASE, DEMO] [RELEVÂNCIA: ALTA]
**Contexto:**
Seeds com IDs aleatórios causavam confusão entre obras de teste e obras reais.

**Problema ou oportunidade:**
Inconsistência nos dados de teste dificultava a depuração de fluxos entre módulos.

**Causa raiz:**
Falta de um padrão de nomenclatura e IDs determinísticos para o ambiente de desenvolvimento.

**Solução aplicada:**
IDs fixos e legíveis para todas as entidades do seed.

**Regra extraída:**
Seguir sempre o padrão:
- company: bbbbbbbb-0000-0000-0000-000000000001
- obras: a1000000-...-000000000001 (a1), a2...(a2), a3...(a3)
- versões: e1..., etapas: b1..., composições: c1..., insumos: d1..., pagamentos: pa1001..., custo_real: cr1001..., recebiveis: re1001...
- email dev: admin@applastra.com.br

**Quando reutilizar:**
qualquer seed novo de qualquer módulo.

**Promover para memória permanente?**
PATTERNS

---

## [2026-04-24 21:40] [TIPO: PADRAO] [ÁREA: UI, SUPABASE] [RELEVÂNCIA: ALTA]
**Contexto:**
Scripts Playwright capturavam tela de login em vez das páginas alvo — problema intermitente.

**Problema ou oportunidade:**
Falhas nos testes automatizados e capturas de tela inúteis para auditoria.

**Causa raiz:**
Race condition entre autenticação Supabase e navegação. Sessão expirava entre páginas ou screenshot era tirado antes do redirect completar.

**Solução aplicada:**
Criar src/_auditoria/lib/auth.mjs com funções fazerLogin(page) e autenticarENavegar(page, rota). Todos os scripts importam deste módulo central.

**Regra extraída:**
Nunca duplicar lógica de auth nos scripts — sempre importar de lib/auth.mjs.

**Quando reutilizar:**
qualquer novo script de auditoria Playwright.

**Promover para memória permanente?**
ARCHITECTURE-DECISIONS

---

## [2026-04-24 21:35] [TIPO: DECISAO] [ÁREA: SUPABASE] [RELEVÂNCIA: ALTA]
**Contexto:**
Seeds falhavam com erro de coluna porque agentes geravam SQL sem consultar schema real.

**Problema ou oportunidade:**
Bloqueio de desenvolvimento devido a erros de banco de dados evitáveis.

**Causa raiz:**
MCP do Supabase não estava sendo usado pelos agentes de forma sistemática.

**Solução aplicada:**
MCP configurado em mcp_config.json com servidor remoto oficial (mcp.supabase.com). Agentes devem usar MCP para consultar schema ANTES de qualquer INSERT.

**Regra extraída:**
Todo prompt que gera SQL deve incluir instrução explícita "consultar schema via MCP antes de escrever qualquer INSERT".

**Quando reutilizar:**
seeds, migrations, qualquer query com colunas.

**Promover para memória permanente?**
ARCHITECTURE-DECISIONS

---

## [2026-04-19 19:50] [TIPO: BUGFIX] [ÁREA: UI, FINANCEIRO] [RELEVÂNCIA: ALTA]
**Contexto:**
Crash (white screen) ao navegar para a página Financeiro quando a obra selecionada possuía dados de pagamentos ou custos reais.

**Problema ou oportunidade:**
`FluxoCaixaTab.tsx` e `DRETab.tsx` quebravam com erro "Rendered fewer hooks than expected" (violação das Rules of Hooks do React).

**Causa raiz:**
O `useEffect` responsável por emitir KPIs via `onKpisReady` estava posicionado **após** dois `return` condicionais antecipados (`if (loading) return` e `if (pagamentos.length === 0) return`). O React exige que hooks sejam chamados **sempre no mesmo número e ordem** — hooks após `return` condicionais violam essa regra e causam crash.

**Solução aplicada:**
- Mover o `useEffect` de KPI para **antes** de qualquer `early return` em ambos os componentes.
- Adicionar guards equivalentes dentro do callback do `useEffect` (`if (!isActive || !onKpisReady || loading || semDados) return;`) para não emitir KPIs durante carregamento ou estado vazio.
- Adicionar `loading` e `pagamentos.length` nas deps do `useEffect` para reagir corretamente.

**Regra extraída:**
**Todo `useEffect`, `useMemo` e `useCallback` deve ser declarado antes de qualquer `return` condicional no corpo do componente.** Os guards de "não executar" vão dentro do callback, nunca fora como early return.

**Quando reutilizar:**
Toda vez que um componente tem loading state, empty state ou acesso condicional a dados — verificar se há hooks declarados depois desses guards antes de commitar.

**Hipótese invalidada:**
"É seguro colocar hooks depois de `if (loading) return` porque quando loading é true, o hook ainda é chamado antes do return." ❌ Falso — o problema ocorre quando a ordem de renders muda entre ciclos.

**Promover para memória permanente?**
PATTERNS — como antipadrão proibido em componentes com early returns.

---

## [2026-04-19 10:40] [TIPO: PADRAO] [ÁREA: UI, VISUAL] [RELEVÂNCIA: MEDIA]
**Contexto:**
Necessidade de manter consistência entre páginas novas e a experiência visual premium do sistema.

**Problema ou oportunidade:**
Páginas novas tendem a ficar heterogêneas quando o implementador improvisa densidade, estrutura e hierarquia visual.

**Causa raiz:**
Ausência de reaproveitamento explícito da referência `/orcamento` como baseline visual e estrutural.

**Solução aplicada:**
Usar `OrcamentoPage.tsx` e a rota `/orcamento` como referência operacional de estrutura e densidade.

**Regra extraída:**
Páginas novas devem se aproximar do padrão estrutural e da sensação de qualidade visual de `/orcamento`, salvo exceções justificadas.

**Quando reutilizar:**
Sempre que houver nova página, redesign parcial ou revisão de consistência visual.

**Hipótese invalidada:**
“Basta seguir o design system em abstrato para manter consistência.”

**Promover para memória permanente?**
PATTERNS

---

## [2026-04-19 10:25] [TIPO: RLS] [ÁREA: DEMO, RLS, SUPABASE] [RELEVÂNCIA: ALTA]
**Contexto:**
Fluxo de preenchimento de demo falhando na hora de inserir dados.

**Problema ou oportunidade:**
O seed não funcionava de forma estável e quebrava a experiência do modo demo.

**Causa raiz:**
O fluxo dependia de um ID implícito/legado e de um caminho de inserção não alinhado ao modelo atual de RLS.

**Solução aplicada:**
Tornar o seed explícito, desacoplado de estado legado, e compatível com policies e contexto atual.

**Regra extraída:**
Fluxos automáticos de seed/demo não devem depender de IDs implícitos nem de premissas frágeis de contexto.

**Quando reutilizar:**
Toda vez que houver bootstrap de dados, onboarding automático ou geração assistida de dados.

**Hipótese invalidada:**
“Um fluxo de demo pode aproveitar qualquer estado legado se estiver funcionando localmente.”

**Promover para memória permanente?**
ARCHITECTURE-DECISIONS

---

## [2026-04-19 10:10] [TIPO: PERFORMANCE] [ÁREA: UI, PERFORMANCE] [RELEVÂNCIA: ALTA]
**Contexto:**
Tela com preview e múltiplas abas apresentando sensação de lentidão ao alternar conteúdo.

**Problema ou oportunidade:**
Cada troca de aba parecia reexecutar trabalho demais e piorava a experiência.

**Causa raiz:**
As abas estavam sendo desmontadas condicionalmente, recriando subtree e reativando effects.

**Solução aplicada:**
Manter todas as abas montadas e alternar visibilidade com `display:none`.

**Regra extraída:**
Em telas densas com preview, formulários complexos ou listas pesadas, tabs não devem desmontar conteúdo.

**Quando reutilizar:**
Qualquer página com múltiplas abas e custo alto de recomposição visual ou de efeitos.

**Hipótese invalidada:**
“Desmontar ao trocar aba sempre melhora performance.”

**Promover para memória permanente?**
ARCHITECTURE-DECISIONS

---

## [2026-04-19 09:55] [TIPO: PADRAO] [ÁREA: CONTEXTS, PERFORMANCE] [RELEVÂNCIA: ALTA]
**Contexto:**
Problemas de re-render e instabilidade em hooks dependentes de auth/context.

**Problema ou oportunidade:**
Mudanças aparentemente pequenas geravam reexecuções desnecessárias e comportamento difícil de prever.

**Causa raiz:**
Dependências eram construídas com objetos completos em vez de IDs primitivos.

**Solução aplicada:**
Extrair primitivas estáveis antes de montar dependências e derivar lógica com base nelas.

**Regra extraída:**
Hooks, memos e callbacks devem depender de IDs primitivos sempre que possível.

**Quando reutilizar:**
Qualquer contexto, callback, memo, effect ou query dependente de auth, company, obra ou entidade semelhante.

**Hipótese invalidada:**
“Se o objeto parece estável, pode ir para deps sem problema.”

**Promover para memória permanente?**
ARCHITECTURE-DECISIONS

---

## [2026-04-19 09:40] [TIPO: PADRAO] [ÁREA: UI, PERFORMANCE, SUPABASE] [RELEVÂNCIA: ALTA]
**Contexto:**
Páginas densas com múltiplas abas e widgets de dados.

**Problema ou oportunidade:**
Distribuir fetch dentro de componentes filhos dificultava controle de carregamento, coerência e performance.

**Causa raiz:**
Ausência de um ponto central de orquestração de dados na página principal.

**Solução aplicada:**
Concentrar fetch e orquestração de dados no componente pai e repassar dados aos filhos via props ou contexto controlado.

**Regra extraída:**
Em páginas densas, o componente pai deve ser o principal orquestrador de carregamento e distribuição de dados.

**Quando reutilizar:**
Páginas com tabs, dashboards, previews, KPIs e múltiplas listas dependentes do mesmo conjunto de dados.

**Hipótese invalidada:**
“Separar fetch em cada aba deixa a arquitetura automaticamente mais limpa.”

**Promover para memória permanente?**
ARCHITECTURE-DECISIONS
