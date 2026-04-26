-- Migration: Worker Protecoes e Anti-loop
ALTER TABLE projeto_arquivos ADD COLUMN IF NOT EXISTS tentativas_classificacao integer DEFAULT 0;
ALTER TABLE projeto_arquivos ADD COLUMN IF NOT EXISTS ultima_tentativa_em timestamptz;
