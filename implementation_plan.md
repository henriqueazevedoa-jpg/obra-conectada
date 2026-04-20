# Planejamento & Cronograma: Módulo de Gestão de Obras Avançado

O objetivo central deste plano é transformar o protótipo da página atual de Cronograma em uma **central unificada de Planejamento 4D (Tempo) e 5D (Custo)**, focada totalmente nas "dores" reais de um engenheiro de planejamento: gestão de dependências críticas (Caminho Crítico), alocação de equipes/equipamentos (Nivelamento de Recursos) e o comparativo claro entre o Planejado (Baseline) vs. Realizado (Avanço Físico).

## User Review Required

> [!IMPORTANT]
> **Modelo de Dados:** Atualmente, a vinculação de datas ocorre nas tabelas do Orçamento (`orcamento_categorias` e `orcamento_composicoes`). Para permitir tarefas que *não possuem custo* (ex: "Aprovação na Prefeitura" ou "Reunião de Alinhamento") e para podermos alocar recursos, propomos usar ativamente a tabela `cronograma_tarefas` ligada (opcionalmente) aos itens de orçamento. Você prefere **manter 100% atrelado ao Orçamento (onde toda tarefa deve ser um item de custo)** ou aprova o **uso de `cronograma_tarefas` como tabela mestre para o Gantt**, referenciando o código da composição quando aplicável?

---

## Proposed Changes

### Banco de Dados / Supabase

A fundação do banco já possui as tabelas básicas (`cronograma_tarefas`, `cronograma_dependencias`), mas precisamos expandi-la para os recursos e indicadores.

#### [NEW] Tabela: `recursos_obra`
Tabela para gerenciar operários, terceirizados e maquinário.
- `id` (uuid, pk)
- `obra_id` (uuid, fk)
- `tipo` (enum: EQUIPE, EQUIPAMENTO, MATERIAL_CHAVE)
- `nome` (text) - ex: "Equipe de Armação A" ou "Grua"
- `capacidade_diaria` (numérico)
- `custo_hora` (numérico, opcional)

#### [NEW] Tabela: `cronograma_alocacoes`
Liga tarefas a recursos, essencial para o recurso "Alocação de equipes e recursos".
- `id` (uuid, pk)
- `tarefa_id` (uuid, fk cronograma_tarefas)
- `recurso_id` (uuid, fk recursos_obra)
- `quantidade` (numeric) - Ex: 2 (pedreiros da equipe) ou 100% de uso.
- `horas_por_dia` (numeric)

#### [MODIFY] Tabela: `cronograma_tarefas`
Criar colunas adicionais para consolidar o avanço:
- `orcamento_composicao_id` (uuid, opcional) -> Cria a "Integração forte" com Orçamento. Se houver custo, vem daqui.
- `orcamento_categoria_id` (uuid, opcional)
- `tipo_tarefa` (text) -> PADRAO, MARCO (Milestone), RESUMO (Summary).

---

### UI/UX: Modificações e Interfaces

A página `/cronograma` será aprimorada visualmente para alta densidade e interatividade, inspirando-se em softwares corporativos de agendamento (ex: MS Project, Primavera), mas com estilo Web moderno (Shadcn UI).

#### Layout Geral da Nova Tela de Planejamento:
1. **Header Analytics (Avançado vs Realizado):**
   - Mini-cards no topo mostrando os indicadores: Atraso Médio (dias), SPI (Schedule Performance Index - Índice de Desempenho de Prazo).
2. **Split Screen Resized Drag (Painel Divisível):**
   - **Lado Esquerdo (WBS Tree):** Estrutura hierárquica (Etapas de Orçamento -> Tarefas) mostrando Código, Nome, Duração, Data Início/Fim e % de Progresso.
   - **Lado Direito (Interactive Gantt):** Canvas arrastável (Drag & Drop) das barras temporais, com renderização de setas para dependências. Barras divididas ao meio: cor clara para *Baseline*, cor forte para *Real*.

#### Componentes Dinâmicos (Sidebars):
- **Right Drawer de Tarefa:** Ao dar double-click em uma barra do Gantt, abre um painel rico, exibindo:
  - Detalhes (Datas, Duração, Restrições).
  - Aba **Predecessoras/Sucessoras**: Controle FS, SS, FF, SF + Lag (Dias).
  - Aba **Recursos Alocados**: Listagem dos equipamentos e mão-de-obra que realizarão a tarefa. Alertará caso o recurso esteja "superalocado" no mesmo período.
  - Aba **Orçamento Vinculado**: Exibirá o custo do serviço atrelado, garantindo governança (Custo Integrado).

#### Nova Aba ou View: Visão de "Curva S" ou Dashboard Físico-Financeiro
Uma funcionalidade extra e essencial. Um gráfico de linha/barra combinando o Avanço (Prazo) com o Custo do Orçamento, respondendo à pergunta vital: *"Deveríamos ter gastado X e executado Y%, mas gastamos Z e executamos W%?"*.

---

## Open Questions

> [!WARNING]
> **Componente Gráfico (Gantt):** Desenvolver um Gantt interativo "from scratch" na web é um desafio imenso envolvendo canvas ou muitas divs matemáticas. Sugiro utilizarmos uma biblioteca consolidada de UI Web para Gantt, como **DHTMLX Gantt** (open-source) ou o **Bryntum Gantt** ou o mais leve `@twproject/gantt` ajustado para React. Há alguma restrição quanto à instalação de novas dependências para o gráfico arrastável?

> [!IMPORTANT]
> **Controle de Baseline:** Quando o cronograma "congela" o planejamento base (Baseline)? Você prevê um botão explícito de "Salvar Baseline" que copia e trava as datas atuais como `data_inicio_prevista` e libera o usuário para então apenas marcar o `Avanço Real` dia a dia?

---

## Verification Plan

### Automated Tests
- Validar se a vinculação FK de `cronograma_tarefas` para `orcamento_composicoes` mantém os custos em sincronia.

### Manual Verification
1. Criar uma nova Obra. Importar o orçamento base (ou usar a demo).
2. Na aba de Planejamento, vincular 3 serviços do orçamento em 3 tarefas de cronograma.
3. Arrastar a Data 1 do Gantt, simulando atraso; verificar se a Data 2 (dependente) empurra automaticamente.
4. Alocar "Equipamento A" nas 3 tarefas e cruzar os dias para validar alertas visuais.
