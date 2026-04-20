Cheatsheet — Workflows ObraConectada
Regra geral

Preencha sempre o mínimo útil:

o que é
onde está
o que deve acontecer
qual o limite
/sprint

Use quando: quiser organizar a sessão, decidir prioridade ou escolher o próximo workflow.

Preencha:

Objetivo da sessão → o objetivo maior do bloco de trabalho
Item atual → o que está na sua frente agora
Restrições → limites importantes
Entregável esperado → o que quer receber do sprint

Exemplo curto:

/sprint

Objetivo da sessão:
Melhorar fluxo de importação da SINAPI

Item atual:
Decidir por onde começar sem quebrar o restante

Restrições:
Priorizar impacto em velocidade

Entregável esperado:
Workflow recomendado e próximo passo
/inspecao

Use quando: precisar entender antes de mexer.

Preencha:

Objeto da inspeção → o módulo, fluxo ou tela
Pergunta principal → a dúvida central
Escopo → até onde analisar
Restrições → o que não deve ser feito agora

Exemplo curto:

/inspecao

Objeto da inspeção:
Fluxo de importação da SINAPI

Pergunta principal:
Por que o preview está lento?

Escopo:
Mapear arquivos, fetches e re-renders

Restrições:
Não implementar correções ainda
/debug

Use quando: existir bug ativo ou comportamento errado.

Preencha:

Sintoma → o erro observável
Gatilho → a ação que dispara o problema
Comportamento esperado → como deveria funcionar
Restrição → como corrigir sem exagerar no escopo

Exemplo curto:

/debug

Sintoma:
Inserção da composição está lenta

Gatilho:
Ao clicar para adicionar no orçamento

Comportamento esperado:
Inserção rápida e atualização imediata

Restrição:
Corrigir com menor impacto possível
/ui

Use quando: a mudança for visual/UX, sem mexer em lógica.

Preencha:

Tipo → UI-POLISH, UI-RELAYOUT ou UI-SYSTEM
Objetivo → o que quer melhorar
Problema visual → o defeito atual
Restrição → o que não pode ser alterado

Exemplo curto:

/ui

Tipo:
UI-RELAYOUT

Objetivo:
Melhorar a leitura do preview

Problema visual:
Hierarquia confusa e baixa escaneabilidade

Restrição:
Não alterar lógica nem fetch
/feature

Use quando: for criar funcionalidade nova.

Preencha:

Feature → nome do que será criado
Objetivo funcional → o que o usuário poderá fazer
Escopo → o que entra nesta versão
Restrição → limite de complexidade ou implementação

Exemplo curto:

/feature

Feature:
Página de documentos da obra

Objetivo funcional:
Armazenar e consultar documentos da obra

Escopo:
Listagem, filtros e upload

Restrição:
Primeira versão simples, sem superdimensionar
/migracao

Use quando: a tarefa for estrutural, de padronização ou refactor.

Preencha:

Objetivo → o que quer reorganizar
Escopo → onde a mudança acontece
Estratégia → lote pequeno, médio ou amplo
Restrição → cuidado principal

Exemplo curto:

/migracao

Objetivo:
Centralizar fetch no componente pai

Escopo:
Páginas com abas do módulo financeiro

Estratégia:
Lote médio

Restrição:
Evitar breaking change
/memory

Use quando: quiser consolidar aprendizados importantes.

Preencha:

Objetivo → por que está consolidando
Contexto → de onde vieram os aprendizados
Tarefa → o que deve ser feito
Critério → o que merece ser promovido

Exemplo curto:

/memory

Objetivo:
Consolidar aprendizados recentes

Contexto:
Debug e refactor da importação SINAPI

Tarefa:
Revisar registros e promover padrões úteis

Critério:
Promover apenas o que for reutilizável
Atalho mental
Se a dúvida for:
“qual o próximo passo?” → /sprint
“preciso entender antes” → /inspecao
“tem bug acontecendo” → /debug
“quero melhorar visual” → /ui
“quero criar algo novo” → /feature
“quero reorganizar a base” → /migracao
“quero guardar o aprendizado” → /memory
Fluxo ideal

Na maioria dos casos:

/sprint -> /inspecao -> /debug | /ui | /feature | /migracao -> /memory