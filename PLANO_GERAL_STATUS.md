================================================================
OBRACONECTADA — STATUS DOS PROMPTS (atualizar ao fim de cada sprint)
================================================================

COMO USAR: Ao iniciar nova sessão, leia este arquivo para saber
onde o projeto está. Ao concluir um sprint, atualize este arquivo.

----------------------------------------------------------------
STATUS ATUAL — Atualizado em: 18/04/2026 (Sessão 4)
----------------------------------------------------------------

✅ CONCLUÍDOS (desta spec):
- Planilha Sprint 1  — Fundação visual
- Planilha Sprint 1.5 — BDI e preço de venda
- Planilha Sprint 2  — Biblioteca e catálogo
- Planilha Sprint 3  — Inteligência com IA
- Planilha Sprint 4  — Múltiplos orçamentos (orcamento_versoes, VersaoSeletor, delta)
- PROMPT 1 — Cotação: bug do stepper (totalCols off-by-one em CotacaoCentral.tsx, linha 1008)
- PROMPT 2 — Cotação: regras de filtragem (3 toggles opt-in: SINAPI, Com preço, Sem detalhe)
- PROMPT 3 — Cronograma Blocos 1-3: backward pass CPM, linhas SS, baseline #1E3A5F, SPI BCWP/amber, KPIs reordenados semânticos, Fit/Ativo buttons
- PROMPT 4 — Cronograma Blocos 4-6 (COMPLETO):
    Bloco 4.1: Handle ⠿ drag vertical na lista — reordena raízes, persiste ordem no banco via batch updateTarefa
    Bloco 4.2: Arrastar horizontal (existente) + resize handle
    Bloco 4.3: Botões [+ Tarefa][◆ Marco][≡ Grupo] no header (forwardRef/useImperativeHandle, triggerAddTask navega para lista e foca input)
    Bloco 5: Views Gantt/Lista/Curva S/Recursos com toggle no header
    Bloco 6: Barras de composição RESUMO no Gantt (bracket visual, subetapas azuis #3B82F6/#BFDBFE, 14px, recuo 16px, colapso ▼/▶)

- PROMPT 5 — Financeiro Sprint 0: migration fornecedor_id FK + categoria_indireta, badge ⬡ Custo Indireto na lista, campo categoria no form quando sem etapa

- PROMPT 6 — Financeiro Sprint 1: Pagamentos
    Migration: etapa_id FK (orcamento_categorias), composicao_id FK (orcamento_composicoes),
    grupo_parcelas_id UUID (compartilhado entre N parcelas), valor_pago numeric.
    Parcelamento automático: cria N registros separados no banco com grupo_parcelas_id comum.
    Vínculos fortes: dropdown de etapa agora salva UUID (etapa_id) + nome (fallback).
    Composição encadeada: dropdown de composições carregado dinamicamente por etapa_id.
    Campo valor_pago + toggle "Já pago" no formulário.
    KPI Strip: barra de progresso visual no card Execução + tooltips descritivos.
    Timeline: cores semânticas (âmbar = próx. 7 dias), badge parcela K/N, cursor pointer + clique para editar.
    Calendário: mês com vencidos recebe badge vermelho no cabeçalho, âmbar para próx. 7 dias, clique para editar.


⏳ PRÓXIMO:
- PROMPT 9 — EXECUÇÃO SPRINT 2: Pendências

✅ CONCLUÍDO (nesta sessão):
- FINANCEIRO SPRINT 3 (PLANO_GERAL Prompt 7) — Fluxo de Caixa e DRE
    FluxoCaixaTab: linha de projeção tracejada (média dos últimos 3 meses)
    FluxoCaixaTab: alerta de saldo negativo projetado (banner âmbar + coluna marcada)
    FluxoCaixaTab: toggle "Incluir indiretos" com coluna extra na tabela
    FluxoCaixaTab: puxa custo_real_itens (sem etapa, excl. pagamento_vinculado) como indiretos
    DRETab: margem por etapa — tabela com orçado, realizado, desvio % e barra de progresso
    DRETab: linha BDI quando orcamento.bdi configurado
    DRETab: custos indiretos integram custo_real_itens sem etapa
    DRETab: nota no código sobre migração futura para módulo de Contratos
- EXECUÇÃO SPRINT 1 (PLANO_GERAL Prompt 8) — Diário
    Removida duplicação do campo "Fotos" em DiarioTab.tsx (label externo vs. rótulo interno do componente)

⬜ FILA (ordem do PLANO_GERAL.txt):
- PROMPT 2  — Cotação: Regras de filtragem
- PROMPT 3  — Cronograma: Especificação completa (6 blocos)
- PROMPT 4  — Financeiro Sprint 0: Correção estrutural
- PROMPT 5  — Financeiro Sprint 1: Pagamentos
- PROMPT 7  — Financeiro Sprint 2: Custo Real
- PROMPT 8  — Financeiro Sprint 3: Fluxo de Caixa e DRE
- PROMPT 9  — Execução Sprint 1: Diário
- PROMPT 9  — Execução Sprint 2: Pendências
- PROMPT 10 — Execução Sprint 3: Equipe
- PROMPT 11 — Execução Sprint 4: Agenda
- PROMPT 12 — Execução Sprint 5: Entradas NF
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
