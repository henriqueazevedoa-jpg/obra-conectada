# SEED-04C-REVIEW

## Data
2026-04-27

## Estado inicial (subitens antes do enriquecimento)
| Obra | Subitens atuais |
| ---- | --------------- |
| a1 (Residência) | 2 |
| a2 (Reforma) | 3 |
| a3 (Galpão) | 0 |

## Composições alvo
| Obra | Composição ID | Descrição | Subitens planejados |
| ---- | ------------- | --------- | ------------------- |
| a1 | d1110000... | Limpeza do Terreno | 2 |
| a1 | d1120000... | Locação da Obra | 3 |
| a1 | d1210000... | Escavação manual | 3 |
| a1 | d1220000... | Concreto usinado FCK 25MPa | 2 |
| a1 | d1310000... | Armação em aço CA-50 | 5 |
| a1 | d1320000... | Laje pré-moldada | 6 |
| a2 | d2110000... | Demolição de piso | 5 |
| a2 | d2120000... | Caçamba de entulho | 2 |
| a2 | d2210000... | Piso porcelanato | 5 |
| a2 | d2220000... | Mão de obra assentamento | 3 |
| a2 | d2310000... | Pintura acrílica | 11 |
| a3 | d3110000... | Terraplanagem | 4 |
| a3 | d3120000... | Sapatas | 5 |
| a3 | d3210000... | Pilares Metálicos | 4 |
| a3 | d3220000... | Tesouras e Terças | 5 |

## Subitens planejados
| Obra | Quantidade | Tipos incluídos |
| ---- | ---------- | --------------- |
| a1 | 21 | Material, Mão de Obra, Equipamento |
| a2 | 26 | Material, Mão de Obra, Serviço |
| a3 | 18 | Equipamento, Material, Mão de Obra |
| **Total** | **65** | |

## Campos reais usados em orcamento_subitens
| Campo | Uso |
| ----- | --- |
| `id` | UUID determinístico com prefixo `e` e zeros/hexadecimais |
| `composicao_id` | Chave estrangeira ligando à `orcamento_composicoes` da base 04A |
| `categoria_id` | Chave estrangeira redundante ligando à `orcamento_categorias` exigida pelo schema (`NOT NULL`) |
| `company_id` | `bbbbbbbb...0001` (demo) exigido pelo schema (`NOT NULL`) |
| `nome` | Nome principal do insumo/serviço |
| `descricao` | Detalhamento livre (opcional, mas preenchido) |
| `unidade` | Medida (`h`, `m2`, `m3`, `un`, `kg`, `rl`, `sc`, `pct`, `ml`, `cj`, `lt`) |
| `quantidade` | Valor numérico |
| `preco_unitario` | Custo unitário |
| `preco_total` | Quantidade * preco_unitario pre-calculado |

## Scripts criados
| Arquivo | Executado? |
| ------- | ---------- |
| `/supabase/seed/demo/04c_orcamento_subitens.sql` | Não |
| `/supabase/seed/demo/04c_validate_orcamento_subitens.sql` | Não |

## Riscos e pontos de revisão humana
- **Schema Estrito**: O script já obedece rigorosamente a obrigatoriedade da coluna `categoria_id`, que poderia passar despercebida já que os subitens normalmente ficam atrelados apenas à composição.
- **Limpeza de IDs Fixos**: O script foi criado para ser idempotente fazendo um `DELETE` inicial de IDs com o prefixo `e11`, `e12`... garantindo re-execução segura.
- **Nenhum UUID Inválido**: Utilizadas apenas letras `a-f`. Nenhum caractere proibido como `v` ou `p` foi incluído.
- **Obras Pré-existentes Intactas**: Nenhuma composição selecionada aponta para obras com IDs terminando em `0001` do universo não-demo.

## Pronto para Seed 04D (executar enriquecimento)? 
**Sim.** Todos os pre-requisitos de planejamento, formatação e consistência de integridade relacional estão atendidos. O volume de dados trará realismo imediato à demo.
