# Lastra Intelligence — Worker de Análise de Projetos

Pipeline de extração de dados de projetos arquitetônicos em PDF.
Fase 0: validação de qualidade antes de integrar ao Lastra.

---

## Setup rápido

```bash
# 1. Dependências do sistema
# macOS:
brew install poppler tesseract tesseract-lang

# Ubuntu:
sudo apt install poppler-utils tesseract-ocr tesseract-ocr-por

# 2. Dependências Python
pip install -r requirements.txt

# 3. Variáveis de ambiente (APIs)
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="AIza..."
```

---

## Uso

```bash
# Análise completa (pré-IA + IA)
python worker.py projeto.pdf

# Com descrição do projeto
python worker.py projeto.pdf --descricao "Residência unifamiliar 4 pavimentos"

# Apenas pré-IA (sem custo de API — útil para testar a extração local)
python worker.py projeto.pdf --sem-ia

# Teste rápido com apenas as primeiras 5 pranchas
python worker.py projeto.pdf --max-pranchas 5

# DPI personalizado (150 padrão, 200 para projetos com texto muito pequeno)
python worker.py projeto.pdf --dpi 200

# Diretório de saída personalizado
python worker.py projeto.pdf --output resultados/projeto_x
```

---

## O que é gerado

```
output/nome_projeto_YYYYMMDD_HHMMSS/
├── relatorio.html          ← ABRA ESTE no navegador
├── resultado_final.json    ← dados consolidados para importação
├── state_final.json        ← estado completo do pipeline
├── state_pre_ia.json       ← estado após etapas locais (sem custo)
├── fragmentos_extraidos.json
├── fragmentos/             ← imagens recortadas pela IA (debug)
│   ├── p01_tabela_esquadrias_...jpg
│   ├── p03_planta_baixa_...jpg
│   └── ...
└── debug/                  ← pranchas anotadas com classificação pré-IA
    ├── prancha_00.jpg
    ├── prancha_01.jpg
    └── ...
```

---

## Estratégia de teste (Fase 0)

**Rodada 1 — apenas pré-IA:**
```bash
python worker.py projeto.pdf --sem-ia
```
Avalia: classificação de pranchas, extração de tabelas geométricas,
leitura do carimbo por OCR. Zero custo de API.

**Rodada 2 — pipeline completo:**
```bash
python worker.py projeto.pdf
```
Avalia: qualidade dos bounding boxes do Gemini, precisão da extração
do Sonnet, custo real por projeto.

**O que avaliar no relatório HTML:**
- As pranchas foram classificadas corretamente?
- A tabela de áreas foi extraída com os valores certos?
- As esquadrias foram identificadas completamente?
- O carimbo foi lido corretamente (nome do projeto, RT, escala)?
- Onde a IA errou ou teve baixa confiança?
- O custo está dentro do esperado (~R$10-30 por projeto)?

---

## Ajuste de configuração

Edite `config.py` para calibrar:

- `PDF_DPI`: resolução de conversão (150 padrão)
- `DENSIDADE_*`: thresholds de classificação por densidade
- `CARIMBO_X_MIN / Y_MIN`: posição do carimbo na prancha
- `MARGEM_CREDITOS`: margem comercial sobre custo de API
- `SALVAR_IMAGENS_INTERMEDIARIAS`: True para debug, False para produção

---

## Arquitetura do pipeline

```
PDF
 │
 ├── CAMADA 0 — Metadados (PyMuPDF)       ~0ms, grátis
 ├── CAMADA 1 — Hash perceptual           ~10ms/prancha, grátis
 ├── CAMADA 2 — Densidade e histograma    ~20ms/prancha, grátis
 ├── CAMADA 3 — Estrutura vetorial        ~50ms/prancha, grátis
 │              (pdfplumber + PyMuPDF)
 ├── CAMADA 4 — Visão computacional       ~200ms/prancha, grátis
 │              (OpenCV)
 ├── CAMADA 5 — OCR no carimbo            ~500ms/prancha, grátis
 │              (Tesseract)
 ├── CAMADA 6 — FFT padrões repetitivos   ~100ms/prancha, grátis
 │
 ├── FASE 1 IA — Pranchas textuais
 │   ├── Gemini: bounding boxes           ~$0.005/prancha
 │   └── Sonnet: interpretação tabelas    ~$0.02/prancha
 │
 ├── FASE 2 IA — Pranchas visuais
 │   ├── Gemini: bounding boxes           ~$0.005/prancha
 │   └── Sonnet: interpretação plantas    ~$0.03/prancha
 │
 └── CONSOLIDAÇÃO — Sonnet               ~$0.05/projeto
```

---

## Próximos passos após Fase 0

1. Calibrar thresholds de `config.py` com os projetos reais
2. Refinar prompts em `ai_pipeline.py` para os padrões encontrados
3. Criar templates de simbologia (porta, janela) com recortes reais
4. Integrar como job assíncrono no backend do Lastra
5. Criar a Central de Importação no frontend
