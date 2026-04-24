"""
Lastra Intelligence — Configuração
Ajuste os valores aqui conforme os resultados dos testes.
"""

import os

# ── APIs ─────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY    = os.getenv("GOOGLE_API_KEY", "")

CLAUDE_MODEL  = "claude-sonnet-4-6"
GEMINI_MODEL  = "gemini-2.5-flash"

# ── Resolução de imagem ───────────────────────────────────────────────────────
# 150 DPI: bom equilíbrio entre legibilidade e custo de tokens
# 200 DPI: melhor para pranchas com texto muito pequeno
# 300 DPI: máxima qualidade, maior custo
PDF_DPI = 150

# ── Thresholds de densidade visual ───────────────────────────────────────────
# Ajustar após ver os projetos reais
DENSIDADE_MINIMA_PROCESSAR = 0.02   # abaixo disso: prancha praticamente vazia
DENSIDADE_TABELA_DENSA     = 0.20   # acima disso: provavelmente tabela/detalhe
DENSIDADE_PLANTA           = 0.08   # faixa típica de planta baixa

# ── Thresholds de classificação ───────────────────────────────────────────────
CONFIANCA_ALTA    = 0.85
CONFIANCA_MEDIA   = 0.70
CONFIANCA_BAIXA   = 0.50

# Divergência aceitável entre tabela de áreas e planta baixa
TOLERANCIA_AREA_M2     = 0.05   # 5%
TOLERANCIA_DIMENSAO_MM = 0.02   # 2%

# ── Hash perceptual ───────────────────────────────────────────────────────────
HASH_SIZE               = 16    # maior = mais preciso, mais lento
SIMILARIDADE_DUPLICATA  = 5     # distância de hamming abaixo disso = duplicata

# ── Regiões do carimbo (proporcional às dimensões da prancha) ─────────────────
# Ajustar se os projetos de terça usarem layout diferente
CARIMBO_X_MIN = 0.72   # 72% da largura
CARIMBO_Y_MIN = 0.65   # 65% da altura

# ── OCR ───────────────────────────────────────────────────────────────────────
TESSERACT_LANG   = "por"
TESSERACT_CONFIG = "--psm 6"

# ── Custo de tokens → créditos Lastra ────────────────────────────────────────
# Taxa de conversão: custo real em USD × margem
# Ajustar a margem conforme estratégia comercial
MARGEM_CREDITOS = 3.0   # 3× o custo real

# Custo por milhão de tokens (USD)
CUSTO_CLAUDE_INPUT  = 3.00
CUSTO_CLAUDE_OUTPUT = 15.00
CUSTO_GEMINI_INPUT  = 0.30
CUSTO_GEMINI_OUTPUT = 2.50

# USD → BRL (atualizar periodicamente)
USD_BRL = 5.70

# Créditos por real (definir conforme pricing do produto)
CREDITOS_POR_REAL = 10

# ── Saída ─────────────────────────────────────────────────────────────────────
OUTPUT_DIR = "output"
SALVAR_IMAGENS_INTERMEDIARIAS = True   # útil para debug na Fase 0
SALVAR_JSON_POR_ETAPA         = True   # salva JSON de cada camada separadamente
