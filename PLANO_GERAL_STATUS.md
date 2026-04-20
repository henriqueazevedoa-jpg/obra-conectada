================================================================
OBRACONECTADA — STATUS DOS PROMPTS (atualizar ao fim de cada sprint)
================================================================

COMO USAR: Ao iniciar nova sessão, leia este arquivo para saber
onde o projeto está. Ao concluir um sprint, atualize este arquivo.

----------------------------------------------------------------
STATUS ATUAL — Atualizado em: 20/04/2026 (Sessão de Sprint 5)
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
- PROMPT 11 — Execução Sprint 4: Agenda (NOVA ARQUITETURA)
- PROMPT 12 — Execução Sprint 5: Pedidos de Material & Recebimentos ✅ 20/04/2026
    Migration: material_pedidos + material_recebimentos + pagamentos.pedido_id
    ExecucaoCentral: PageShell + abas Pedidos e Recebimentos (Diário/Pedidos/Recebimentos/Estoque/Equipe)
    PedidosTab: CRUD + parcelamento mensal/custom + evento Agenda + vínculo recebimento + toggle estoque
    RecebimentosTab: lista + form manual + drawer revisão + IAInputButton movido do Estoque
    AgendaPage: pedidos com data_entrega_prevista como eventos read-only
    OperacaoMobilePage: NF → material_recebimentos (link_publico)
    Edge Function submit-diario-operacao v2: processa material_recebimento no payload

❌ PULADO (decisão 20/04/2026):
- PROMPT 9 — Execução Sprint 2: Pendências → incorporada à Agenda (Sprint 4)

⏳ PRÓXIMO:
- PROMPT 14 — CONTATOS: Melhorias

⬜ FILA (ordem do PLANO_GERAL.txt):
- PROMPT 15 — Links Públicos Sprint 1
- PROMPT 16 — Links Públicos Sprint 2
- PROMPT 17 — Links Públicos Sprint 3
- PROMPT 18 — Usuários: Atribuição de obras
- PROMPT 19 — Perfil: Foto + dados profissionais + ART

🔒 ADIADO (fase posterior):
- PROMPT 13 — Execução Sprint 6: Estoque Global
    Motivo: escopo largo (3 blocos: visão consolidada + transferência + pedido centralizado)
    Pré-requisito: múltiplas obras com dados reais para validação
    Retomar após: Painel da Obra Sprint 1 (Prompt 20)
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
