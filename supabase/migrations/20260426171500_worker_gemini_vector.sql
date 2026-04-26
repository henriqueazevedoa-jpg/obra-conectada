-- Migration: Alterar a dimensao do pgvector para 768 (Gemini) e forcar reprocessamento
TRUNCATE TABLE projeto_chunks;
ALTER TABLE projeto_chunks ALTER COLUMN embedding TYPE vector(768);
UPDATE projeto_arquivos SET classificado = false;
