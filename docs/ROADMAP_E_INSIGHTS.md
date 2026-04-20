# 🧠 Obra Conectada — Diário de Bordo, Arquitetura & Insights Técnicos

> **Para Agentes IA:** Leia este documento integralmente antes de implementações de UI, novos Contexts ou refatorações estruturais. Ele é a memória consolidada do sistema.
> **Última atualização:** 2026-04-17

---

## 🏗️ 1. Visão de Produto

O Obra Conectada **não é uma planilha de luxo**. É um ERP leve de execução integrado:
- Centralizar o fluxo: Orçamento → Cotação → Compra → Custo Real, **sem ping-pong de telas**
- O usuário digita uma vez e o sistema propaga para todos os módulos
- A interface deve ser **premium e funcional** — inspirada em ferramentas como Linear, Notion e Vercel

### Filosofia de UX
- **Workspace centralizado**: o usuário resolve um fluxo completo em uma aba (ex: `/orcamento`)
- **Redução de cliques**: hints inline, autocomplete, aplicação com um clique
- **Zero redundância visual**: cada botão tem uma função única e clara
- **Mobile-first para fornecedores**: rotas públicas (ex: `/cotacao/:token`) são otimizadas para celular

---

## 🗄️ 2. Banco de Dados (Supabase)

### Tabelas principais
| Tabela | Propósito |
|--------|-----------|
| `obras` | Projetos de construção. Tem `company_id` para multi-tenant. |
| `profiles` | Usuários. Campo `role`: `gestor`, `tecnico`, `admin` |
| `companies` | Empresas clientes. Liga `profiles` ↔ `obras` |
| `orcamentos` | Um registro por obra. Salva `etapas` como JSONB gigante |
| `orcamento_categorias` | Tabela de **etapas** (confusamente nomeada). 80 rows = etapas das obras. |
| `orcamento_composicoes` | Composições de cada etapa (tem `categoria_id` → `orcamento_categorias`) |
| `orcamento_subitens` | Insumos das composições (campos: `id, composicao_id, nome, unidade, quantidade...`) |
| `sinapi_composicoes` | ~10.360 composições do SINAPI. Colunas: `codigo`, `descricao`, `unidade`, `grupo` |
| `sinapi_insumos` | Insumos SINAPI por código e UF |
| `sinapi_composicao_itens` | Itens (insumos) de cada composição SINAPI com coeficiente |
| `precos_fornecedores` | Histórico de preços por insumo e fornecedor (hint de preço inline) |
| `cotacao_links` | Links digitais de cotação para fornecedores. Token único, sem auth. |
| `cotacao_precos_manuais` | Preços inseridos manualmente por fornecedor e item_key. |
| `cotacao_categorias` | Categorias de especialidade de material/serviço (NÃO é etapa). 10 categorias padrão por empresa. |
| `cotacao_listas` | Listas de cotação salvas por empresa/obra. `item_keys text[]` + `tipo` + `config jsonb` |
| `cotacao_fornecedor_listas` | Vínculo N:N entre `fornecedores` e `cotacao_listas` |
| `fornecedores` | Cadastro de fornecedores por obra/empresa. Tem `especialidades text[]` |
| `catalogo_composicoes` | Composições favoritas/históricas por empresa (`company_id`) |
| `orcamento_etapa_dependencias` | Dependências entre etapas (tipo FS/SS/FF/SF + lag em dias) |
| `cronograma_tarefas` | Tarefas do Gantt. Tem `tipo_tarefa` (PADRAO/MARCO/RESUMO), `is_critico`, `baseline_inicio/fim`, `percentual_concluido` |
| `cronograma_dependencias` | Dependências entre tarefas do Gantt (tipo FS/SS/FF/SF + lag) |
| `recursos_obra` | Equipes, equipamentos, mão de obra alocáveis às tarefas |
| `cronograma_alocacoes` | Liga tarefas ↔ recursos (quantidade + horas_por_dia) |

### Políticas RLS críticas
- `cotacao_links`: SELECT público por token, UPDATE público para salvar respostas
- `catalogo_composicoes`: isolado por `company_id`
- `orcamentos`: isolado por `company_id` (via JOIN em `obras`)
- `cotacao_categorias`, `cotacao_listas`, `cotacao_fornecedor_listas`: RLS por `company_id`
- `sinapi_*`: leitura pública, sem RLS restritivo

### Schema de `orcamentos.etapas` (JSONB)
```
OrcamentoEtapa {
  id: string (UUID)
  codigo: string (ex: "01")
  nome: string
  precoTotal: number
  usaComposicoes: boolean
  dataInicioPrevista?: string (ISO)
  dataFimPrevista?: string (ISO)
  composicoes: OrcamentoComposicao[]
}
OrcamentoComposicao {
  id: string
  codigo: string (ex: "01.01")
  descricao: string
  unidade: string
  quantidade: number | null
  precoUnitario: number | null
  precoTotal: number
  usaInsumos: boolean
  fonteReferencia?: string  ← 'SINAPI'
  ufReferencia?: string
  regimeReferencia?: string
  referenciaCompetencia?: string
  insumos: OrcamentoInsumo[]
}
OrcamentoInsumo {
  id: string
  codigo: string (ex: "01.01.001")
  descricao: string
  unidade: string
  quantidade: number | null
  precoUnitario: number | null
  precoTotal: number
}
```

### item_key no Mapa de Cotação
```
Composição sem insumos: item_key = composicao.id
Insumo de composição:   item_key = "composicao.id::insumo.id"
```

---

## ⚙️ 3. Arquitetura Frontend

### Stack
- **Framework**: Vite + React 18 + TypeScript
- **Design System**: shadcn/ui + TailwindCSS + lucide-react
- **Gráficos**: Recharts 2.15 (já instalado, usar sempre este)
- **Routing**: React Router v6 (`BrowserRouter`)
- **State**: React Context API (não Redux/Zustand)
- **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Supabase**: via `@/integrations/supabase/untyped` (client não tipado, aceita `as unknown as T`)
- **Export Excel/CSV**: lib `xlsx` já instalada

### Contextos principais
| Contexto | Local | Responsabilidade |
|----------|-------|-----------------|
| `OrcamentoContext` | `src/contexts/OrcamentoContext.tsx` | Todo o estado do orçamento, save, finalizar, catálogos, sugestões, `getTodasComposicoes` |
| `AuthContext` | `src/contexts/AuthContext.tsx` | User auth, `user.role` |
| `ObrasContext` | `src/contexts/ObrasContext.tsx` | Lista de obras da empresa |
| `ObraSelectionContext` | `src/contexts/ObraSelectionContext.tsx` | Obra atualmente selecionada |
| `SuprimentosContext` | `src/contexts/SuprimentosContext.tsx` | Fluxo de suprimentos/compras |

### Rotas críticas
| Rota | Componente | Auth |
|------|-----------|------|
| `/orcamento` | `OrcamentoCentral` → `OrcamentoDashboard` / `OrcamentoEditor` / `CotacaoCentral` | Protegida |
| `/cronograma` | `CronogramaPage` | Protegida |
| `/cotacao/:token` | `CotacaoPublicaPage` | **Pública** (fornecedor sem login) |
| `/insumos` | `InsumosPage` | Protegida |
| `/fornecedores` | `FornecedoresPage` | Protegida |

### Hooks customizados relevantes
| Hook | Arquivo | Responsabilidade |
|------|---------|-----------------|
| `useCronograma` | `hooks/useCronograma.ts` | CRUD tarefas, dependências, baseline, cascade de datas |
| `useRecursos` | `hooks/useRecursos.ts` | CRUD recursos e alocações, detecção de superalocação |
| `useGanttFinanceiro` | `hooks/useGanttFinanceiro.ts` | Total orçado por etapa para o Gantt |
| `useCotacaoCategorias` | `hooks/useCotacaoCategorias.ts` | Carrega `cotacao_categorias` com fallback offline |
| `usePersistentPageState` | `hooks/usePersistentPageState.ts` | Estado persistido por sessão (sessionStorage) |

---

## 🚦 4. Estado Atual do Sistema (por módulo)

### ✅ Módulo Orçamento — COMPLETO (com refinamentos menores pendentes)

#### Aba Visão Geral (Dashboard)
- [x] KPIs: Total Previsto, % Cotado, Itens Sem Preço, Total de Composições
- [x] Alerta quando há itens sem preço (link direto para cotação)
- [x] Finalizar Orçamento → consolida em `catalogo_composicoes`
- [x] Lista de etapas expansível com composições inline
- [x] Distribuição por etapa/categoria (gráfico rosca) + Curva ABC filtráveis

#### Aba Planilha Orçamentária
- [x] Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- [x] Auto-save (debounce 1s) + spinner
- [x] Drag-and-drop de etapas (`@dnd-kit`)
- [x] Semáforo de completude 🔴/🟡/🟢 por composição
- [x] Barra de progresso de cotação por etapa
- [x] Badge SINAPI no card colapsado (azul, tooltip com contagem)
- [x] Border-left contextual: azul (SINAPI) / roxo (insumos) / neutro
- [x] CatalogDrawer global 72vw: abas Suas obras / Favoritas / Modelos / SINAPI, carrinho multi-etapa
- [x] Hint de preço histórico inline (`precos_fornecedores`)
- [x] Toggle "Detalhar em insumos"
- [x] ⭐ Favoritar → `catalogo_composicoes`
- [x] Settings popover ⚙️: datas + dependências FS/SS/FF/SF
- [x] Importar de outra obra (Mesclar / Substituir)
- [x] 3 modos de densidade (compact/normal/expanded)
- [x] Numeração automática de etapas `'01'`–`'99'`
- [x] Busca universal no CatalogDrawer (paralela: SINAPI + catálogos)

#### Aba Cotação & Preços
- [x] Journey Bar de progresso (Itens → Enviadas → Respostas → % Precificado)
- [x] Mini-KPI panel (3 cards interativos: Itens / % Cotados / Total)
- [x] Mapa Comparativo: tabela insumos × fornecedores, P.Unit + P.Total, melhor preço em verde
- [x] Coluna "Adotado" com seleção de fornecedor por célula (clicar célula = adotar preço)
- [x] Banner "Aplicar preços adotados" → atualiza orçamento em lote
- [x] Fornecedores manuais (`cotacao_precos_manuais`): adicionar, editar inline, remover
- [x] Links Digitais: token único, validade 30 dias, copiar com 1 clique+
- [x] Exportar CSV completo
- [x] Filtros: busca texto, etapa, status (sem preço / cotados)
- [x] Filtro "⚡ Relevante para [Fornecedor]" — filtra itens por especialidade do fornecedor
- [x] Colar preços de planilha (TSV/tab separated) → matching fuzzy por descrição
- [x] Gerar Comparativo de Preços (HTML imprimível agrupado por fornecedor)
- [x] Referência SINAPI por item (coluna opcional, toggle no toolbar)
- [x] CotacaoDrawer (75vw, 2 modos):
  - [x] Modo "Enviar Cotação": seleção de itens + múltiplos fornecedores → gera links em lote
  - [x] Modo "Inserir Preços": seleção de itens + input P.Unit → salva em `cotacao_precos_manuais`
  - [x] Botão "⚡ Sugerir itens" → seleciona itens relevantes pela especialidade do fornecedor
  - [x] Salvar seleção como lista → `cotacao_listas` + vínculo em `cotacao_fornecedor_listas`
  - [x] Carregar lista salva → aplica item_keys ao carrinho com 1 clique
  - [x] Fornecedores com especialidade marcados com ⚡
- [x] Página pública `/cotacao/:token`: mobile-first, agrupado por etapa, sem login, permite re-envio

#### Pendências de refinamento (Cotação)
- [ ] **Decisão arquitetural: SINAPI no Mapa** — ver seção 7
- [ ] Agrupamento de botões no toolbar (muitos botões visíveis)
- [ ] Badge origem por célula: 🔗 link / ✏️ manual / 📊 SINAPI
- [ ] Estado visual "Aguardando" (ícone pulsante em links pendentes)

---

### ✅ Módulo Cronograma — PRATICAMENTE COMPLETO (ajustes menores)

#### Implementado
- [x] CronogramaPage com 3 modos de visualização: Split (WBS + Gantt), Lista, Gantt
- [x] WBS Panel: hierarquia de tarefas (nível 1 = etapa, nível 2 = sub-tarefa)
- [x] Tipos de tarefa: PADRAO, MARCO (◆), RESUMO (negrito)
- [x] Campo de progresso inline (%) + barra visual
- [x] Status automático: Não Iniciada / Em Andamento / Atrasada / Concluída
- [x] SPI (Schedule Performance Index) calculado com baseline
- [x] Baseline: salvar / desbloquear (Salvar Baseline = congela datas como referência)
- [x] GanttCanvasPanel: Gantt interativo com arrastar barras, zoom, setas de dependência
- [x] Tipos de dependência: FS, SS, FF, SF + lag em dias
- [x] Cascata de datas ao arrastar (applyDateCascade)
- [x] TaskDetailDrawer: painel lateral com abas Detalhes / Predecessoras / Recursos / Orçamento
- [x] Painel de Recursos: adicionar equipes/equipamentos, barra de uso %, alerta de superalocação
- [x] Curva S: avanço planejado vs. realizado (gráfico Recharts)
- [x] KPI row: Progresso Geral / Concluídas / Atrasadas
- [x] Seletor de obra no header
- [x] AddTaskBar inline (Enter para criar)

#### Pendências de ajuste (Cronograma)
- [ ] Vinculação real tarefa ↔ composição de orçamento (campo `orcamento_composicao_id` existe no schema mas UI não usa ainda)
- [ ] Alerta visual de Caminho Crítico (is_critico já existe no banco, falta highlight no Gantt)
- [ ] Drag handle para reordenar tarefas no WBS
- [ ] Subtarefas aninhadas além do nível 2

---

### ✅ Módulo Fornecedores — COMPLETO
- [x] Listagem + busca
- [x] CRUD completo (criar, editar, excluir)
- [x] Multi-select de especialidades (chips) vinculados a `cotacao_categorias`
- [x] Exibe badges de especialidade por fornecedor na listagem
- [x] Link para Banco de Preços (`/insumos?fornecedor=...`)

---

### ⚠️ Módulo Painel da Obra — COM FUNCIONALIDADES, PRECISA REVISÃO
- [x] PainelObraPage com múltiplas views (SmartCards, ResumoExecutivo, etc.)
- [x] SCurveChart, GanttChart, CronogramaPagamentos
- [x] Diário de obra, Pendências, Agenda
- [ ] Integração com dados reais do cronograma (usa dados sintéticos em alguns componentes)
- [ ] UX/UI a revisar para consistência com o resto do sistema

---

### ✅ Módulos Auxiliares — ESTÁVEIS
- [x] Diário de Obra (`DiarioPage`) — registro de ocorrências + fotos
- [x] Equipe (`EquipePage`) — gerenciamento de membros
- [x] Estoque (`EstoquePage`) — controle de materiais
- [x] Documentos (`DocumentosPage`) — uploads e gestão
- [x] Custo Real (`CustoRealPage`) — acompanhamento de custos realizados vs. orçados
- [x] Pagamentos (`PagamentosPage`) — calendário e fluxo de caixa
- [x] Relatórios (`RelatoriosPage`) — exportações e dashboards
- [x] Agenda (`AgendaObraPage`) — eventos e atividades

---

## 🔧 5. Padrões de Código

### Salvar no Supabase
```ts
import { supabase } from '@/integrations/supabase/untyped';
const { data } = await (supabase as any).from('tabela').select('*').eq('campo', valor);
// Cast: data as unknown as MinhaInterface[]
```

### Busca SINAPI (sem unaccent)
```ts
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
```

### Padrão Carrinho
```tsx
const [drawerOpen, setDrawerOpen] = useState(false);
const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
const handleApply = async (items: CarrinhoItem[]) => { /* ação em lote */ };
```

### Sheet com largura customizada
```tsx
<SheetContent
  side="right"
  className="p-0 flex flex-col overflow-hidden"
  style={{ width: '72vw', maxWidth: 'none' }}
>
```
> ⚠️ O `Sheet` do shadcn tem `sm:max-w-sm` hardcoded no CVA. `style` inline é a única saída confiável.

### Anti-padrões
- ⚠️ Não usar `supabase` tipado (`@/integrations/supabase/client`) — usar `untyped`
- ⚠️ Não implementar regras de negócio nos componentes — usar os Contextos
- ⚠️ Sempre checar `usaInsumos` antes de iterar `insumos` (pode ser `[]` mesmo quando `false`)
- ⚠️ `COMPOSICAO_GRID` é exportada de `ComposicaoRow.tsx` — alterar em um só lugar
- ⚠️ Ao substituir blocos JSX, verificar equilíbrio de `</div>` — desequilíbrio causa crash silencioso

---

## 🔴 6. Bugs Conhecidos / Limitações

| Problema | Status | Workaround |
|----------|--------|------------|
| `unaccent()` não disponível | Limitação permanente | Normalização no front com `normalize('NFD')` |
| `cotacao_links.expires_at NULL` bloqueava SELECT | **Corrigido** | — |
| GlobalFAB em `/orcamento` | **Corrigido** | Oculto via `useLocation` |
| Gráfico de rosca cortava legend | **Corrigido** | Legend horizontal |
| BUG-1: `company_id` faltando no INSERT de `cotacao_links` | **Corrigido** | — |
| BUG-2: Re-envio bloqueado em links `respondido` | **Corrigido** | — |
| BUG-3: `ComposicaoRow` usava `catalogo_pessoal` inexistente | **Corrigido** | Tabela: `catalogo_composicoes` |
| BUG-4: Catálogo filtrava por nome de etapa, não por obra | **Corrigido** | `getTodasComposicoes()` sem filtro |
| JSX desbalanceado em `OrcamentoEditor` (painel 50/50) | **Corrigido** | `</div>` adicionado |
| `Sheet` shadcn limita largura via `sm:max-w-sm` no CVA | Limitação de design system | `style` inline |
| `cronograma_tarefas.totalPrevisto` faltando | **Corrigido** | `useGanttFinanceiro` |

---

## 🚀 7. Roadmap & Decisões Pendentes

### 🟡 Decisão Arquitetural em Aberto: SINAPI no Mapa de Cotação

**Contexto:** Quando o usuário importa uma composição SINAPI na Planilha Orçamentária, seus insumos aparecem no Mapa Comparativo da Cotação com o preço SINAPI como referência. O comportamento atual é:
- O preço SINAPI aparece na **coluna "Ref. SINAPI"** (toggle separado no toolbar)
- Os campos de cotação real ficam em branco (aguardando cotação de fornecedores reais)

**Opções em discussão:**

**Opção A — Referência Visível (status quo + melhorias)**
> SINAPI aparece como coluna separada (já implementado). Usuário precisa clicar/cotar para preencher os campos de fornecedores reais. Melhor visibilidade do desvio real vs. SINAPI.
> - ✅ Sem risco de dados misturados
> - ✅ Deixa claro que SINAPI é referência, não cotação real
> - ❌ Exige mais cliques para ver a comparação

**Opção B — Auto-preenchimento como Fornecedor "SINAPI"**
> Criar um fornecedor virtual "SINAPI [UF]" no mapa automáticamente com os preços da tabela. O usuário pode sobrescrever com cotações reais.
> - ✅ Comparação imediata no mapa sem setup
> - ✅ % cotado já começa maior (motivação)
> - ❌ Mistura referência técnica com cotação real — pode confundir

**Opção C — Pre-seleção Inteligente (recomendada)**
> No CotacaoDrawer, o status de filtro padrão ao abrir é "Sem preço". Itens SINAPI já têm preço (via `precoAtual`) — ficam no filtro "Cotados". Um badge "📊 SINAPI" diferencia a origem. Usuário decide se quer sobrescrever ou não.
> - ✅ Sem mudança arquitetural
> - ✅ Badge de origem resolve a legibilidade
> - ✅ Preserva o preço SINAPI como base para o orçamento
> - ❌ Precisa do badge de origem por célula implementado

**→ Decisão pendente com o usuário**

---

### 📋 Próximas Sessões — Ordem Sugerida

| # | Tarefa | Módulo | Complexidade | Impacto |
|---|--------|--------|-------------|---------|
| 1 | Agrupamento de botões no toolbar da Cotação (Dropdown "Mais ações") | Cotação | Baixa | UX |
| 2 | Badge de origem por célula (🔗 / ✏️ / 📊) no Mapa | Cotação | Baixa | UX |
| 3 | Decisão + implementação SINAPI no Mapa | Cotação | Média | Arquitetura |
| 4 | Highlight de Caminho Crítico no Gantt (`is_critico`) | Cronograma | Baixa | UX |
| 5 | Drag & Drop de tarefas no WBS (reordenação) | Cronograma | Média | UX |
| 6 | Vincular tarefa ↔ composição de orçamento (UI para `orcamento_composicao_id`) | Cronograma | Média | Integração |
| 7 | Revisar PainelPage para usar dados reais + consistência visual | Painel | Média | Produto |
| 8 | Modo Demo: RPC `clone_demo_obras` | Produto | Alta | Comercial |
| 9 | Onboarding completo + integração de pagamento | Produto | Alta | Comercial |

---

## 💡 8. Insights de UX Validados

- **Inline > Modal**: hints de preço inline eliminam modais. 1 clique = 10× mais rápido
- **Semáforo visual**: 🔴/🟡/🟢 é mais rápido de scanear que badges de texto
- **Pré-seleção inteligente**: pré-filtrar "sem preço" ao abrir o drawer economiza 80% dos cliques
- **Padrão Carrinho > formulários sequenciais**: coleta assíncrona + execução em lote reduz O(n cliques) para O(1). Validado no `CatalogDrawer` e `CotacaoDrawer`
- **O Carrinho não substitui o Mapa**: Mapa = leitura/análise; Drawer = entrada eficiente. Separar evita sobrecarga cognitiva
- **Drawer lateral > split 50/50**: split comprime colunas do Mapa. Overlay de 70-75vw preserva o contexto
- **Sheet com width customizado**: `sm:max-w-sm` hardcoded no CVA. Solução: `style` inline
- **Finalizar Orçamento = ciclo virtuoso**: preços → `catalogo_composicoes` → "Suas obras" em obras futuras
- **Etapas colapsadas devem ser informativas**: badge SINAPI + dot + N comp + % — scanning sem expandir
- **Filtros na Cotação são não-negociáveis**: 80-300 itens em produção = sem filtro = inutilizável
- **Header global em todas as abas**: elimina desorientação ("em qual obra estou?")
- **Fio cromático**: índigo = estrutura, azul = SINAPI, roxo = detalhado, verde = concluído, vermelho = alerta, emerald = finalizado, âmbar = atenção/baseline
- **Especialidades de fornecedor**: chips visuais no cadastro + filtro no mapa = procurement inteligente sem overhead

---

## 🚀 9. Sprint D — Central de Execução & Diário de Obra

### Arquitetura de Navegação
- `/execucao` substitui `/diario` e `/pendencias` no menu → abas internas
- `/diario` e `/pendencias` redirecionam para `/execucao?tab=diario` e `/execucao?tab=pendencias`
- Cronograma antigo (JSONB `percentualCronograma`) eliminado do Diário — migrar para `cronograma_tarefas.percentual_concluido`

### Componentes Mobile-First
- Usar `<Drawer>` shadcn/vaul: **bottom sheet no mobile**, painel lateral no desktop
- `TaskDetailDrawer` atual (`w-[480px] fixed`) **não é mobile-friendly** — a Central usa o padrão novo

### ⚡ D4 — Inteligência para Recebimento de Materiais
> **LEMBRETE CRÍTICO:** Ao implementar a aba Estoque/Recebimento de Materiais, adicionar funcionalidades de IA:
> - 📸 **Leitura de NF por foto**: câmera do celular → OCR → preenche automaticamente fornecedor, itens, quantidades e valores
> - 📄 **Interpretação de romaneio**: upload de PDF/foto → extrai lista de materiais entregues
> - 🤖 **Sugestão de baixa**: ao detectar materiais recebidos, sugerir vinculação ao estoque e ao item do orçamento correspondente
> - 📊 **Conferência automática**: comparar NF recebida vs pedido de compra em aberto
> - **Tecnologia sugerida**: GPT-4o Vision ou Google Gemini via Edge Function do Supabase
> - **Tabelas necessárias**: `recebimentos_materiais`, `nf_ocr_results` (a criar no Sprint D4)
