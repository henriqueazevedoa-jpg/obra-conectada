# Estrutura do Banco de Dados

## Visão geral

O banco é estruturado para suportar múltiplas empresas, múltiplas obras e controle completo da execução.

## Entidades principais

### Empresas
- companies
- plans
- subscriptions

### Usuários
- profiles
- user_roles
- company_user_invites

### Obras
- obras
- obra_memberships

### Orçamento
- orcamento_categorias
- orcamento_composicoes
- orcamento_subitens

### Execução
- custo_real_itens
- diario_registros
- diario_servicos
- diario_materiais

### Financeiro
- pagamentos
- pagamento_itens
- pagamento_anexos

### Estoque
- materiais
- movimentacoes

### Fornecedores
- fornecedores
- precos_fornecedores

### Gestão
- pendencias
- documentos_obra

## Relacionamentos importantes

- empresa → obras
- obra → orçamento
- obra → pagamentos
- obra → diário
- obra → estoque
- fornecedor → preços
- pagamento → itens

## Segurança

O sistema utiliza Row Level Security (RLS) para:

- isolar dados por empresa
- controlar acesso por usuário
- garantir integridade

## Estratégia

- multi-tenant por company_id
- controle por obra_id
- rastreabilidade completa de dados