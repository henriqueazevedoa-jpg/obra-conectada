# FEATURE-READINESS-MATRIX

| Módulo | Estado | Risco Técnico | Risco UX | Risco Segurança | Melhorias necessárias | Prioridade |
|--------|--------|--------------|----------|-----------------|----------------------|-----------|
| Obras | Maduro | baixo | baixo | baixo | Múltiplas obras simultâneas no state. | média |
| Orçamento | Funcional | médio | médio | baixo | Refinar drags longos. | média |
| Financeiro | Frágil | médio | alto | baixo | Agrupamento do status parcial no UI de recebíveis; desacoplar Supabase da UI. | alta |
| Cronograma | Funcional | médio | baixo | baixo | Perfis de Gantt muito pesados no render. | média |
| Contratos | Frágil | alto | médio | médio | Resolver erro 400 em queries de medições atreladas. | crítica |
| Diário de Obra | Funcional | baixo | baixo | baixo | Tratamento offline (PWA). | baixa |
| Intelligence | Incompleto| alto | médio | bloqueador | RLS ausente em `processamento_custos` e quantitativos. Risco de vazamento. | crítica |
| Links Públicos | Maduro | baixo | baixo | médio | Controle estrito de expiração de token. | baixa |
| Dashboard | Funcional | médio | baixo | baixo | Agrupar fetch em batch requests para evitar cascata. | média |
