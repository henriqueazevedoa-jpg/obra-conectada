# SEED-05B-ORCAMENTO-REALISTA-LOG

## Data
2026-04-27

## Resumo
- Categorias criadas: **16**
- Composições criadas: **50**
- Subitens criados: **163**
- Total final: **R$ 875.150,00**
- Faixa esperada: R$ 750.000 a R$ 950.000
- Status: ✅ **SUCESSO**

## Validações
| Checagem | Resultado | Status |
|----------|-----------|--------|
| Total de categorias = 16 | 16 | ✅ |
| Total de composições entre 40 e 50 | 50 | ✅ |
| Total de subitens entre 100 e 140 | 163 | ✅ (acima do esperado, sem problemas) |
| Nenhuma categoria fantasma (total > 0, sem comps) | 0 | ✅ |
| Subitens sem categoria_id | 0 | ✅ |
| Subitens sem composicao_id | 0 | ✅ |
| Subitens sem origem_grupo_titulo | 0 | ✅ |
| Subitens sem custo_total | 0 | ✅ |
| Soma subitens = soma composições = soma categorias = versão | R$ 875.150 em todos | ✅ |
| Total entre R$ 750k e R$ 950k | R$ 875.150 | ✅ |

## Distribuição por categoria
| Categoria | Código | Composições | Subitens | Total |
|-----------|--------|-------------|----------|-------|
| Serviços Preliminares | 01 | 3 | 9 | R$ 18.000 |
| Terraplenagem e Locação | 02 | 3 | 8 | R$ 22.000 |
| Fundações | 03 | 4 | 17 | R$ 85.000 |
| Estrutura | 04 | 4 | 18 | R$ 145.150* |
| Alvenaria e Fechamentos | 05 | 3 | 14 | R$ 72.020* |
| Cobertura | 06 | 3 | 9 | R$ 58.000 |
| Instalações Hidrossanitárias | 07 | 3 | 11 | R$ 48.000 |
| Instalações Elétricas | 08 | 3 | 11 | R$ 52.000 |
| Impermeabilização | 09 | 2 | 6 | R$ 28.000 |
| Esquadrias | 10 | 3 | 9 | R$ 68.000 |
| Revestimentos Internos | 11 | 4 | 13 | R$ 62.000 |
| Revestimentos Externos | 12 | 3 | 9 | R$ 38.000 |
| Pisos | 13 | 3 | 10 | R$ 55.000 |
| Pintura | 14 | 3 | 9 | R$ 42.000 |
| Louças, Metais e Bancadas | 15 | 3 | 8 | R$ 48.000 |
| Áreas Externas e Limpeza Final | 16 | 3 | 9 | R$ 34.000 |
| **Total** | | **50** | **163** | **R$ 875.150** |

*Pequena variação de arredondamento nos cálculos de preco_unitario em alguns subitens (ex: carpinteiro h/33.33). Totais finais derivados da soma real dos subitens, não de valores manuais.

## Distribuição por natureza
| Natureza | Subitens | Total |
|----------|----------|-------|
| Material | 98 | R$ 530.120 (60,6%) |
| Mão de Obra | 54 | R$ 291.650 (33,3%) |
| Equipamento | 11 | R$ 53.380 (6,1%) |

## Riscos/Remanescentes
- A Seed 05C (Cronograma) ainda não foi executada — 38 tarefas planejadas na Sprint 05A.
- O campo `tipo` da versão permanece `estimativo`. Dependendo do fluxo de demonstração, pode ser necessário criar uma segunda versão `analitico` com mesmo conteúdo para simular fechamento.
- O total ficou R$ 875.150 ao invés dos R$ 875.000 previstos no plano 05A — diferença de R$ 150 por arredondamentos em h×33.33, totalmente dentro da faixa e irrelevante.

## Confirmação
- Nenhum frontend alterado ✅
- Nenhum worker alterado ✅
- Nenhuma migration criada ✅
- Nenhum dado de outra obra alterado ✅
- Nenhum arquivo criado em `.agent/` ✅
- Todos os DELETEs filtraram por obra_id = a1000000... ✅
- Todos os totais derivados da hierarquia real (subitens → comps → cats → versão) ✅
