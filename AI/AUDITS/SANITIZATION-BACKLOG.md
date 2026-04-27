# SANITIZATION-BACKLOG

## BLOQUEADORES
| # | Módulo | Problema | Evidência | Impacto | Correção sugerida | Risco regressão |
|---|--------|----------|-----------|---------|-------------------|-----------------|
| 1 | DB / Intelligence | Tabelas de quantitativos sem RLS | Database Audit | Alto (vazamento) | `ALTER TABLE` nas tabelas `processamento_custos` e `projeto_quantitativos` para `ENABLE ROW LEVEL SECURITY`. Criar policies p/ `company_id`. | Baixo |

## ALTO
| # | Módulo | Problema | Evidência | Impacto | Correção sugerida | Risco regressão |
|---|--------|----------|-----------|---------|-------------------|-----------------|
| 2 | Contratos | HTTP 400 nas queries | Grep do Frontend `contratos_medicoes` | Relatórios inativos | Consertar FK / resource query das medições vinculadas a contratos. | Baixo |
| 3 | Financeiro | Bug de UI no Parcial | RecebiveisTab.tsx (linha 234) | Recebimentos travados no meio | Retirar a trava visual do botão "Confirmar" para status `parcial`. | Baixo |

## MÉDIO
| # | Módulo | Problema | Evidência | Impacto | Correção sugerida | Risco regressão |
|---|--------|----------|-----------|---------|-------------------|-----------------|
| 4 | Worker | Resiliência e log | Worker `except pass` e ausência de retries. | Falha não mapeada na IA | Integrar loop de tentativa/erro (tenacity) para HTTP calls. | Médio |
| 5 | App Geral| Data fetching | `supabase.from` cru na UI | Difícil de mockar/testar | Refatorar para services / react-query / hooks abstraídos. | Alto |

## BAIXO
| # | Módulo | Problema | Evidência | Impacto | Correção sugerida | Risco regressão |
|---|--------|----------|-----------|---------|-------------------|-----------------|
| 6 | Frontend | Limite Service Worker | `npm run build` logs | Cache PWA grande | Realizar Code Splitting ou reduzir assets para SW (<2MB). | Baixo |
| 7 | Frontend | Imports ausentes | Lint falhando no TS-ESLint config | CI/CD | Instalar / corrigir dependência `@typescript-eslint/eslint-plugin`. | Baixo |

## Ordem sugerida de sprints de sanitização
1. Sprint 75C: Fechar Bloqueadores DB (RLS Intelligence).
2. Sprint 76A: Consertar bugs Críticos/Altos (Contratos 400 + UI Financeiro Parcial).
3. Sprint 76B: Worker Resiliência e Logs.
4. Sprint 77A: Refactoring Geral (Data Fetching, ESLint).
