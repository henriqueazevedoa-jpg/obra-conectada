# Obra Conectada

Sistema de gestão e organização de obras com foco em controle financeiro, cronograma, diário de obra, estoque, pagamentos, fornecedores, documentos e acompanhamento operacional.

## Visão geral

O Obra Conectada foi desenvolvido para centralizar as principais rotinas de gestão de obras em uma única plataforma.

O sistema combina módulos de planejamento, acompanhamento e registro operacional para ajudar engenheiros, gestores e construtores a terem mais clareza sobre:

- orçamento da obra
- cronograma físico
- custos realizados
- pagamentos previstos e pagos
- estoque e movimentações
- diário de obra
- pendências
- fornecedores e banco de preços
- documentos da obra

## Principais funcionalidades

- Cadastro e gestão de obras
- Estrutura orçamentária por categorias, composições e subitens
- Cronograma e acompanhamento físico
- Lançamento de custo real
- Gestão de estoque e movimentações
- Gestão de pagamentos
- Cadastro de fornecedores
- Histórico de preços por fornecedor
- Registro de diário de obra
- Gestão de pendências
- Gestão de documentos da obra
- Estrutura multiempresa
- Controle de usuários, perfis e permissões

## Tecnologias utilizadas

### Front-end
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Back-end / infraestrutura
- Supabase
- PostgreSQL
- Row Level Security (RLS)
- Storage do Supabase

### Qualidade e testes
- ESLint
- Vitest
- Playwright

## Estrutura do projeto

```bash
src/
  components/        # Componentes reutilizáveis
  contexts/          # Contextos globais
  hooks/             # Hooks customizados
  integrations/      # Integrações (ex: Supabase)
  lib/               # Utilitários
  pages/             # Páginas principais do sistema
supabase/
  migrations/        # Migrations do banco
public/
