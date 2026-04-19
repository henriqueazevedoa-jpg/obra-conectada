# 📋 TEMPLATE DE SESSÃO — ObraConectada

**Versão:** 2.0 | **Stack:** React 18 + TypeScript + Supabase + Tailwind CSS  
**Última atualização:** 2026-04-19 | **Prioridade:** ⚠️ Este é o ÚNICO documento que precisa ser carregado

---

## 🎯 MODOS DE TRABALHO

Escolha UM modo abaixo e delete os outros. Cada modo tem seu próprio checklist.

---

## 📊 MODO INSPEÇÃO
*Revisar código, entender fluxo, diagnosticar problemas*

```
MODO: INSPEÇÃO
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA                                                            │
├─────────────────────────────────────────────────────────────────┤
│ Descrição:                                                        │
│ [Descrever o que precisa ser inspecionado]                       │
│                                                                   │
│ Arquivo(s) relevante(s):                                          │
│ - src/contexts/XXXContext.tsx                                    │
│ - src/components/XXX/YYY.tsx                                     │
│                                                                   │
│ Checklist de Inspeção:                                            │
│ ☐ Dependências de useCallback/useEffect corretas?               │
│ ☐ Há infinite loops ou re-renders desnecessários?               │
│ ☐ State está bem estruturado?                                    │
│ ☐ Queries ao Supabase são otimizadas?                            │
│ ☐ Tipos TypeScript estão corretos?                               │
│                                                                   │
│ Resultado esperado:                                               │
│ [Descrever o que se espera descobrir/confirmar]                  │
└─────────────────────────────────────────────────────────────────┘
```

### Convenções de Inspeção:
- **Contextos:** `src/contexts/*Context.tsx` — sempre `useCallback` + `useEffect`
- **Dependências:** usar valores primitivos (`id`, `boolean`), NUNCA objetos inteiros
- **Padrão correto:** `const userId = user?.id;` antes do useCallback
- **Padrão errado:** `[user, company]` — recria a cada render, dispara fetches desnecessários
- **Performance:** grep por `[user]`, `[company]`, `[obras]` como dependências

---

## 🎨 MODO UI
*Criar ou modificar componentes, estilos, layouts*

```
MODO: UI
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA                                                            │
├─────────────────────────────────────────────────────────────────┤
│ Descrição:                                                        │
│ [Descrever a mudança visual/UX]                                  │
│                                                                   │
│ Componente(s):                                                    │
│ - src/components/XXX/YYY.tsx (novo/modificado)                   │
│                                                                   │
│ Design System:                                                    │
│ - Usar componentes de src/components/ui/ (shadcn/ui)            │
│ - Tailwind CSS para estilos                                      │
│ - Paleta: bg-background, text-foreground, border-border         │
│ - Ícones: lucide-react                                           │
│                                                                   │
│ Checklist UI:                                                     │
│ ☐ Responsivo (mobile, tablet, desktop)?                         │
│ ☐ Acessibilidade (aria-labels, semantic HTML)?                  │
│ ☐ Tema escuro/claro compatível?                                 │
│ ☐ Ícones importados de lucide-react?                             │
│ ☐ Componentes de ui/ reutilizados?                              │
│ ☐ Testado no navegador (dev server rodando)?                    │
│                                                                   │
│ Resultado esperado:                                               │
│ [Layout/comportamento esperado]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Convenções de Componentes:
```typescript
// src/components/[Feature]/[ComponentName].tsx
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ComponentProps {
  title: string;
  onSubmit: (data: any) => void;
}

export default function ComponentName({ title, onSubmit }: ComponentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAction = useCallback(async () => {
    setLoading(true);
    // ... lógica
    setLoading(false);
  }, []);

  return (
    <Card>
      <CardContent>
        <h2>{title}</h2>
        <Button onClick={handleAction} disabled={loading}>
          {loading ? 'Carregando...' : 'Ação'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## ⚙️ MODO FEATURE
*Implementar feature completa (componente + context + página)*

```
MODO: FEATURE
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA                                                            │
├─────────────────────────────────────────────────────────────────┤
│ Descrição:                                                        │
│ [Feature nome, escopo, user stories]                             │
│                                                                   │
│ Arquivos que serão criados/modificados:                           │
│ - src/contexts/XXXContext.tsx (novo/modificado)                  │
│ - src/components/XXX/YYYEditor.tsx (novo)                        │
│ - src/pages/XXXPage.tsx (novo/modificado)                        │
│ - src/hooks/useXXX.ts (se necessário)                            │
│ - src/types/*.ts (tipos novos)                                   │
│                                                                   │
│ Passos:                                                            │
│ 1. ☐ Definir tipos/interfaces em src/types/                     │
│ 2. ☐ Criar context em src/contexts/ (se state compartilhado)    │
│ 3. ☐ Criar componente principal em src/components/[Feature]/    │
│ 4. ☐ Criar página em src/pages/[Feature]Page.tsx                │
│ 5. ☐ Adicionar rota em src/App.tsx                              │
│ 6. ☐ Integrar com AuthProvider/CompanyProvider                  │
│ 7. ☐ Testar no navegador                                        │
│                                                                   │
│ Banco de Dados:                                                   │
│ - Tabelas necessárias: [listar]                                  │
│ - RLS policies: [descrever]                                      │
│                                                                   │
│ Resultado esperado:                                               │
│ [Feature completa e funcional descrita]                          │
└─────────────────────────────────────────────────────────────────┘
```

### Padrão de Context para Feature:
```typescript
// src/contexts/XXXContext.tsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';

export interface XXXItem {
  id: string;
  obraId: string;
  companyId: string;
  // ... outros campos
}

interface XXXContextType {
  items: XXXItem[];
  loading: boolean;
  saveItem: (item: XXXItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const XXXContext = createContext<XXXContextType | null>(null);

export function XXXProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [items, setItems] = useState<XXXItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ PADRÃO CORRETO: extrair IDs primitivos
  const userId = user?.id;
  const companyId = company?.id;

  const fetchAll = useCallback(async () => {
    if (!userId || !companyId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('xxx_items')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar items:', error);
      setItems([]);
    } else {
      setItems((data || []) as XXXItem[]);
    }
    setLoading(false);
  }, [userId, companyId]); // ✅ Usar IDs primitivos

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveItem = useCallback(async (item: XXXItem) => {
    const { error } = await supabase.from('xxx_items').upsert(item as any);
    if (error) console.error('Erro ao salvar:', error);
    else await fetchAll();
  }, [fetchAll]);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('xxx_items').delete().eq('id', id);
    if (error) console.error('Erro ao deletar:', error);
    else await fetchAll();
  }, [fetchAll]);

  return (
    <XXXContext.Provider value={{ items, loading, saveItem, deleteItem, refresh: fetchAll }}>
      {children}
    </XXXContext.Provider>
  );
}

export function useXXX() {
  const ctx = useContext(XXXContext);
  if (!ctx) throw new Error('useXXX must be used within XXXProvider');
  return ctx;
}
```

---

## 🔄 MODO MIGRAÇÃO
*Atualizar dados, alterar estrutura, refatorar padrão em múltiplos arquivos*

```
MODO: MIGRAÇÃO
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA                                                            │
├─────────────────────────────────────────────────────────────────┤
│ Descrição:                                                        │
│ [O que está sendo migrado, de onde para onde]                    │
│                                                                   │
│ Escopo:                                                            │
│ - Arquivos afetados: [listar todos]                              │
│ - Impacto: [quantos componentes/páginas]                         │
│ - Backwards compatible? [sim/não]                                │
│                                                                   │
│ Passos:                                                            │
│ 1. ☐ Backup/Branch (git checkout -b migration/XXX)              │
│ 2. ☐ Atualizar tipos em src/types/                              │
│ 3. ☐ Atualizar contextos em src/contexts/                       │
│ 4. ☐ Atualizar componentes que usam                              │
│ 5. ☐ Atualizar páginas que usam                                  │
│ 6. ☐ Testar todas as páginas afetadas                           │
│ 7. ☐ Commit com mensagem clara                                   │
│ 8. ☐ Criar PR com descrição detalhada                           │
│                                                                   │
│ Rollback plan:                                                    │
│ [Como reverter se der problema]                                  │
│                                                                   │
│ Resultado esperado:                                               │
│ [Comportamento funcional mantido, código melhorado]              │
└─────────────────────────────────────────────────────────────────┘
```

### Checklist de Migração:
- Git: `git checkout -b migration/descriptive-name`
- TypeScript: sem erros (`npm run type-check`)
- Componentes: todos os afetados testados
- Context: dependências corretas
- Database: migrations preparadas (se necessário)

---

## 🐛 MODO DEBUG
*Investigar bug, rastrear erro, diagnosticar performance*

```
MODO: DEBUG
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA                                                            │
├─────────────────────────────────────────────────────────────────┤
│ Descrição:                                                        │
│ [O que está errado, como reproduzir]                             │
│                                                                   │
│ Passos para reproduzir:                                           │
│ 1. [Ação 1]                                                      │
│ 2. [Ação 2]                                                      │
│ 3. [Resultado inesperado]                                        │
│                                                                   │
│ Evidências:                                                       │
│ - Console error: [copiar error/warning]                          │
│ - Behavior: [o que acontece vs. o que deveria]                  │
│ - Network: [requests falhando? qual URL?]                       │
│ - Frequência: [sempre, intermitente, sob certas condições]      │
│                                                                   │
│ Investigação:                                                     │
│ ☐ Abrir DevTools → Console (erros?)                             │
│ ☐ Network tab → verificar requests                              │
│ ☐ React DevTools → componente renderizando demais?             │
│ ☐ Profiler → performance bottleneck?                            │
│ ☐ Grep por console.log no código relevante                      │
│ ☐ Verificar dependências de useCallback/useEffect               │
│                                                                   │
│ Root cause:                                                       │
│ [Causa identificada]                                             │
│                                                                   │
│ Fix:                                                              │
│ - Arquivo(s) afetado(s): [listar]                                │
│ - Mudança: [descrever correção]                                  │
│                                                                   │
│ Teste:                                                            │
│ ☐ Reproduzir steps novamente                                    │
│ ☐ Verificar console (limpo?)                                    │
│ ☐ Performance melhorou?                                         │
│                                                                   │
│ Resultado esperado:                                               │
│ [Bug resolvido, comportamento correto]                           │
└─────────────────────────────────────────────────────────────────┘
```

### Ferramentas de Debug:
```bash
# DevTools
DevTools F12 → Console, Network, React DevTools Profiler

# Servidor
npm run dev  # Vite dev server (HMR ativado)

# Grep para logging
grep -n "console.log\|console.error" src/contexts/XXX.tsx

# Type check
npm run type-check

# Verificar dependências ruins
grep -r "\[user\]\|\[company\]\|\[obras\]" src/contexts/
```

---

# 🌍 CONTEXTO DE PRODUTO

## Sistema ObraConectada

**O que é:** SaaS de gestão de obras para construtoras brasileiras pequenas e médias (2–20 obras simultâneas).

**Filosofia de produto:**
- ❌ **Não é** uma planilha de luxo
- ✅ **É** um ERP leve de execução integrado
- ✅ **UX:** premium, inspirada em Linear/Notion/Vercel
- ✅ **Objetivo:** o usuário digita uma vez e o sistema propaga para todos os módulos

### Perfis de Usuário

| Perfil | Acesso | Conta | Descrição |
|--------|--------|-------|-----------|
| **Administrador** | Total | Sim | 1 por empresa. Acesso a todos os módulos e administrativo |
| **Responsável** | Parcial | Sim | Múltiplos por empresa. Acesso às obras atribuídas |
| **Funcionário** | Campo | **Não** | Acessa via Link de Operação (`/o/:token`) sem login |
| **Cliente** | Visualização | **Não** | Acessa via Link de Visualização (`/v/:token`) sem login |

### Planos (Limites de Obras ATIVAS + PAUSADAS)

| Plano | Obras | Responsáveis | Assistente IA | Preço |
|-------|-------|--------------|---------------|-------|
| **Start** | 2 | 1 adicional | Não | R$ 199/mês |
| **Pro** | 5 | 3 adicionais | Sim (100 msg/mês) | R$ 499/mês |
| **Enterprise** | Ilimitadas | Ilimitados | Sim (ilimitado) | Custom |

**Regra crítica:** 
- ✅ Obras ATIVAS e PAUSADAS **contam** no limite
- ✅ Obras FINALIZADAS **não contam** — armazenadas para sempre
- ⚠️ Reativar obra finalizada requer slot disponível

### Nomenclatura Obrigatória
**Sempre usar estes termos:**
- **Obra** — projeto de construção
- **Etapa** (= `orcamento_categorias`) — fases da obra (Estrutura, Acabamento, etc.)
- **Composição** — serviços/produtos que compõem uma etapa
- **Insumo** — materiais/mão de obra unitária de uma composição
- **Cotação** — requisição de preços a fornecedores
- **Pagamento** — lançamento financeiro
- **Custo Real** — despesa efetivamente realizada
- **Diário de Campo** — registros diários da obra
- **Link de Operação** (`/o/:token`) — formulário mobile para funcionários
- **Link de Visualização** (`/v/:token`) — painel read-only para clientes

---

# 🗄️ BANCO DE DADOS — TABELAS REAIS

## Tabelas Principais

| Tabela | Propósito | Multi-tenant |
|--------|-----------|--------------|
| `companies` | Empresas clientes | Sim (`id`) |
| `profiles` | Usuários (role: admin/gestor/tecnico) | Sim (via JOIN) |
| `obras` | Projetos de construção | Sim (`company_id`) |
| `orcamento_categorias` | **ETAPAS** do orçamento (confusão de nomes!) | Sim (`company_id`) |
| `orcamento_composicoes` | Composições de cada etapa | Sim (`company_id`) |
| `orcamento_subitens` | Insumos das composições | Sim (`company_id`) |
| `sinapi_composicoes` | ~10.360 composições SINAPI pré-carregadas | Não (leitura pública) |
| `sinapi_insumos` | Insumos SINAPI por UF e código | Não (leitura pública) |
| `cotacao_lotes` | Lotes de cotação (agrupamento de itens) | Sim (`company_id`) |
| `cotacao_respostas` | Respostas de fornecedores aos lotes | Sim (via JOIN) |
| `fornecedores` | Cadastro de fornecedores | Sim (`company_id`) |
| `catalogo_composicoes` | Composições favoritas/históricas | Sim (`company_id`) |
| `cronograma_tarefas` | Tarefas do Gantt (tipos: PADRAO/MARCO/RESUMO) | Sim (`obra_id` → `company_id`) |
| `cronograma_dependencias` | Dependências entre tarefas (FS/SS/FF/SF + lag) | Sim (via JOIN) |
| `precos_fornecedores` | Histórico de preços por insumo/fornecedor | Sim (`company_id`) |
| `custo_real_itens` | Custos efetivamente realizados | Sim (`company_id`) |
| `pagamentos` | Lançamentos de pagamentos | Sim (`company_id`) |
| `materiais` | Itens de estoque por obra | Sim (`obra_id` → `company_id`) |
| `movimentacoes` | Entrada/saída de estoque | Sim (via JOIN) |
| `obra_links` | Links públicos (visualização + operação) | Sim (`obra_id` → `company_id`) |

## Schema JSONB Crítico: orcamentos.etapas

```typescript
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
  fonteReferencia?: string  ← "SINAPI"
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

## Políticas RLS Críticas

- **`orcamento_categorias`, `orcamento_composicoes`, `orcamento_subitens`** → isolado por `company_id`
- **`cotacao_lotes`, `cotacao_respostas`, `fornecedores`** → isolado por `company_id`
- **`sinapi_*`** → leitura pública (sem RLS restritivo)
- **`obra_links`** → SELECT público por token válido (sem auth)

---

# 🔧 DECISÕES ARQUITETURAIS — NÃO REVERTER SEM DISCUSSÃO

### Performance
- ✅ **useCallback/useEffect:** sempre usar IDs primitivos (`user?.id`, `company?.id`) como dependência
  - ❌ NUNCA `[user, company]` (objetos inteiros)
  - ❌ NUNCA `[obras]` (array de objetos)
  - ✅ SIM `[userId, companyId]` (strings primitivas)
- ✅ **React Query:** `staleTime: 60s`, `gcTime: 5min`, `refetchOnWindowFocus: false`
- ✅ **9 hooks migrados para useQuery** — não reverter para useEffect

### Banco
- ✅ **SINAPI:** busca por bag-of-words normalizado (sem pgvector — fase futura)
- ✅ **Migrations:** apenas `ADD COLUMN IF NOT EXISTS` e `CREATE TABLE IF NOT EXISTS`
  - ❌ NUNCA `ALTER COLUMN` ou `DROP` — quebra em produção
- ✅ **RLS por `company_id`** — multi-tenancy obrigatório

### Produto
- ✅ **Gateway de pagamento:** Iugu ou Asaas (taxa ~1.9-2.9%)
  - ❌ NUNCA Nexano (taxa 7.9% — caro demais)
- ✅ **Preço de fundador:** 24 meses garantido (não vitalício)
- ✅ **Modo demo:** clonar obras template com flag `is_demo = true`

### Bugs Conhecidos Corrigidos
- ✅ **Re-renders excessivos:** corrigido em ObrasContext + OrcamentoContext + EstoqueContext + CustoRealContext (era `[user, company]`)
- ✅ **"Recarregamento" ao navegar:** eram contextos sem `useCallback` estável

---

# 🛠️ REFERÊNCIA RÁPIDA

## Estrutura de Pastas (REAL)
```
src/
├── components/              # Componentes React (por feature)
│   ├── ui/                 # shadcn/ui components (não editar)
│   ├── execucao/           # DiarioTab, PendenciasPanel, EquipeTab, etc.
│   ├── gantt/              # CronogramaEditor, GanttCanvasPanel, TaskDetailDrawer
│   ├── orcamento/          # OrcamentoEditor, CatalogDrawer, ComposicaoRow
│   ├── painel/             # SmartCards, ResumoExecutivo, SCurveChart, etc.
│   ├── obra/               # LinksDeAcessoCard, ObraForm
│   ├── custo-real/         # CustoRealEditor
│   ├── diario/             # DiarioFotoUpload, DiarioReportPicker
│   ├── AppLayout.tsx       # Layout principal com sidebar
│   ├── ErrorBoundary.tsx   # Tratamento de erros React
│   └── CommandPalette.tsx  # Command palette global (Cmd+K)
├── contexts/               # Context Providers (state global)
│   ├── AuthContext.tsx
│   ├── CompanyContext.tsx
│   ├── ObrasContext.tsx
│   ├── OrcamentoContext.tsx
│   ├── EstoqueContext.tsx
│   ├── CustoRealContext.tsx
│   ├── SuprimentosContext.tsx
│   ├── ObraSelectionContext.tsx
│   └── CommandPaletteContext.tsx
├── pages/                  # Páginas (uma por rota)
│   ├── admin/              # AdminCompaniesPage, AdminPlansPage, AdminAddonsPage
│   ├── public/             # VisualizacaoPublicaPage, OperacaoMobilePage
│   ├── LoginPage.tsx
│   ├── ObrasPage.tsx
│   ├── OrcamentoPage.tsx
│   ├── CronogramaPage.tsx
│   ├── CustoRealPage.tsx
│   ├── PainelObraPage.tsx
│   ├── ExecucaoCentral.tsx
│   ├── FinanceiroCentral.tsx
│   ├── RelatoriosPage.tsx
│   ├── DocumentosPage.tsx
│   ├── ContatosPage.tsx
│   ├── EquipePage.tsx
│   ├── EstoquePage.tsx
│   ├── PerfilPage.tsx
│   └── NotFound.tsx
├── hooks/                  # Custom hooks
│   ├── useCronograma.ts    # CRUD tarefas, dependências, baseline
│   ├── useRecursos.ts      # CRUD recursos e alocações
│   ├── useGanttFinanceiro.ts # Total orçado por etapa
│   ├── useCotacaoCategorias.ts # Carrega cotacao_categorias
│   ├── usePersistentPageState.ts # Estado persistido (sessionStorage)
│   └── use-toast.ts
├── types/                  # TypeScript types/interfaces
│   ├── orcamento.ts
│   ├── suprimentos.ts
│   ├── planFeatures.ts
│   └── *.ts
├── lib/                    # Utilitários
│   └── utils.ts (cn, helpers)
├── data/                   # Mock data, seeding
│   ├── mockData.ts
│   ├── catalogoInsumos.ts
│   └── seedOrcamentos.ts
├── integrations/           # APIs externas
│   └── supabase/
│       └── untyped.ts      # ⚠️ Usar ESTE (não o "client" tipado)
└── App.tsx                 # App root + Router config
```

## Imports Padrão
```typescript
// React
import { useState, useCallback, useEffect, useMemo } from 'react';

// Componentes UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Ícones
import { ChevronDown, AlertCircle, CheckCircle2, Plus, Trash2, Search } from 'lucide-react';

// Router
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';

// Contexts
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useObras } from '@/contexts/ObrasContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';

// Data
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Supabase
import { supabase } from '@/integrations/supabase/untyped';

// Utils
import { cn } from '@/lib/utils';

// Gráficos (Recharts)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LineChart, Line } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';

// DnD
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';

// Export/PDF
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Toast
import { useToast } from '@/hooks/use-toast';
```

## Padrões Críticos

### ❌ ERRADO — Objeto inteiro como dependência
```typescript
const fetchData = useCallback(async () => {
  // usa user.id ou company.id
}, [user, company]); // ← Recria toda vez, dispara fetches!

useEffect(() => {
  fetchData();
}, [fetchData]); // ← Dispara toda vez
```

### ✅ CORRETO — ID primitivo como dependência
```typescript
const userId = user?.id;
const companyId = company?.id;

const fetchData = useCallback(async () => {
  if (!userId || !companyId) return;
  // ... usa userId e companyId
}, [userId, companyId]); // ← Estável, recria só quando IDs mudam

useEffect(() => {
  fetchData();
}, [fetchData]); // ← Dispara muito menos
```

## Queries Supabase (Padrão)
```typescript
// Ler
const { data, error } = await supabase
  .from('tabela')
  .select('*')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false });

// Inserir
const { data, error } = await supabase
  .from('tabela')
  .insert(objeto)
  .select()
  .single();

// Atualizar
const { error } = await supabase
  .from('tabela')
  .update(objeto)
  .eq('id', id);

// Deletar
const { error } = await supabase
  .from('tabela')
  .delete()
  .eq('id', id);

// Upsert (insert or update)
const { error } = await supabase
  .from('tabela')
  .upsert(objeto);

// Cast ao tipo correto
const items = (data || []) as unknown as MinhaInterface[];
```

---

# 📝 COMO USAR ESTE TEMPLATE

1. **Copiar tudo** deste arquivo
2. **No início da sessão:**
   - Criar arquivo `SESSION.md` na raiz do projeto
   - Colar o template completo
   - Escolher UM modo (deletar os outros 4)
   - Preencher seção `TAREFA`
3. **Durante a sessão:**
   - Marcar checkboxes conforme progride
   - Atualizar "Resultado esperado" com descobertas
4. **Ao final:**
   - Verificar se todos os checkboxes estão ☑️
   - Copiar "Resultado esperado" para commit message
5. **Manter atualizado:**
   - Sempre que projeto muda significativamente
   - Editar este template

---

**Última atualização:** 2026-04-19  
**Versão:** 2.0 (Completa com banco, decisões arquiteturais, estrutura real)  
**Linhas:** ~1000+ | **Páginas:** ~8 (impresso)
