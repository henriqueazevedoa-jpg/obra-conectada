"""
Lastra Intelligence — Pipeline Pré-IA
Todas as extrações locais sem custo de API.
Executa em ordem de custo crescente, cada camada enriquece o estado.
"""

import os
import re
import json
import logging
import numpy as np
from pathlib import Path
from typing import Optional
from PIL import Image

from project_state import ProjectState, InfoPrancha
from config import (
    HASH_SIZE, SIMILARIDADE_DUPLICATA,
    DENSIDADE_MINIMA_PROCESSAR, DENSIDADE_TABELA_DENSA,
    CARIMBO_X_MIN, CARIMBO_Y_MIN,
    TESSERACT_LANG, TESSERACT_CONFIG,
    SALVAR_IMAGENS_INTERMEDIARIAS
)

log = logging.getLogger("pre_ai")


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 0 — Metadados do PDF
# ══════════════════════════════════════════════════════════════════════════════

def extrair_metadados_pdf(caminho_pdf: str, state: ProjectState):
    """
    Extrai metadados XMP e propriedades básicas do PDF.
    Detecta software de origem, autor, datas.
    Custo: zero. Tempo: <100ms.
    """
    try:
        import fitz
        doc = fitz.open(caminho_pdf)
        meta = doc.metadata

        state.software_origem = meta.get("creator", "") or meta.get("producer", "")

        # Tenta extrair nome do projeto dos metadados
        titulo = meta.get("title", "")
        if titulo and len(titulo) > 3:
            state.nome_projeto = titulo

        # Detecção de software
        software = state.software_origem.lower()
        if "revit" in software:
            state.software_origem = "Autodesk Revit"
        elif "autocad" in software:
            state.software_origem = "AutoCAD"
        elif "archicad" in software:
            state.software_origem = "ArchiCAD"
        elif "vectorworks" in software:
            state.software_origem = "Vectorworks"

        # Metadados XMP — ricos em projetos Revit
        xmp = doc.get_xml_metadata()
        if xmp:
            _processar_xmp(xmp, state)

        num_paginas = doc.page_count
        log.info(f"Metadados: software={state.software_origem}, "
                 f"título={state.nome_projeto}, páginas={num_paginas}")

        doc.close()
        return num_paginas

    except ImportError:
        log.warning("PyMuPDF não instalado — pulando extração de metadados")
        return _contar_paginas_fallback(caminho_pdf)
    except Exception as e:
        log.error(f"Erro ao extrair metadados: {e}")
        return 0


def _processar_xmp(xmp: str, state: ProjectState):
    """Extrai campos relevantes do XML de metadados."""
    try:
        import xml.etree.ElementTree as ET
        root = ET.fromstring(xmp)
        ns_dc = "http://purl.org/dc/elements/1.1/"

        # Dublin Core — título e criador
        titulo = root.find(f".//{{{ns_dc}}}title")
        if titulo is not None and titulo.text:
            state.nome_projeto = titulo.text.strip()

        criador = root.find(f".//{{{ns_dc}}}creator")
        if criador is not None and criador.text:
            state.responsavel_tecnico = criador.text.strip()

    except Exception:
        pass  # XMP malformado é comum, não é erro crítico


def _contar_paginas_fallback(caminho_pdf: str) -> int:
    try:
        import pdfplumber
        with pdfplumber.open(caminho_pdf) as pdf:
            return len(pdf.pages)
    except Exception:
        return 0


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 1 — Hash perceptual e deduplicação
# ══════════════════════════════════════════════════════════════════════════════

def calcular_hashes(imagem: Image.Image, num_prancha: int,
                    state: ProjectState) -> InfoPrancha:
    """
    Calcula pHash e dHash. Detecta duplicatas comparando com pranchas anteriores.
    Custo: zero. Tempo: <10ms por prancha.
    """
    info = state.pranchas.get(num_prancha, InfoPrancha(numero=num_prancha))

    try:
        import imagehash
        ph = imagehash.phash(imagem, hash_size=HASH_SIZE)
        dh = imagehash.dhash(imagem, hash_size=HASH_SIZE)

        info.hash_p = str(ph)
        info.hash_d = str(dh)

        # Compara com todas as pranchas já processadas
        for n, prancha_anterior in state.pranchas.items():
            if n >= num_prancha or prancha_anterior.hash_p is None:
                continue
            ph_ant = imagehash.hex_to_hash(prancha_anterior.hash_p)
            distancia = ph - ph_ant

            if distancia <= SIMILARIDADE_DUPLICATA:
                info.duplicata_de = n
                log.info(f"Prancha {num_prancha} é duplicata da prancha {n} "
                         f"(distância={distancia})")
                break

    except ImportError:
        log.warning("imagehash não instalado — pulando deduplicação")

    return info


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 2 — Análise de histograma e densidade
# ══════════════════════════════════════════════════════════════════════════════

def analisar_densidade(imagem: Image.Image, info: InfoPrancha) -> InfoPrancha:
    """
    Analisa distribuição de pixels para inferir tipo de prancha.
    Custo: zero. Tempo: <20ms por prancha.
    """
    gray = np.array(imagem.convert("L"))
    total = gray.size

    pixels_linha  = np.sum(gray < 50)    # preto = linhas desenhadas
    pixels_cinza  = np.sum((gray >= 50) & (gray < 200))   # cinza = hachuras
    pixels_fundo  = np.sum(gray >= 200)  # branco = espaço vazio

    info.densidade_visual = pixels_linha / total

    # Bimodalidade: quanto do conteúdo é só preto e branco (não cinza)
    bimodalidade = (pixels_linha + pixels_fundo) / total

    # Fingerprint de distribuição espacial
    altura, largura = gray.shape
    proj_y = np.sum(gray < 100, axis=1) / largura
    proj_x = np.sum(gray < 100, axis=0) / altura

    concentracao_v = float(np.std(proj_y))
    concentracao_h = float(np.std(proj_x))
    faixas_vazias  = int(np.sum(proj_y < 0.005))

    # Inferência de tipo por heurística
    tipo, confianca = _inferir_tipo_por_densidade(
        info.densidade_visual, bimodalidade,
        concentracao_v, concentracao_h, faixas_vazias,
        pixels_cinza / total
    )

    info.tipo_provavel    = tipo
    info.confianca_tipo   = confianca
    info.tipo_pdf         = "vetorial" if bimodalidade > 0.92 else "escaneado"

    return info


def _inferir_tipo_por_densidade(densidade, bimodalidade,
                                 conc_v, conc_h, faixas_vazias,
                                 ratio_cinza) -> tuple[str, float]:
    """Heurística de classificação. Calibrar após ver projetos reais."""

    if densidade < DENSIDADE_MINIMA_PROCESSAR:
        return "prancha_vazia", 0.95

    if densidade > DENSIDADE_TABELA_DENSA and bimodalidade > 0.88:
        return "tabela_ou_detalhe", 0.75

    if conc_h > 0.15 and faixas_vazias < 20 and bimodalidade > 0.90:
        return "planta_baixa", 0.70

    if conc_v > 0.12 and faixas_vazias > 30:
        return "corte_ou_elevacao", 0.65

    if ratio_cinza > 0.10:
        return "planta_com_hachura", 0.60

    return "desconhecido", 0.30


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 3 — Extração estrutural do PDF (pdfplumber + PyMuPDF)
# ══════════════════════════════════════════════════════════════════════════════

def extrair_estrutura_pagina(caminho_pdf: str, num_pagina: int,
                              info: InfoPrancha) -> InfoPrancha:
    """
    Extrai texto, tabelas geométricas, layers CAD e hierarquia tipográfica.
    Para PDFs vetoriais, isso já extrai tabelas completas sem IA.
    Custo: zero. Tempo: ~50ms por prancha.
    """
    # ── pdfplumber: texto e tabelas ───────────────────────────────────────────
    try:
        import pdfplumber
        with pdfplumber.open(caminho_pdf) as pdf:
            pagina = pdf.pages[num_pagina]

            # Texto completo com posições
            texto_completo = pagina.extract_text() or ""
            info.texto_extraido = texto_completo

            # Detecção de escala por regex no texto
            info.escala_declarada = _extrair_escala_texto(texto_completo)

            # Tabelas por geometria — funciona perfeitamente em PDFs vetoriais
            tabelas = pagina.find_tables()
            if tabelas:
                info.tem_tabela_geometrica = True
                for tabela in tabelas:
                    dados = tabela.extract()
                    if dados and len(dados) > 1:
                        cabecalho = [str(c).lower() for c in (dados[0] or [])
                                     if c is not None]
                        tipo_tabela = _classificar_tabela(cabecalho, dados)
                        info.tabelas_geometricas.append({
                            "bbox":      tabela.bbox,
                            "tipo":      tipo_tabela,
                            "linhas":    len(dados),
                            "colunas":   len(dados[0]) if dados[0] else 0,
                            "cabecalho": dados[0],
                            "conteudo":  dados[1:],  # sem o cabeçalho
                        })
                        log.info(f"Prancha {num_pagina}: tabela {tipo_tabela} "
                                 f"({len(dados)} linhas)")

    except ImportError:
        log.warning("pdfplumber não instalado")
    except Exception as e:
        log.debug(f"pdfplumber erro prancha {num_pagina}: {e}")

    # ── PyMuPDF: layers CAD e hierarquia tipográfica ──────────────────────────
    try:
        import fitz
        doc = fitz.open(caminho_pdf)
        pagina_fitz = doc[num_pagina]

        # Layers CAD (Optional Content Groups)
        oc = pagina_fitz.get_optional_content()
        if oc:
            info.layers_cad = [str(layer) for layer in oc]

        doc.close()

    except ImportError:
        pass
    except Exception as e:
        log.debug(f"PyMuPDF erro prancha {num_pagina}: {e}")

    return info


def _extrair_escala_texto(texto: str) -> Optional[str]:
    """Busca padrões de escala no texto extraído."""
    padroes = [
        r"[Ee][Ss][Cc]\.?\s*(\d+:\d+)",   # ESC. 1:50
        r"[Ee][Ss][Cc][Aa][Ll][Aa]\s*(\d+:\d+)",
        r"\b(1:\d{2,4})\b",                 # 1:50, 1:100, 1:200
        r"\b(\d{2,4}:1)\b",                 # 50:1 (escala de ampliação)
    ]
    for padrao in padroes:
        m = re.search(padrao, texto)
        if m:
            return m.group(1)
    return None


def _classificar_tabela(cabecalho: list, dados: list) -> str:
    """Identifica o tipo de tabela pelo cabeçalho."""
    h = " ".join(cabecalho)

    if any(p in h for p in ["esquadria", "janela", "porta", "vao", "vão"]):
        return "tabela_esquadrias"
    if any(p in h for p in ["area", "área", "ambiente", "compartimento", "m²", "m2"]):
        return "tabela_areas"
    if any(p in h for p in ["acabamento", "revestimento", "piso", "parede", "teto"]):
        return "tabela_acabamentos"
    if any(p in h for p in ["revisao", "revisão", "rev", "data", "descrição"]):
        return "tabela_revisoes"

    # Sem cabeçalho claro — tenta inferir pelo conteúdo
    conteudo_flat = " ".join(
        str(c).lower() for linha in dados[:3]
        for c in (linha or []) if c
    )
    if any(p in conteudo_flat for p in ["m²", "m2", "área"]):
        return "tabela_areas_sem_cabecalho"

    return "tabela_desconhecida"


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 4 — Visão computacional (OpenCV)
# ══════════════════════════════════════════════════════════════════════════════

def analisar_visao_computacional(imagem: Image.Image,
                                  info: InfoPrancha) -> InfoPrancha:
    """
    Análise de linhas, contornos e detecção de carimbo.
    Refina a classificação do tipo de prancha.
    Custo: zero. Tempo: ~200ms por prancha.
    """
    try:
        import cv2

        img_np  = np.array(imagem.convert("RGB"))
        gray    = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        altura, largura = gray.shape

        # ── Detecção de linhas por Hough ──────────────────────────────────────
        edges  = cv2.Canny(gray, 50, 150, apertureSize=3)
        linhas = cv2.HoughLines(edges, 1, np.pi / 180, threshold=80)

        if linhas is not None and len(linhas) > 10:
            angulos    = [l[0][1] for l in linhas]
            horizontais = sum(1 for a in angulos if abs(a) < 0.15)
            verticais   = sum(1 for a in angulos if abs(a - np.pi/2) < 0.15)
            total       = len(angulos)

            info.ratio_ortogonal = (horizontais + verticais) / total

            # Refina classificação com informação de linhas
            if info.ratio_ortogonal > 0.85 and info.tipo_provavel == "desconhecido":
                info.tipo_provavel  = "planta_baixa_ou_tabela"
                info.confianca_tipo = max(info.confianca_tipo, 0.60)
            elif info.ratio_ortogonal < 0.60:
                # Muitas diagonais = corte de terreno ou elevação com telhado
                if info.tipo_provavel in ("corte_ou_elevacao", "desconhecido"):
                    info.tipo_provavel  = "corte_com_diagonal"
                    info.confianca_tipo = max(info.confianca_tipo, 0.55)

        # ── Detecção do carimbo por posição e grade ───────────────────────────
        regiao_carimbo = gray[
            int(altura * CARIMBO_Y_MIN):,
            int(largura * CARIMBO_X_MIN):
        ]

        _, thresh = cv2.threshold(regiao_carimbo, 180, 255, cv2.THRESH_BINARY_INV)
        linhas_h  = cv2.HoughLines(thresh, 1, np.pi/180, threshold=30)
        linhas_v  = cv2.HoughLines(thresh, 1, np.pi/180, threshold=30)

        num_h = sum(1 for l in (linhas_h or []) if abs(l[0][1]) < 0.15)
        num_v = sum(1 for l in (linhas_v or []) if abs(l[0][1] - np.pi/2) < 0.15)

        if num_h >= 3 and num_v >= 2:
            info.tem_carimbo = True
            info.bbox_carimbo = (
                int(largura * CARIMBO_X_MIN), int(altura * CARIMBO_Y_MIN),
                largura, altura
            )
            log.info(f"Prancha {info.numero}: carimbo detectado")

        # ── Contagem aproximada de elementos repetidos ────────────────────────
        # Detecta padrão de símbolo de porta (arco de 90°) por contornos
        contornos, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        areas = [cv2.contourArea(c) for c in contornos]

        # Símbolos de porta têm área na faixa de arcos pequenos
        # (calibrar com projetos reais)
        possiveis_portas  = [a for a in areas if 200  < a < 2000]
        possiveis_janelas = [a for a in areas if 2000 < a < 8000]

        info.num_portas_detectadas  = len(possiveis_portas)
        info.num_janelas_detectadas = len(possiveis_janelas)

        # Se tem símbolos de porta, provavelmente é planta baixa
        if len(possiveis_portas) > 3 and info.tipo_provavel in (
            "desconhecido", "planta_baixa_ou_tabela"
        ):
            info.tipo_provavel  = "planta_baixa"
            info.confianca_tipo = max(info.confianca_tipo, 0.75)

    except ImportError:
        log.warning("OpenCV não instalado — pulando visão computacional")
    except Exception as e:
        log.debug(f"OpenCV erro prancha {info.numero}: {e}")

    return info


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 5 — OCR local no carimbo (Tesseract)
# ══════════════════════════════════════════════════════════════════════════════

def ocr_carimbo(imagem: Image.Image, info: InfoPrancha,
                state: ProjectState) -> InfoPrancha:
    """
    OCR na região do carimbo para extrair: escala, revisão, data, RT.
    Funciona bem em PDFs vetoriais. Mais lento em escaneados.
    Custo: zero. Tempo: ~500ms por prancha.
    """
    if not info.tem_carimbo or info.bbox_carimbo is None:
        return info

    try:
        import pytesseract

        x0, y0, x1, y1 = info.bbox_carimbo
        regiao = imagem.crop((x0, y0, x1, y1))

        # Pré-processamento para melhorar OCR
        import cv2
        gray  = cv2.cvtColor(np.array(regiao), cv2.COLOR_RGB2GRAY)
        _, th = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
        img_ocr = Image.fromarray(th)

        texto = pytesseract.image_to_string(
            img_ocr,
            lang=TESSERACT_LANG,
            config=TESSERACT_CONFIG
        )

        log.debug(f"OCR carimbo prancha {info.numero}:\n{texto[:300]}")

        # Extrai campos específicos
        escala = _extrair_escala_texto(texto)
        if escala and not info.escala_declarada:
            info.escala_declarada = escala
            if not state.escala_padrao:
                state.escala_padrao = escala
                log.info(f"Escala padrão definida: {escala}")

        # Data (DD/MM/AAAA ou MM/AAAA)
        m_data = re.search(r"\b(\d{2}/\d{2}/\d{4}|\d{2}/\d{4})\b", texto)
        if m_data and not state.data_projeto:
            state.data_projeto = m_data.group(1)

        # Revisão
        m_rev = re.search(r"[Rr][Ee][Vv]\.?\s*(\d+|[A-Z])", texto)
        if m_rev:
            info.escala_declarada  # apenas registra; revisão vai pro state depois

        # CAU/CREA
        m_cau = re.search(r"[Cc][Aa][Uu][:\s]+([A-Z0-9\-]+)", texto)
        if m_cau and not state.cau_crea:
            state.cau_crea = "CAU " + m_cau.group(1)

        m_crea = re.search(r"[Cc][Rr][Ee][Aa][:\s]+([A-Z0-9\-/]+)", texto)
        if m_crea and not state.cau_crea:
            state.cau_crea = "CREA " + m_crea.group(1)

        # ART
        m_art = re.search(r"[Aa][Rr][Tt][:\s#nNº.]*([0-9]{8,12})", texto)
        if m_art:
            state.adicionar_dado(
                modulo="contratos",
                tipo="art",
                valor={"numero_art": m_art.group(1), "fonte": "ocr_carimbo"},
                confianca=0.80,
                prancha=f"prancha_{info.numero}",
                fonte="pre_ai"
            )

        # Nome do projeto (geralmente o texto maior no carimbo)
        linhas = [l.strip() for l in texto.split("\n") if len(l.strip()) > 5]
        if linhas and not state.nome_projeto:
            # A linha mais longa geralmente é o nome do projeto
            candidato = max(linhas, key=len)
            if len(candidato) > 8:
                state.nome_projeto = candidato
                log.info(f"Nome do projeto detectado: {candidato}")

    except ImportError:
        log.warning("Tesseract não instalado — pulando OCR do carimbo")
    except Exception as e:
        log.debug(f"Tesseract erro prancha {info.numero}: {e}")

    return info


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 6 — FFT para análise de padrões repetitivos
# ══════════════════════════════════════════════════════════════════════════════

def analisar_fft(imagem: Image.Image, info: InfoPrancha) -> InfoPrancha:
    """
    Analisa frequências espaciais para detectar hachuras e padrões regulares.
    Ajuda a distinguir tabelas de plantas com hachura densa.
    Custo: zero. Tempo: ~100ms por prancha.
    """
    try:
        gray  = np.array(imagem.convert("L"), dtype=float)
        fft   = np.fft.fft2(gray)
        mag   = np.abs(np.fft.fftshift(fft))

        media    = mag.mean()
        desvio   = mag.std()
        threshold = media + 3 * desvio
        num_picos = int(np.sum(mag > threshold))

        tem_hachura_regular = num_picos > 60

        # Se tem padrão muito regular E alta densidade = tabela, não planta
        if (tem_hachura_regular and
                info.densidade_visual > DENSIDADE_TABELA_DENSA and
                info.tipo_provavel in ("planta_baixa", "desconhecido")):
            info.tipo_provavel  = "tabela_ou_detalhe"
            info.confianca_tipo = max(info.confianca_tipo, 0.65)

    except Exception as e:
        log.debug(f"FFT erro prancha {info.numero}: {e}")

    return info


# ══════════════════════════════════════════════════════════════════════════════
# PRIORIDADE DE PROCESSAMENTO
# ══════════════════════════════════════════════════════════════════════════════

PRIORIDADE_POR_TIPO = {
    "carimbo":                 1,
    "tabela_areas":            2,
    "tabela_esquadrias":       2,
    "tabela_acabamentos":      3,
    "tabela_revisoes":         4,
    "tabela_ou_detalhe":       3,
    "tabela_desconhecida":     4,
    "planta_baixa":            5,
    "planta_com_hachura":      5,
    "planta_baixa_ou_tabela":  4,
    "corte_ou_elevacao":       6,
    "corte_com_diagonal":      6,
    "elevacao":                8,
    "implantacao":             7,
    "prancha_vazia":           99,
    "desconhecido":            6,
}


def calcular_prioridade(info: InfoPrancha) -> int:
    return PRIORIDADE_POR_TIPO.get(info.tipo_provavel, 6)


# ══════════════════════════════════════════════════════════════════════════════
# ORQUESTRADOR PRÉ-IA
# ══════════════════════════════════════════════════════════════════════════════

def processar_pre_ai(caminho_pdf: str, imagens: list[Image.Image],
                     state: ProjectState, output_dir: str):
    """
    Roda todas as camadas pré-IA em todas as pranchas.
    Retorna state enriquecido + ordem de processamento para a IA.
    """
    log.info(f"Iniciando pré-processamento de {len(imagens)} pranchas...")

    total_pranchas  = len(imagens)
    puladas         = 0
    duplicatas      = 0

    for i, imagem in enumerate(imagens):
        log.info(f"  Pré-IA prancha {i+1}/{total_pranchas}...")

        # Cria info inicial
        info = InfoPrancha(numero=i)
        state.pranchas[i] = info

        # Camada 1 — Hash e deduplicação
        info = calcular_hashes(imagem, i, state)
        if info.duplicata_de is not None:
            info.prioridade = 99
            duplicatas += 1
            state.pranchas[i] = info
            continue

        # Camada 2 — Densidade e histograma
        info = analisar_densidade(imagem, info)

        if info.densidade_visual < DENSIDADE_MINIMA_PROCESSAR:
            info.prioridade = 99
            puladas += 1
            state.pranchas[i] = info
            continue

        # Camada 3 — Estrutura do PDF
        info = extrair_estrutura_pagina(caminho_pdf, i, info)

        # Camada 4 — Visão computacional
        info = analisar_visao_computacional(imagem, info)

        # Camada 5 — OCR no carimbo
        info = ocr_carimbo(imagem, info, state)

        # Camada 6 — FFT
        info = analisar_fft(imagem, info)

        # Prioridade final
        info.prioridade = calcular_prioridade(info)

        # Se tabela geométrica foi extraída diretamente, registra como dado
        for tabela in info.tabelas_geometricas:
            if tabela["tipo"] != "tabela_desconhecida":
                _registrar_tabela_geometrica(tabela, i, state)

        state.pranchas[i] = info

        # Salva imagem anotada (debug)
        if SALVAR_IMAGENS_INTERMEDIARIAS:
            _salvar_imagem_debug(imagem, info, output_dir, i)

    # Processa tabelas geométricas com pdfplumber diretamente
    # Antes de qualquer IA
    _extrair_tabelas_direto(caminho_pdf, state, output_dir)

    log.info(
        f"Pré-IA concluído: {total_pranchas} pranchas, "
        f"{duplicatas} duplicatas, {puladas} vazias"
    )

    # Ordena pranchas por prioridade para o pipeline de IA
    ordem_processamento = sorted(
        [i for i, p in state.pranchas.items()
         if p.prioridade < 99 and p.duplicata_de is None],
        key=lambda i: state.pranchas[i].prioridade
    )

    log.info(f"Ordem de processamento IA: {ordem_processamento}")
    return ordem_processamento


def _registrar_tabela_geometrica(tabela: dict, num_prancha: int,
                                  state: ProjectState):
    """Registra tabela extraída geometricamente como dado pré-IA."""
    tipo = tabela["tipo"]

    modulo_map = {
        "tabela_esquadrias":       "orcamento",
        "tabela_areas":            "orcamento",
        "tabela_acabamentos":      "orcamento",
        "tabela_areas_sem_cabecalho": "orcamento",
    }

    modulo = modulo_map.get(tipo, "documentos")

    state.adicionar_dado(
        modulo=modulo,
        tipo=tipo,
        valor={
            "cabecalho":  tabela.get("cabecalho"),
            "conteudo":   tabela.get("conteudo"),
            "linhas":     tabela.get("linhas"),
            "colunas":    tabela.get("colunas"),
            "bbox":       tabela.get("bbox"),
            "extraido_por": "geometria_pdf"
        },
        confianca=0.90,  # extração geométrica é muito confiável
        prancha=f"prancha_{num_prancha}",
        fonte="pre_ai"
    )


def _extrair_tabelas_direto(caminho_pdf: str, state: ProjectState,
                              output_dir: str):
    """
    Segunda passagem: extrai conteúdo completo de tabelas detectadas.
    Para tabelas de esquadrias e áreas, isso pode ser suficiente sem IA.
    """
    try:
        import pdfplumber
        with pdfplumber.open(caminho_pdf) as pdf:
            for i, prancha in state.pranchas.items():
                if not prancha.tem_tabela_geometrica:
                    continue
                for tabela_info in prancha.tabelas_geometricas:
                    if tabela_info["tipo"] in (
                        "tabela_esquadrias", "tabela_areas", "tabela_acabamentos"
                    ):
                        # Já temos o conteúdo — registra no state específico
                        _popular_state_com_tabela(tabela_info, state)

    except Exception as e:
        log.debug(f"Extração direta de tabelas: {e}")


def _popular_state_com_tabela(tabela: dict, state: ProjectState):
    """Popula state com dados de tabela extraída geometricamente."""
    tipo    = tabela["tipo"]
    dados   = tabela.get("conteudo", [])
    cabecalho = tabela.get("cabecalho", [])

    if tipo == "tabela_areas" and dados:
        for linha in dados:
            if not linha or len(linha) < 2:
                continue
            nome = str(linha[0] or "").strip()
            # Tenta extrair m² de qualquer coluna
            area = None
            for cell in linha[1:]:
                if cell:
                    m = re.search(r"(\d+[.,]\d+|\d+)", str(cell))
                    if m:
                        try:
                            area = float(m.group(1).replace(",", "."))
                            break
                        except ValueError:
                            pass
            if nome and area and area > 0.5:
                state.ambientes.append({
                    "nome": nome,
                    "area_m2": area,
                    "pavimento": "não identificado",
                    "fonte": "geometria_pdf"
                })

        if state.ambientes:
            state.area_total_m2 = sum(
                a["area_m2"] for a in state.ambientes
                if a["area_m2"] < 500  # filtra totais duplicados
            )
            log.info(f"Tabela de áreas extraída: {len(state.ambientes)} ambientes, "
                     f"total={state.area_total_m2:.1f}m²")


def _salvar_imagem_debug(imagem: Image.Image, info: InfoPrancha,
                          output_dir: str, num: int):
    """Salva imagem com anotações de debug."""
    try:
        from PIL import ImageDraw, ImageFont

        img_debug = imagem.copy().convert("RGB")
        draw      = ImageDraw.Draw(img_debug)

        # Anotação do tipo detectado
        texto = (f"P{num} | {info.tipo_provavel} "
                 f"({info.confianca_tipo:.0%}) | "
                 f"d={info.densidade_visual:.3f}")
        draw.rectangle([0, 0, len(texto)*7, 18], fill=(0, 0, 0))
        draw.text((2, 2), texto, fill=(255, 255, 0))

        # Bounding box do carimbo
        if info.bbox_carimbo:
            draw.rectangle(info.bbox_carimbo, outline=(255, 0, 0), width=3)
            draw.text((info.bbox_carimbo[0], info.bbox_carimbo[1] - 15),
                      "CARIMBO", fill=(255, 0, 0))

        # Reduz resolução para economizar espaço
        w, h = img_debug.size
        img_debug = img_debug.resize((w // 2, h // 2))
        img_debug.save(
            os.path.join(output_dir, "debug", f"prancha_{num:02d}.jpg"),
            quality=70
        )
    except Exception:
        pass
