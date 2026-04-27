# FRONTEND-AUDIT

## Comandos executados
| Comando | Resultado | Observação |
|---------|-----------|------------|
| `npm run build` | OK | Exit code 0, mas com warning de limite de assets do PWA (3.71 MB) no SW. |
| `npm run lint` | FALHOU | Exit code 1: Cannot find module './configs/eslintrc/all' no pacote typescript-eslint. |
| `npx tsc --noEmit` | OK | Compilação com checagem estática aprovada (Exit code 0). |
| `git status --short` | OK | Nenhuma alteração irregular (apenas arquivos deste sprint e logs). |

## Achados
| Criticidade | Arquivo | Problema | Evidência | Correção sugerida |
|-------------|---------|----------|-----------|-------------------|
| Alto | `ContratosListTab.tsx`, etc | Consultas de `contratos` retornando 400 | Suposta falha no embasamento do resource query `contratos_medicoes(*)` possivelmente por restrição de foreign key ou sintaxe da relation no PostgREST. | Validar as FKs do BD; se `contratos_medicoes` possuir mais de uma FK apontando para `contratos`, explicitar via FK no select: `contratos_medicoes!fk_name(...)`. |
| Médio | `RecebiveisTab.tsx` | Agrupamento de `parcial` incorreto na interface e impossibilidade de confirmar resto | Linha 182-183: O status `parcial` entra em `aReceber`, mas nas linhas do grid ele não possui o botão "Confirmar", pois `isPendente` exclui `parcial` (Linha 234). | Remover `parcial` da condição `isPendente` ou criar lógica de confirmação parcial progressiva. |
| Baixo | `useNotifications.ts` | Suspeita de vazamento de Realtime | Linha 141-147: O cleanup é feito e usa `unsubscribe()` e `removeChannel()`. A princípio não há vazamento crítico, embora faltem validações de referências nulas extremas. | Nenhuma mudança imediata exigida, mas monitorar múltiplas instâncias chamando realtime. |

## Supabase direto em componentes
A arquitetura atual possui o Supabase invocado diretamente na UI (Ex: `supabase.from('recebiveis')` em `RecebiveisTab.tsx`). Isso pode dificultar a gestão centralizada e testes. Recomendação: extrair para Services/Hooks customizados.

## Riscos multi-tenant
Nenhum risco de bloqueio aparente vazou no build/lint, mas a repetição de `.eq('company_id', companyId)` em toda query client-side é arriscada.

## Bugs conhecidos investigados
- **useNotifications loop**: O cleanup já parece estar presente no Hook `useNotifications` com `removeChannel`.
- **RecebíveisTab agrupamento**: Confirmado. Itens parciais ficam no "A Receber" mas não podem receber novas confirmações.
- **Contratos 400**: É provável que seja conflito de chave estrangeira com relacionamentos.
