# 🤖 Workflows do Antigravity para ObraConectada

Cada workflow carrega automaticamente o **SESSION-TEMPLATE.md** como contexto antes de qualquer tarefa.

## 📋 Workflows Disponíveis

### 1. 🔍 **inspecao.md**
Mapear código antes de qualquer alteração.

**Use quando:**
- Precisa entender um trecho de código
- Quer diagnosticar um problema antes de consertar
- Quer revisar padrões (dependências, performance)

**Exemplo:**
```
/inspecao src/contexts/ObrasContext.tsx
```

---

### 2. 🎨 **ui.md**
Layout e estilos sem alterar lógica de negócio.

**Use quando:**
- Precisa alterar visual/layout
- Quer melhorar UX/acessibilidade
- Quer usar componentes shadcn/ui

**Exemplo:**
```
/ui src/components/orcamento/CatalogDrawer.tsx
```

**Restrições:**
- ❌ Não alterar handlers, queries ou contextos
- ✅ Apenas Tailwind + shadcn/ui + lucide-react

---

### 3. ⚙️ **feature.md**
Implementar nova funcionalidade completa.

**Use quando:**
- Precisa criar uma feature do zero
- Envolve types → context → componente → página → rota
- Pode envolver novas tabelas no banco

**Exemplo:**
```
/feature "Modo de visualização pública para clientes"
```

**Ordem obrigatória:**
1. Tipos
2. Context
3. Componente
4. Página
5. Rota
6. Integração com auth

---

### 4. 🔄 **migracao.md**
Refatorar padrão em múltiplos arquivos sem quebrar comportamento.

**Use quando:**
- Precisa padronizar código (ex: user → userId)
- Quer refatorar sem quebrar componentes consumidores
- Envolve mudanças em 3+ arquivos

**Exemplo:**
```
/migracao "Extrair IDs primitivos em todos os contexts"
```

**Garantia:**
- ✅ Comportamento preservado
- ✅ Nomes de props mantidos
- ✅ Zero breaking changes

---

### 5. 🐛 **debug.md**
Investigar causa raiz antes de qualquer correção.

**Use quando:**
- Há um bug a resolver
- Precisa diagnosticar performance
- Quer entender por que algo está falhando

**Exemplo:**
```
/debug "Página fica com sensação de reload ao navegar"
```

**Primeiro passo automático:**
```bash
grep -r "\[user\]\|\[company\]\|\[obras\]" src/contexts/
```

---

### 6. 🚀 **sprint.md**
Iniciar sessão de sprint — carrega contexto e mostra próximo da fila.

**Use quando:**
- Iniciando uma nova sessão de trabalho
- Quer saber qual é o próximo item da fila
- Quer verificar dependências antes de começar

**Exemplo:**
```
/sprint
```

**Lê automaticamente:**
1. SESSION-TEMPLATE.md (contexto completo)
2. PLANO_GERAL_STATUS.md (status dos sprints)

---

## 🎯 Como Usar

### Passo 1: Escolher o Workflow
Baseado em **o que você precisa fazer**, escolha um dos 6 workflows.

### Passo 2: Substituir Placeholders
Cada workflow tem seções `[SUBSTITUIR]`:
- Descrição da tarefa
- Arquivos/componentes afetados
- Resultado esperado

### Passo 3: Confirmar com o Usuário
Antes de avançar para implementação, sempre confirmar:
- ✅ Entendimento correto
- ✅ Escopo bem definido
- ✅ Sem dependências bloqueantes

---

## 🔗 Estrutura: Workflows + SESSION-TEMPLATE

```
.agent/workflows/
├── README.md              ← Você está aqui
├── inspecao.md            ← Mapear código
├── ui.md                  ← Layout/estilos
├── feature.md             ← Nova feature
├── migracao.md            ← Refatorar padrão
├── debug.md               ← Investigar bug
└── sprint.md              ← Iniciar sprint

SESSION-TEMPLATE.md        ← Carregado por TODOS os workflows
├── Contexto de Produto
├── Banco de Dados
├── Decisões Arquiteturais
├── Estrutura de Pastas
├── Imports Padrão
└── Padrões Críticos
```

---

## 📌 Regras Universais (Todos os Workflows)

1. ✅ **Ler SESSION-TEMPLATE.md primeiro** — contexto completo do projeto
2. ✅ **Confirmar com usuário antes de alterar** — não assumir nada
3. ✅ **Implementar em blocos pequenos** — reportar cada bloco antes de avançar
4. ✅ **Zero erros TypeScript** — antes de considerar concluído
5. ✅ **Testar no navegador** — não apenas "sintaxe funciona"

---

## 🚀 Quick Start

### Primeira vez?
1. Abra `/sprint`
2. Leia SESSION-TEMPLATE.md e PLANO_GERAL_STATUS.md
3. Identifique o próximo item
4. Escolha o workflow apropriado para aquele item

### Dia a dia?
1. Identifique o que precisa fazer
2. Escolha o workflow correspondente
3. Preencha os `[SUBSTITUIR]`
4. Deixe o workflow guiar a implementação

---

**Versão:** 2.0  
**Última atualização:** 2026-04-19
