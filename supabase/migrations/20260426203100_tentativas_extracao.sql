ALTER TABLE projeto_arquivos ADD COLUMN IF NOT EXISTS tentativas_extracao integer DEFAULT 0;
