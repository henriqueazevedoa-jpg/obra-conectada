# WORKER-AUDIT

## Localização do worker
O worker está localizado na pasta `worker/` e contém os scripts `main.py` e `consolidador.py`, integrados ao fluxo de Intelligence (processamento de quantitativos e PDFs).

## Comandos executados
| Comando | Resultado | Observação |
|---------|-----------|------------|
| `python -m compileall .` | OK | Nenhuma falha de sintaxe encontrada (Exit code 0). |
| `pytest` | NÃO EXECUTADO | Arquivos de teste explícitos não identificados. |

## Integrações externas
| Provider | Arquivo | Timeout? | Retry? | Log custo? | Observação |
|----------|---------|----------|--------|------------|------------|
| Supabase | `main.py`, `consolidador.py` | Sim | Probável | Parcial | Conexão para buscar/salvar chunks, quantitativos e registros consolidados. |
| Anthropic | `main.py`, `consolidador.py` | Config. Padrão | Não aparente | Sim (via `ai_usage`) | Usado como LLM principal/secundário (Claude 3.5 Sonnet) para resolver inconsistências. |
| OpenAI/Google | `requirements.txt` | - | - | - | Presente nos requirements, possível uso opcional/fallback. |

## Tratamento de erro
- Existe um uso abrangente de instâncias de tentativa de extração. O uso de `except Exception as e:` e `pass` pode ocultar erros importantes.
- Sugere-se padronizar os blocos try-except para logar os traces (p.ex. via Sentry) ao invés de prosseguir silenciosamente.

## Isolamento multi-tenant
A validação depende inteiramente de `company_id` e `obra_id` filtrados no Supabase e informados via job de payload. Risco médio se não for estritamente forçado nas regras de RLS e no backend, pois o Python pode interagir via service role sem `auth.uid()`.

## Processamento PDF
O Worker usa múltiplas bibliotecas: `pymupdf`, `pdfplumber`, `camelot-py` e `tabula-py`. Esse arsenal indica uma abordagem de "fallback" (se uma falha, tenta outra) ou extração de zonas via bboxes [0.0 a 1.0]. A união com `spacy` e `rapidfuzz` no `consolidador.py` aponta para pipeline robusto NLP.

## Riscos prioritários
- Service Role no Worker pode ignorar políticas de isolamento caso as chaves `company_id` não sejam adicionadas nos SELECTs/UPDATEs.
- Uso excessivo de tokens no Anthropic pode esbarrar em rate limits se as requisições não tiverem backoff nativo.
- Extração de PDF sem timeouts rigorosos pode gerar travamentos na thread principal e estourar memória.

## Próximas ações
- Adicionar retry com exponential backoff (Ex: biblioteca `tenacity`).
- Revisar as chamadas ao Supabase para garantir inserção mandatória de `company_id`.
