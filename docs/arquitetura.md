# Arquitetura do Sistema

## Visão geral

O sistema Obra Conectada é uma aplicação web baseada em React + Supabase, estruturada em módulos independentes que representam áreas da gestão de obras.

A arquitetura segue o padrão:

Frontend (React) → Supabase (PostgreSQL + Auth + Storage)

## Frontend

### Stack
- React
- TypeScript
- Vite
- Tailwind
- shadcn/ui

### Estrutura

- `pages/` → telas principais (cada módulo do sistema)
- `components/` → componentes reutilizáveis
- `contexts/` → estado global (auth, empresa, obra)
- `hooks/` → lógica reutilizável
- `integrations/` → conexão com Supabase

## Contextos principais

- AuthContext → controle de login
- CompanyContext → empresa ativa
- ObraContext → obra selecionada

## Backend (Supabase)

- PostgreSQL
- Row Level Security (RLS)
- Storage para arquivos
- Auth integrado

## Fluxo geral

Usuário loga → seleciona empresa → seleciona obra → interage com módulos

## Módulos do sistema

- Obras
- Orçamento
- Cronograma
- Custo real
- Pagamentos
- Estoque
- Diário de obra
- Pendências
- Documentos
- Fornecedores

## Filosofia do sistema

O sistema não tenta substituir o engenheiro.

Ele organiza:
- informação
- histórico
- tomada de decisão