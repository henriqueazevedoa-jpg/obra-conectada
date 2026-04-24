-- Adiciona campos de créditos de IA à tabela companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS ai_credits_included INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_credits_extra INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_credits_used_month INTEGER DEFAULT 0;

-- Cria tabela de histórico de uso da IA
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  custo_usd DECIMAL(10,6) DEFAULT 0,
  creditos DECIMAL(10,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Habilitar RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Administradores globais podem ver tudo (já coberto pelo super role ou políticas globais, mas para segurança:)
CREATE POLICY "Admin pode ler tudo" ON ai_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Empresas podem ler apenas os próprios registros
CREATE POLICY "company_own" ON ai_usage
  FOR SELECT USING (
    company_id = get_user_company_id()
  );

-- Permitir inserção pela service_role ou por edge functions autorizadas
-- (Usualmente não expomos inserção ao frontend publicamente, será via API)
CREATE POLICY "Insert by authenticated users via Edge Function" ON ai_usage
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id()
  );
