# Lastra

**Plataforma SaaS de gestão de obras** para engenheiros, arquitetos e construtoras de pequeno e médio porte. Centraliza orçamento, cronograma, financeiro, diário de campo, estoque e comunicação com clientes em um único sistema.

---

## Visão Geral

ObraConectada (agora **Lastra**) foi desenvolvido para substituir o uso fragmentado de Excel, WhatsApp e caderno nas obras brasileiras. O sistema oferece uma interface moderna e mobile-friendly que abrange todo o ciclo de vida de uma obra — do orçamento inicial à entrega final.

**Posicionamento:** foco em construtoras de pequeno e médio porte (2–20 obras simultâneas), com UX acessível para gestores, engenheiros, encarregados e clientes.

---

## Módulos e Funcionalidades

### 🏗️ Obras
- Cadastro e gestão de obras com status, datas e responsáveis
- Seleção global de obra ativa com persistência de contexto
- Painel individual por obra com KPIs, cronograma resumido, últimos registros e fotos

### 📊 Orçamento
- Estrutura WBS em 3 níveis: Categorias → Composições → Insumos
- Integração com tabela SINAPI (busca e referência de preços)
- Modos de visualização: compacto, padrão e detalhado
- Funcionalidade "Colar do Excel" para importação em lote
- Curva ABC com análise por valor e participação acumulada
- Comparativo orçado vs. custo real em tempo real

### 📅 Cronograma
- Editor visual de etapas com datas previstas e reais
- Gráfico de Gantt interativo com arrastar
- Controle de status: não iniciada, em andamento, concluída, atrasada
- Percentual de conclusão por etapa
- Calendário de obra com visualização mensal

### 💰 Financeiro Central (`/financeiro`)
Hub unificado com quatro abas:
- **Pagamentos** — registro, filtro por status (pendente/pago/atrasado), exportação
- **Custo Real** — lançamento de custos com categorização e fornecedor
- **Fluxo de Caixa** — projeção mensal de entradas e saídas
- **DRE** — demonstrativo de resultado simplificado da obra

### 📈 Relatórios & KPIs (`/relatorios`)
- Dashboard consolidado com indicadores da obra
- Exportação em PDF com capa, dados da obra, seções de cronograma, financeiro e diário
- Gerado via `jsPDF` + `jspdf-autotable` com dados reais do banco

### 🔨 Execução & Canteiro (`/execucao`)
Hub operacional com cinco abas:
- **Diário** — lançamento diário com clima, trabalhadores, serviços, fotos e problemas
- **Pendências** — rastreamento de problemas e ocorrências com status
- **Estoque** — controle de materiais com movimentações de entrada/saída
- **Equipe** — gestão da equipe da obra
- **Agenda** — calendário de eventos e compromissos da obra

### 📁 Documentos
- Upload e organização de documentos por categoria
- Visualização e download de arquivos da obra

### 👥 Contatos (`/contatos`)
Agenda unificada substituindo o módulo de fornecedores:
- Tipos: Cliente, Fornecedor de Material, Mão de Obra, Parceiro, Projetista, Outro
- **Click-to-call** (`tel:`), **WhatsApp** (`wa.me/`) e **E-mail** (`mailto:`) nativos — funciona no mobile sem instalar nada
- Filtro por tipo com chips, busca por nome/empresa/especialidade
- CRUD completo com drawer lateral

### 🔗 Links de Acesso Público *(Sprint G — novo)*
Sistema de compartilhamento sem login para clientes e funcionários:

**Link de Visualização (`/v/:token`)**
- Acesso read-only configurável por seção e indicador
- Permissões granulares: o gestor define exatamente o que cada audiência pode ver
  - Painel (andamento %, cronograma resumido, fotos, KPIs financeiros)
  - Cronograma (status de etapas, datas, valores)
  - Financeiro (pagamentos, custo real, fluxo, DRE)
  - Diário (registros, fotos, trabalhadores, problemas)
  - Relatório (andamento, dados financeiros)
- Múltiplos links por obra (banco, cliente, sócio, arquiteto — cada um com permissões diferentes)
- Layout limpo sem sidebar, mobile-friendly

**Link de Operação (`/o/:token`)**
- Formulário mobile-first para funcionários em campo — sem necessidade de conta ou senha
- Página única com scroll natural (sem wizard)
- Seletor visual de clima com ícones grandes
- Stepper de trabalhadores ("da sua equipe")
- Registro de atividades do dia em texto livre
- Toggle de ocorrências/problemas
- Foto de nota fiscal para recebimento de material
- Sinalização de falta de material
- Upload de fotos do dia
- Botão ENVIAR fixo no rodapé
- Tela de sucesso pós-envio
- Cada registro fica vinculado ao nome configurado no link (trilha de auditoria)

### 🛡️ Administração
- Painel admin com gestão de empresas e planos
- Controle de usuários por empresa (roles: gestor, funcionário, admin)
- Onboarding guiado para novas empresas

---

## Arquitetura de Navegação

O menu lateral é organizado em 5 seções:

| Seção | Itens |
|---|---|
| **Obra** | Obras · Painel da Obra |
| **Planejamento** | Orçamento · Cronograma |
| **Financeiro** | Financeiro · Relatórios & KPIs |
| **Canteiro** | Execução & Diário · Documentos |
| **Rede** | Contatos |

**Redirects automáticos para retrocompatibilidade:**
- `/agenda` → `/execucao?tab=agenda`
- `/estoque` → `/execucao?tab=estoque`
- `/fornecedores` → `/contatos`
- `/insumos` → `/orcamento`
- `/diario` → `/execucao?tab=diario`

---

## Stack Técnica

### Frontend
| Tecnologia | Uso |
|---|---|
| React 18 + TypeScript | Base da aplicação |
| Vite | Build e dev server |
| React Router v6 | Navegação e rotas públicas sem auth |
| Tailwind CSS | Estilização |
| shadcn/ui | Componentes de UI |
| date-fns | Manipulação de datas (locale pt-BR) |
| Lucide React | Ícones |
| jsPDF + autotable | Geração de relatórios em PDF |
| Recharts | Gráficos financeiros e de progresso |

### Backend / Infraestrutura
| Tecnologia | Uso |
|---|---|
| Supabase | Backend completo (Postgres + Auth + Storage + Edge Functions) |
| PostgreSQL | Banco de dados principal |
| Row Level Security (RLS) | Isolamento de dados por empresa |
| Supabase Storage | Armazenamento de fotos e documentos |
| Supabase Edge Functions | Lógica serverless (ex: validação de links públicos) |

---

## Banco de Dados — Principais Tabelas

| Tabela | Descrição |
|---|---|
| `companies` | Empresas (multitenancy) |
| `profiles` | Usuários com role e empresa |
| `obras` | Obras cadastradas |
| `orcamento_categorias` | Etapas/categorias do orçamento (WBS) |
| `orcamento_composicoes` | Composições de cada categoria |
| `orcamento_subitens` | Insumos de cada composição |
| `pagamentos` | Lançamentos de pagamentos |
| `custo_real_itens` | Custos efetivamente realizados |
| `diario_registros` | Registros diários da obra |
| `materiais` | Materiais em estoque |
| `movimentacoes` | Movimentações de estoque |
| `contatos` | Agenda de contatos (clientes, fornecedores, equipes) |
| `documentos_obra` | Documentos anexados à obra |
| `obra_agenda` | Eventos da agenda da obra |
| `obra_links` | Links públicos de acesso (visualização e operação) |
| `recebiveis` | Lançamentos de recebíveis |
| `entradas_pendentes` | Fotos de NF enviadas por funcionários aguardando processamento |

---

## Rotas da Aplicação

### Rotas protegidas (requerem login)
| Rota | Módulo |
|---|---|
| `/obras` | Lista e gestão de obras |
| `/painel` | Painel da obra selecionada |
| `/orcamento` | Orçamento — WBS, cotação, insumos |
| `/cronograma` | Cronograma e Gantt |
| `/financeiro` | Hub financeiro (pagamentos, custo real, fluxo, DRE) |
| `/relatorios` | Relatórios e KPIs com exportação PDF |
| `/execucao` | Hub de execução (diário, pendências, estoque, equipe, agenda) |
| `/documentos` | Documentos da obra |
| `/contatos` | Agenda de contatos |
| `/usuarios` | Gestão de equipe |
| `/perfil` | Perfil do usuário |
| `/admin/*` | Administração da plataforma |

### Rotas públicas (sem login)
| Rota | Descrição |
|---|---|
| `/v/:token` | Visualização pública configurável (para clientes) |
| `/o/:token` | Formulário de operação mobile (para funcionários em campo) |

### Edge Functions
| Função | Descrição |
|---|---|
| `verify-link` | Valida token de acesso público e retorna dados da obra |

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── execucao/        # Tabs do hub de execução (Diário, Estoque, Equipe, Agenda...)
│   ├── gantt/           # Editor de Gantt
│   ├── obra/            # Componentes de obra (LinksDeAcessoCard...)
│   ├── orcamento/       # Componentes do módulo de orçamento
│   ├── painel/          # Cards e widgets do painel da obra
│   ├── ui/              # shadcn/ui components
│   └── AppLayout.tsx    # Layout principal com sidebar e mobile nav
├── contexts/            # Contextos globais (Auth, Obras, Orçamento, Estoque...)
├── hooks/               # Hooks customizados
├── integrations/        # Cliente Supabase
├── lib/                 # Utilitários
└── pages/
    ├── admin/           # Páginas de administração
    ├── public/          # Páginas públicas sem autenticação
    │   ├── VisualizacaoPublicaPage.tsx
    │   └── OperacaoMobilePage.tsx
    └── *.tsx            # Páginas principais da aplicação

supabase/
├── functions/
│   └── verify-link/    # Edge Function de validação de links públicos
└── migrations/          # Migrations do banco de dados
```

---

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Verificar tipos TypeScript
npx tsc --noEmit

# Build de produção
npm run build
```

> O servidor de desenvolvimento inicia em `http://localhost:8080` por padrão.

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## Planos e Funcionalidades por Plano

| Funcionalidade | Básico | Pro | Enterprise |
|---|---|---|---|
| Gestão de obras | ✅ | ✅ | ✅ |
| Orçamento e SINAPI | ✅ | ✅ | ✅ |
| Financeiro completo | ✅ | ✅ | ✅ |
| Execução e diário | ✅ | ✅ | ✅ |
| Links de visualização | ❌ | ✅ até 3/obra | ✅ ilimitado |
| Links de operação | ❌ | ✅ até 5/obra | ✅ ilimitado |
| Processamento de NF com IA | ❌ | ❌ | ✅ |

---

## Licença

Todos os direitos reservados. © Lastra.
