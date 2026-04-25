# HEURISTICS.md — Critérios de Avaliação de UI
**Lastra — Guia para avaliação heurística de interfaces**
**Versão:** 1.0 | **Criado:** 2026-04-24

Usar em conjunto com os scripts de inventário e captura de estados.
Claude aplica estes critérios ao analisar screenshots e inventários.

---

## Camada 0 — Análise Estática (automática via script)

| Critério | Threshold | Severidade |
|---|---|---|
| Touch target | < 44px = violação / < 48px = warning | Alto / Médio |
| Sobreposição de elementos | > 4px de overlap | Crítico |
| Elemento fora da viewport | qualquer | Alto |
| Z-index > 9000 | qualquer | Médio |
| Texto truncado | scrollWidth > clientWidth | Médio |
| Opacidade < 0.3 em elemento interativo | qualquer | Médio |

---

## Camada 3 — Avaliação Heurística Visual

### H1 — Visibilidade do estado do sistema
O usuário sempre deve saber o que está acontecendo.

**Verificar:**
- Indicador de salvamento visível quando auto-save ativo?
- Estado de loading durante fetch?
- Feedback após ação (toast, badge, mudança visual)?
- Botões desabilitados comunicam por quê?

**Padrões SaaS B2B:**
- Indicador de salvamento no canto superior direito
- Skeleton loading em vez de spinner para listas
- Toast de sucesso/erro sempre presente após ação crítica

---

### H3 — Controle e liberdade do usuário
O usuário deve poder desfazer e sair de estados indesejados.

**Verificar:**
- Ações destrutivas têm confirmação (AlertDialog)?
- Drawer/modal tem botão X claro?
- Formulários têm botão Cancelar além do Salvar?
- Undo disponível para edições inline?

**Violações comuns:**
- Excluir item sem confirmação
- Drawer sem botão de fechar explícito
- Edição inline sem forma de cancelar

---

### H4 — Consistência e padrões
Elementos similares devem se comportar de forma idêntica.

**Verificar:**
- Todos os menus de overflow têm as mesmas opções na mesma ordem?
- Ações primárias sempre no mesmo lado (direita)?
- Cores semânticas consistentes (vermelho=perigo, verde=sucesso)?
- Ícones para mesma ação são os mesmos em toda a aplicação?

**Para o Lastra especificamente:**
- PT-022: NUNCA usar verde para ausência de dados
- Ação primária sempre botão robusto roxo (#534AB7)
- Menu ⋯ sempre abre dropdown, nunca muda de função por contexto

---

### H6 — Reconhecimento em vez de memorização
O usuário não deve precisar lembrar informação entre telas.

**Verificar:**
- Ações disponíveis visíveis (não escondidas atrás de hover)?
- Labels em botões de ícone (tooltip ou texto)?
- Contexto da obra atual sempre visível?
- Breadcrumb ou título de página claro?

**Violações comuns no Lastra:**
- Botões de ação aparecem apenas no hover → usuário não sabe que existem
- Ícones sem tooltip → usuário precisa adivinhar a função
- Menu ⋯ com opções críticas → aumenta carga cognitiva

---

### H7 — Flexibilidade e eficiência de uso
Atalhos para usuários experientes sem prejudicar novatos.

**Verificar:**
- Ações frequentes acessíveis em 1 clique?
- Ações críticas não enterradas em menus de overflow?
- Navegação por teclado funcional (Tab, Enter, Esc)?
- Bulk actions disponíveis para operações repetitivas?

**Regra de ouro para o Lastra:**
- Ação mais frequente por tipo de linha: máximo 1 clique
- Ação destrutiva (excluir): pode estar no menu ⋯, mas visível
- Ação de expansão: deve ser ícone dedicado visível, não enterrado

---

### H8 — Design estético e minimalista
Remover o que não agrega valor; não esconder o que agrega.

**Verificar:**
- Densidade de informação adequada para a tarefa?
- Elementos decorativos sem função removidos?
- Hierarquia visual clara (primário > secundário > terciário)?
- Whitespace suficiente para respirar?

**Para planilhas (contexto Lastra):**
- Linhas com altura ~36px para modo denso
- Colunas alinhadas consistentemente
- Totais visualmente distintos de itens
- Botões de ação aparecem no hover mas não poluem o estado padrão

---

## Critérios específicos do domínio

### SaaS B2B de construção civil
O usuário típico é engenheiro ou gestor de obras — não desenvolvedor.

**Implicações:**
- Terminologia do setor (não "item", mas "composição", "insumo", "etapa")
- Números grandes formatados (R$ 1,2M não R$ 1.234.567,00)
- Datas relativas onde possível ("em 3 dias" junto de "15/05/2026")
- Ações de obra em campo funcionam em mobile/touch
- Planilha se parece com Excel — familiar ao usuário

### Ações críticas por frequência de uso

| Ação | Frequência | Cliques máximos |
|---|---|---|
| Editar preço de composição | Muito alta | 1 (clique direto) |
| Expandir composição em insumos | Alta | 1 (botão visível) |
| Adicionar composição à etapa | Alta | 1 (botão visível na etapa) |
| Excluir composição | Baixa | 2 (menu ⋯ + confirmar) |
| Favoritar composição | Média | 2 (menu ⋯ é aceitável) |
| Adicionar à lista de cotação | Média | 1-2 (ícone na linha) |

---

## Como usar esta heurística

### Para análise de inventário (pós Camada 0):
1. Ler tipos de elementos encontrados
2. Para cada tipo, verificar critérios H3, H6, H7 primeiro
3. Elementos com risco em H6 ou H7 entram no escopo de captura
4. Elementos com violação H4 (inconsistência) sempre entram

### Para análise de screenshots (pós Camada 2):
1. Verificar H1 em estados interativos (feedback visível?)
2. Verificar H7: ações frequentes em quantos cliques?
3. Verificar H4: consistência com outros módulos
4. Verificar H8: sobreposição, truncamento, hierarquia

### Severidades
- **Crítico:** bloqueia uso da funcionalidade
- **Alto:** causa frustração recorrente
- **Médio:** degrada experiência mas tem workaround
- **Baixo:** melhoria desejável mas não urgente

---

## Referências
- Nielsen, J. (1994). Heuristic evaluation. In J. Nielsen & R. Mack (Eds.), Usability Inspection Methods
- WCAG 2.1 Success Criterion 2.5.5 (Target Size)
- Material Design Touch Target Guidelines
- Nielsen Norman Group: "Visibility of System Status"
