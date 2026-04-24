# 📋 SESSION-TEMPLATE — ObraConectada / Lastra
**Versão:** 4.0
**Stack:** React 18 + TypeScript + Supabase + Tailwind CSS + shadcn/ui
**Última atualização:** 2026-04-24

> ⚠️ **ARQUIVOS OBRIGATÓRIOS — LER ANTES DE QUALQUER TAREFA**
>
> 1. `SESSION-TEMPLATE.md` — regras operacionais e modos de trabalho
> 2. `VISUAL.md` — design system e regras de UI
> 3. `PROJECT-MEMORY.md` — memória tática cronológica
> 4. `ARCHITECTURE-DECISIONS.md` — decisões permanentes e restrições
> 5. `PATTERNS.md` — receitas e padrões reutilizáveis
> 6. `PLANO_GERAL_STATUS.md` — status dos sprints (✅/⬜)
> 7. `PLANO_GERAL.txt` — especificações completas de cada prompt
> 8. `src/_auditoria/logs/resumo_paginas.txt` — estado visual atual (quando existir)

---

# 1) SOBRE OS WORKFLOWS

## Como os workflows funcionam

Cada modo de trabalho neste arquivo é um **workflow**. Para ativá-lo:

**Opção A — Seleção via UI do Antigravity**
Selecionar o workflow no menu antes de enviar o prompt.
O agente recebe o contexto do workflow automaticamente.
O prompt pode ser mínimo: apenas o escopo da tarefa.

**Opção B — Referência explícita no prompt**
Escrever no início do prompt:
```
WORKFLOW: [nome]
```
O agente lê este arquivo, localiza a seção do workflow e executa.

**Opção C — Prompt autossuficiente**
Para tarefas únicas ou atípicas, o prompt descreve tudo.
Usar este modelo apenas quando nenhum workflow padrão se aplica.

## Workflows disponíveis

| Workflow | Quando usar |
|---|---|
| `SPRINT_INIT` | Início de qualquer sprint — carrega contexto completo |
| `UI` | Alterações visuais ou de UX |
| `FEATURE` | Nova funcionalidade |
| `DEBUG` | Investigação e correção de bugs |
| `MIGRACAO` | Mudanças de banco de dados |
| `INSPECAO` | Auditoria de código ou estado |
| `SPRINT_CLOSE` | Fechamento de sprint — valida e registra |

---

# 2) WORKFLOW: SPRINT_INIT

**Usar no início de cada sprint.**
Este workflow garante que o agente tenha contexto completo antes de executar.

```
WORKFLOW: SPRINT_INIT
SPRINT: [nome do sprint — ex: SPRINT-B]
MODO: [UI | FEATURE | DEBUG | MIGRACAO | INSPECAO]
ESCOPO: [descrição em 1-3 linhas do que será feito]

LEITURA OBRIGATÓRIA (executar antes de qualquer código):
1. SESSION-TEMPLATE.md — este arquivo
2. VISUAL.md — se MODO incluir UI
3. PROJECT-MEMORY.md — últimos 5 registros + registros da área
4. ARCHITECTURE-DECISIONS.md — decisões aplicáveis ao escopo
5. PATTERNS.md — padrões aplicáveis ao escopo
6. PLANO_GERAL_STATUS.md — confirmar sprint atual e dependências
7. src/_auditoria/logs/resumo_paginas.txt — se existir

CONTEXTO DE AUDITORIA (se existir src/_auditoria/):
- Consultar screenshots da área afetada antes de alterar
- Não alterar o que não está no escopo do sprint

REGRA DE ESCOPO:
- Somente o que está declarado no ESCOPO acima
- Se descobrir problema fora do escopo: registrar em PROJECT-MEMORY, não corrigir
- "Aproveitei e corrigi X" é proibido — vai para o backlog

CRITÉRIO DE SAÍDA (reportar ao fechar):
- [ ] tsc --noEmit zero erros novos
- [ ] Checklist do modo executado (ver seção do modo abaixo)
- [ ] PLANO_GERAL_STATUS.md atualizado
- [ ] PROJECT-MEMORY.md atualizado se houve aprendizado
- [ ] Screenshots comparativos se MODO=UI
```

---

# 3) WORKFLOW: SPRINT_CLOSE

**Usar ao finalizar qualquer sprint.**
Gera o arquivo de auditoria que é enviado para revisão externa.

```
WORKFLOW: SPRINT_CLOSE
SPRINT: [nome — ex: sprint-b]

================================================================
PASSO 1 — VALIDAÇÃO TÉCNICA
================================================================

Executar e colar output no arquivo de auditoria:

  npx tsc --noEmit 2>&1 | head -30
  git diff --stat HEAD~1

================================================================
PASSO 2 — GERAR ARQUIVO DE AUDITORIA
================================================================

Executar o script de captura com nome do sprint:

  node src/_auditoria/capturar_paginas.mjs --sprint [nome]

Exemplos:
  node src/_auditoria/capturar_paginas.mjs --sprint sprint-b
  node src/_auditoria/capturar_paginas.mjs --sprint sprint-b --only-errors

O script gera automaticamente em src/_auditoria/sprints/[sprint]/:
  resumo_[sprint]_[timestamp].txt  ← arquivo principal para auditoria
  data_[sprint]_[timestamp].json   ← dados para comparação futura
  screenshots/[nome]_[sprint].png  ← um por página (nomeados com sprint)

================================================================
PASSO 3 — COMPLETAR O ARQUIVO DE AUDITORIA
================================================================

Abrir o resumo_[sprint]_*.txt gerado e preencher:
  - Colar output do tsc --noEmit na seção ERROS TYPESCRIPT
  - Colar output do git diff --stat na seção ARQUIVOS ALTERADOS
  - Preencher checklist de saída (✅ ou ❌ por item)

================================================================
PASSO 4 — REGISTROS OBRIGATÓRIOS
================================================================

- [ ] PLANO_GERAL_STATUS.md — marcar sprint como ✅
- [ ] PROJECT-MEMORY.md — registrar aprendizados reais (se houver)
- [ ] PATTERNS.md — promover se virou padrão replicável
- [ ] ARCHITECTURE-DECISIONS.md — promover se virou regra permanente

================================================================
PASSO 5 — PENDÊNCIAS
================================================================

Listar tudo descoberto fora do escopo mas não corrigido.
Cada item vira entrada no BACKLOG do PLANO_GERAL_STATUS.md.

================================================================
ENTREGA
================================================================

Enviar para auditoria:
  src/_auditoria/sprints/[sprint]/resumo_[sprint]_[timestamp].txt

Apenas o .txt basta para auditoria padrão.
Screenshots só se houver dúvida visual específica.
```

---

# 4) WORKFLOW: UI

> Antes de qualquer código: ler VISUAL.md completo.
> Referência estrutural: OrcamentoPage.tsx e rota /orcamento.

```
WORKFLOW: UI
TAREFA: [descrição da mudança visual/UX]
ARQUIVOS AFETADOS: [listar]

LEITURA OBRIGATÓRIA:
- VISUAL.md
- PATTERNS.md seções PT-005 a PT-009, PT-022
- PROJECT-MEMORY.md entradas de UI/UX/VISUAL
- src/_auditoria/screenshots/[página afetada].png se existir

CHECKLIST DE EXECUÇÃO:
- [ ] Background de conteúdo usa #F7F7FB (não branco puro)
- [ ] Semântica de cor: verde=positivo, vermelho=problema, âmbar=atenção, cinza=neutro
- [ ] KPIs em cards com label + valor + contexto (não número solto)
- [ ] Abas montadas com display:none (não desmontagem)
- [ ] Ícones inline nas abas (não em faixa separada)
- [ ] Nenhuma cor hardcoded fora dos tokens CSS
- [ ] Empty states com CTA contextual (PT-008)
- [ ] Consistência com /orcamento como referência (AD-007)
- [ ] Solução funciona em desktop 1280px e mobile 375px

NÃO FAZER:
- Introduzir nova cor fora do design system
- Corrigir mais do que está no escopo declarado
- Usar tabela plana onde card-list é superior

CRITÉRIO DE SAÍDA:
- [ ] tsc --noEmit zero erros novos
- [ ] Screenshot da página antes e depois
- [ ] Sem regressão em outras páginas
```

---

# 5) WORKFLOW: FEATURE

```
WORKFLOW: FEATURE
TAREFA: [nome e escopo da feature]
PROMPT REF: [número do PLANO_GERAL.txt se existir]

LEITURA OBRIGATÓRIA:
- PROJECT-MEMORY.md — últimos 5 + área relacionada
- ARCHITECTURE-DECISIONS.md — AD-001 a AD-010
- PATTERNS.md — padrões estruturais aplicáveis
- PLANO_GERAL.txt — spec completa do prompt referenciado

CHECKLIST DE EXECUÇÃO:
- [ ] Spec consultada antes de pedir ao usuário
- [ ] Dependências usam IDs primitivos (AD-001)
- [ ] Fetch centralizado no pai quando aplicável (AD-003)
- [ ] RLS pensada desde o início (AD-005)
- [ ] Tabs mantidas montadas se página densa (AD-002)
- [ ] Fluxos automáticos sem dependência de estado legado (AD-006)
- [ ] Nomenclatura do produto respeitada (AD-008)

NÃO FAZER:
- Pedir spec que já está em PLANO_GERAL.txt
- Introduzir feature quebrando regra consolidada
- Distribuir fetch por abas sem necessidade
- Acoplar a estado implícito/legado

CRITÉRIO DE SAÍDA:
- [ ] tsc --noEmit zero erros novos
- [ ] Feature testada no browser com dados reais
- [ ] PLANO_GERAL_STATUS.md atualizado
```

---

# 6) WORKFLOW: DEBUG

```
WORKFLOW: DEBUG
PROBLEMA: [sintoma observado]
REPRODUÇÃO: [como reproduzir]
ÁREA: [módulo/componente]

INVESTIGAÇÃO OBRIGATÓRIA (antes de corrigir):
1. Verificar PROJECT-MEMORY.md por problema similar
2. Verificar ARCHITECTURE-DECISIONS.md por regra violada
3. Isolar: sintoma vs causa raiz vs gatilho

CHECKLIST DE INVESTIGAÇÃO:
- [ ] Já aconteceu antes? (verificar PROJECT-MEMORY)
- [ ] Hooks após early return? (PT-021 — causa comum de crash)
- [ ] Dependências com objetos inteiros? (AD-001)
- [ ] Tabs desmontando? (AD-002)
- [ ] Fetch fragmentado por componente filho? (AD-003)
- [ ] Console / Network / React DevTools consultados?
- [ ] Erro é de query? (campo inexistente, nome errado, RLS)

NÃO FAZER:
- Corrigir sintoma sem causa raiz
- Alterar múltiplos pontos simultaneamente
- Encerrar sem registrar aprendizado

CRITÉRIO DE SAÍDA:
- [ ] Causa raiz identificada e documentada
- [ ] Correção aplicada na causa (não no sintoma)
- [ ] tsc --noEmit zero erros novos
- [ ] Erro não reproduz no browser
- [ ] PROJECT-MEMORY.md atualizado com causa raiz e regra
```

---

# 7) WORKFLOW: MIGRACAO

```
WORKFLOW: MIGRACAO
TAREFA: [o que migrar, origem, destino]

LEITURA OBRIGATÓRIA:
- ARCHITECTURE-DECISIONS.md AD-004, AD-005, AD-006
- PROJECT-MEMORY.md entradas de MIGRACAO/RLS/SUPABASE

CHECKLIST DE EXECUÇÃO:
- [ ] Estratégia aditiva: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS
- [ ] Sem DROP ou ALTER COLUMN destrutivo (AD-004)
- [ ] RLS compatível com company_id (AD-005)
- [ ] Tipos TypeScript atualizados
- [ ] Queries existentes continuam compatíveis
- [ ] Páginas afetadas mapeadas e testadas

NÃO FAZER:
- Assumir que migração pequena não tem efeito colateral
- Alterar contrato de dados sem mapear impacto em tipos e pages
- Tratar RLS como ajuste tardio

CRITÉRIO DE SAÍDA:
- [ ] Migration executada sem erro
- [ ] tsc --noEmit zero erros novos
- [ ] Páginas afetadas carregam sem erro 400
```

---

# 8) WORKFLOW: INSPECAO

```
WORKFLOW: INSPECAO
ÁREA: [o que inspecionar]
OBJETIVO: [o que se quer descobrir]

LEITURA OBRIGATÓRIA:
- PROJECT-MEMORY.md — últimos 5 + área inspecionada
- ARCHITECTURE-DECISIONS.md — decisões da área

CHECKLIST DE INSPEÇÃO:
- [ ] Hooks após early return? (PT-021)
- [ ] Deps com objetos inteiros? (AD-001)
- [ ] Tabs desmontando? (AD-002)
- [ ] Fetch fragmentado sem orquestração? (AD-003)
- [ ] Queries com "supabase as any" desnecessário?
- [ ] Estado TypeScript correto?
- [ ] RLS respeitada? (AD-005)

SAÍDA ESPERADA:
- Lista de problemas por severidade (🔴/🟡/🟢)
- Causa raiz de cada problema
- Não corrigir durante inspeção — apenas documentar

CRITÉRIO DE SAÍDA:
- [ ] Relatório de problemas gerado
- [ ] PROJECT-MEMORY.md atualizado com descobertas
```

---

# 9) PRINCÍPIO CENTRAL

Este projeto depende de **execução assistida por memória**, não de raciocínio pontual.

Regras invioláveis:
- Não repetir erro documentado
- Não reinventar solução já validada
- Não quebrar padrão consolidado
- Não tratar descoberta importante como detalhe descartável
- Não corrigir fora do escopo declarado

---

# 10) HIERARQUIA DE MEMÓRIA

| Arquivo | Tipo | Quando consultar |
|---|---|---|
| `PROJECT-MEMORY.md` | Tática/cronológica | Início de toda tarefa |
| `ARCHITECTURE-DECISIONS.md` | Estrutural permanente | Arquitetura, dados, RLS, performance |
| `PATTERNS.md` | Receitas replicáveis | UI, features, Supabase, contexts |
| `VISUAL.md` | Design system | Qualquer alteração visual |
| `src/_auditoria/` | Estado atual | Sprints visuais |

---

# 11) CONTEXTO DE PRODUTO

**Nome oficial:** Lastra (anteriormente ObraConectada/ObraFácil)
**O que é:** SaaS de gestão de obras para construtoras brasileiras PME
**Público:** empresas com 2–20 obras simultâneas
**Ambição UX:** sensação premium, moderna, clara — referências: Linear, Notion, Vercel

## Nomenclatura obrigatória
Obra · Etapa · Composição · Insumo · Cotação · Pagamento · Custo Real · Diário de Campo

---

# 12) REGRAS TÉCNICAS FUNDAMENTAIS

## Banco
- RLS: tudo segregado por `company_id`
- Migrations: apenas aditivas (ADD/CREATE IF NOT EXISTS)
- Proibido: DROP, ALTER COLUMN destrutivo

## Performance
- IDs primitivos em dependências (AD-001)
- Tabs montadas com display:none (AD-002)
- Fetch centralizado no pai (AD-003)

## Visual
- Cor primária: roxo `#534AB7`
- Background conteúdo: `#F7F7FB`
- Componentes ui/shadcn: não editar diretamente (AD-009)
- Referência visual: /orcamento e OrcamentoPage.tsx (AD-007)

---

# 13) SEMÂNTICA DE COR (PT-022)

| Cor | Significado | Nunca usar para |
|---|---|---|
| 🟢 Verde | Positivo, concluído, dentro do esperado | Ausência de dados |
| 🔴 Vermelho | Problema, crítico, erro | Neutro |
| 🟡 Âmbar | Atenção, pendente, alerta | Zero quando não é problema |
| ⬜ Cinza | Neutro, sem dados, não aplicável | |

**Regra crítica:** desvio -100% quando realizado=0 é cinza neutro, não verde.

---

# 14) ESTRUTURA DO PROJETO

```
src/
├── components/
│   ├── ui/           # shadcn/ui — não editar diretamente
│   ├── orcamento/    # referência estrutural principal
│   └── AppLayout.tsx
├── contexts/         # AuthContext, CompanyContext
├── pages/
│   ├── OrcamentoPage.tsx  ← referência visual e estrutural
│   └── ...
├── integrations/supabase/untyped.ts  ← usar para queries
├── _auditoria/       # estado atual do sistema (não commitar)
│   ├── screenshots/  # prints de todas as páginas
│   └── logs/         # tsc, resumo, code smells
```

---

**Versão:** 4.0 | **Atualizado:** 2026-04-24
