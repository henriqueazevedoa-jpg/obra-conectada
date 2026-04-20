================================================================
OBRACONECTADA — STATUS DOS PROMPTS (atualizar ao fim de cada sprint)
================================================================

COMO USAR: Ao iniciar nova sessão, leia este arquivo para saber
onde o projeto está. Ao concluir um sprint, atualize este arquivo.

----------------------------------------------------------------
STATUS ATUAL — Atualizado em: 20/04/2026 (Sessão de Sprint 4)
----------------------------------------------------------------

✅ CONCLUÍDOS:
- Planilha Sprint 1     — Fundação visual
- Planilha Sprint 1.5   — BDI e preço de venda
- Planilha Sprint 2     — Biblioteca e catálogo
- Planilha Sprint 3     — Inteligência com IA
- Planilha Sprint 4     — Múltiplos orçamentos (orcamento_versoes)
- PROMPT 1  — Cotação: bug do stepper
- PROMPT 2  — Cotação: regras de filtragem
- PROMPT 3  — Cronograma Blocos 1-3 (CPM, SPI, baseline)
- PROMPT 4  — Cronograma Blocos 4-6 (drag, marcos, views, Gantt)
- PROMPT 5  — Financeiro Sprint 0 (migration FK, badge Indireto)
- PROMPT 6  — Financeiro Sprint 1: Pagamentos (parcelamento, vínculos, calendário)
- PROMPT 7  — Financeiro Sprint 2: Custo Real
- PROMPT 8  — Financeiro Sprint 3: Fluxo de Caixa e DRE
- PROMPT 9  — Execução Sprint 1: Diário (cleanup UI)
- PROMPT 10 — Execução Sprint 3: Equipe
    Migration: equipe_colaboradores + equipe_documentos + bucket storage
    Bloco 1: CRUD completo de membros com foto, função e status
    Bloco 2: Upload categorizado de documentos com badges de validade
    Bloco 4: Sub-view Presença com cálculo de dias, filtro de período, CSV export
    DiarioTab: toggle colapsável para seleção opcional de membros presentes
- PROMPT 11 — Execução Sprint 4: Agenda (NOVA ARQUITETURA)
    tabela pendencias DROPADA
    obra_agenda enriquecida: +responsavel_id, +data_limite, +origem
    AgendaPage.tsx (nova página autônoma /agenda) com 3 views: Lista, Kanban, Calendário
    Tipo 'pendencia' absorve funcionalidade da aba Pendências
    Marcos do Cronograma + Vencimentos Financeiros como itens read-only
    ExecucaoCentral: abas Agenda e Pendências removidas
    PendenciasBlock + PainelObraPage migrados para obra_agenda
    Nav sidebar: Agenda adicionada à seção Canteiro

❌ PULADO (decisão 20/04/2026):
- PROMPT 9 — Execução Sprint 2: Pendências → incorporada à Agenda (Sprint 4)

⏳ PRÓXIMO:
- PROMPT 12 — EXECUÇÃO SPRINT 5: Pedidos de Material & Recebimentos (ESCOPO ALTERADO)

  ESCOPO ORIGINAL (Entradas NF): SUBSTITUÍDO
  NOVO ESCOPO:
    1. Nova tabela: material_pedidos (pedidos de material feitos pelo gestor/engenheiro)
    2. Nova tabela: material_recebimentos (recibos/NFs chegando do campo via link público)
    3. ExecucaoCentral: aba "Entradas NF" → substituída por 2 abas:
       - "Pedidos" — CRUD de pedidos com data_entrega_prevista → evento na Agenda
       - "Recebimentos" — exibe itens vindos do campo + enriquecimento manual/IA
    4. Cruzamento pedido ↔ recebimento (manual pelo engenheiro)
    5. IA de cruzamento automático planejada como Addon opcional (não implementar agora)
    6. Fonte pública (OperacaoMobilePage) passa a gravar em material_recebimentos

⬜ FILA (ordem do PLANO_GERAL.txt):
- PROMPT 13 — Execução Sprint 6: Estoque Global
- PROMPT 14 — Contatos: Melhorias
- PROMPT 15 — Links Públicos Sprint 1
- PROMPT 16 — Links Públicos Sprint 2
- PROMPT 17 — Links Públicos Sprint 3
- PROMPT 18 — Usuários: Atribuição de obras
- PROMPT 19 — Perfil: Foto + dados profissionais + ART
- PROMPT 20 — Painel da Obra Sprint 1
- PROMPT 21 — Painel da Obra Sprint 2
- PROMPT 22 — Painel da Obra Sprint 3
- PROMPT 23 — Painel da Obra Sprint 4 (IA preditiva)
- PROMPT 24 — Dashboard Central Sprint 1
- PROMPT 25 — Dashboard Central Sprint 2
- PROMPT 26 — Dashboard Central Sprint 3
- PROMPT 27 — Admin Sprint 1
- PROMPT 28 — Admin Sprint 2
- PROMPT 29 — Admin Sprint 3
- PROMPT 30 — Admin Sprint 4 (FUTURO — não implementar agora)

----------------------------------------------------------------
REGRAS DE OPERAÇÃO
----------------------------------------------------------------

1. Inspecionar arquivos relevantes antes de qualquer código
2. Não avançar sem confirmar a entrega anterior
3. Reportar o que foi encontrado antes de implementar
4. Zero erros TypeScript antes de marcar como concluído
5. Atualizar este arquivo ao fim de cada sprint
