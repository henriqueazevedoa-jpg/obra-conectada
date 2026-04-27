# MODULE-RISK-REPORT

| Módulo | Risco | Evidência | Impacto | Criticidade | Correção sugerida |
|--------|-------|-----------|---------|-------------|-------------------|
| Intelligence | RLS ausente | Tabela `processamento_custos` e `projeto_quantitativos` com `rowsecurity = false`. | Vazamento de quantitativos entre empresas. | Bloqueador | Habilitar RLS imediatamente e criar policy baseada em `company_id`. |
| Contratos | 400 em API | Query `contratos_medicoes` em relatórios. | Tela de relatórios e painel quebrada para contratos. | Alto | Resolver Foreign Key da tabela `contratos_medicoes`. |
| Financeiro | Falha de UI | `RecebiveisTab.tsx` Linha 234 (`isPendente`). | Usuário não consegue confirmar o saldo faltante de recebimentos parciais. | Alto | Remover 'parcial' de `!['recebido', 'parcial']` na hora de exibir o botão, ou tratar estado misto. |
| Worker Python| Falta de Retries| `worker/requirements.txt` sem `tenacity` e blocos de código usando `pass`. | Erros de timeout do Supabase/LLM ignorados silenciosamente. | Médio | Implementar decoradores de retry em chamadas de rede. |
| Geral | Acoplamento DB | Uso de `supabase.from()` espalhado nos `.tsx`. | Dificuldade em testes e na propagação de defaults (como `company_id`). | Médio | Centralizar requests em uma camada `services/` ou hooks dedicados. |
