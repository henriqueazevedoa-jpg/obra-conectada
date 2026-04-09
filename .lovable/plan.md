
## O que já existe (não será refeito)
- Tabelas: plans, companies, subscriptions, subscription_extras, profiles, user_roles
- RLS por company_id em todas as tabelas
- CompanyContext, usePlanLimits, AdminPage
- Planos Start/Pro/Enterprise

## Fase 1: Ajustes de planos + Overrides + Add-ons (migração SQL)

### 1.1 Atualizar limites dos planos existentes
- Pro: 10 obras, 3 gestores, 5 funcionários, 5 clientes (era 5/2/4/4)

### 1.2 Criar tabela `company_permission_overrides`
- company_id, max_obras, max_gestores, max_funcionarios, max_clientes, ilimitado
- RLS: admin pode gerenciar, membros da empresa podem visualizar

### 1.3 Criar tabelas de add-ons
- `addon_catalog`: code, nome, descricao, ativo
- `company_addons`: company_id, addon_code, status, trial_start, trial_end
- Seed: addon `voice_ai` (Assistente por Voz IA)

### 1.4 Atualizar função `check_plan_limit` 
- Verificar overrides primeiro, depois plano

### 1.5 Criar tabela `voice_inputs`
- id, company_id, user_id, obra_id, module_origin, audio_path, transcription, parsed_json, confidence, status, created_at

## Fase 2: Frontend - Admin evoluído
- Adicionar na AdminPage: edição de overrides por empresa, gestão de add-ons
- Mostrar add-ons ativos na lista de empresas

## Fase 3: Frontend - Voz IA
- Hook `useVoiceInput` com gravação, upload, transcrição e interpretação via edge function
- Botão de gravação nos módulos: Diário, Estoque, Cronograma, Orçamento
- Preview dos dados antes de salvar, campos incertos destacados
- Verificação do add-on voice_ai antes de permitir uso

## Fase 4: Edge Function - Processamento de áudio
- Edge function `process-voice` que recebe áudio, transcreve e interpreta com Lovable AI
- Retorna JSON específico por módulo
- Salva na tabela voice_inputs

## Ordem de execução
1. Migração SQL (tudo junto)
2. Código frontend (admin + contexts)
3. Edge function de voz
4. Componentes de voz nos módulos
