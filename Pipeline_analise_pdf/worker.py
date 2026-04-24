"""
Lastra Intelligence — Worker Principal
Uso: python worker.py caminho/do/projeto.pdf [--descricao "texto livre"]

Fase 0: roda o pipeline completo e gera relatório HTML para avaliação manual.
"""

import os
import sys
import json
import time
import logging
import argparse
from pathlib import Path
from datetime import datetime

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("worker")


def verificar_dependencias() -> dict:
    """Verifica quais bibliotecas estão disponíveis."""
    deps = {}

    modulos = {
        "pdfplumber":       "Extração de texto e tabelas",
        "fitz":             "PyMuPDF — metadados e estrutura vetorial",
        "pdf2image":        "Conversão PDF → imagens",
        "PIL":              "Pillow — manipulação de imagens",
        "numpy":            "Análise numérica",
        "cv2":              "OpenCV — visão computacional",
        "imagehash":        "Hash perceptual — deduplicação",
        "pytesseract":      "OCR local — leitura de carimbo",
        "anthropic":        "Claude API — interpretação",
        "google.generativeai": "Gemini API — bounding boxes",
    }

    for modulo, descricao in modulos.items():
        try:
            __import__(modulo)
            deps[modulo] = True
        except ImportError:
            deps[modulo] = False

    return deps


def imprimir_status_deps(deps: dict):
    print("\n── Dependências ──────────────────────────────────")
    for modulo, disponivel in deps.items():
        status = "✅" if disponivel else "❌"
        print(f"  {status} {modulo}")
    print()

    criticas = ["PIL", "numpy", "pdfplumber"]
    ausentes_criticas = [m for m in criticas if not deps[m]]
    if ausentes_criticas:
        print(f"❌ Dependências críticas ausentes: {', '.join(ausentes_criticas)}")
        print("   Instale com: pip install pillow numpy pdfplumber")
        sys.exit(1)

    if not deps.get("pdf2image"):
        print("⚠️  pdf2image não instalado — conversão de PDF limitada")
        print("   Instale com: pip install pdf2image")
        print("   (requer poppler: brew install poppler / apt install poppler-utils)")

    if not deps.get("anthropic") or not deps.get("google.generativeai"):
        print("⚠️  APIs de IA não disponíveis — pipeline rodará apenas pré-IA")


def resolver_inputs(entradas: list[str]) -> tuple[str, str]:
    """
    Recebe uma lista de entradas (arquivos PDF ou pasta) e retorna
    (caminho_pdf_final, nome_base).

    Casos suportados:
      - Um único PDF:           usa direto
      - Múltiplos PDFs:         merge em arquivo temporário
      - Uma pasta:              encontra todos os PDFs, ordena, faz merge
    """
    import glob
    import tempfile

    pdfs = []

    for entrada in entradas:
        entrada = os.path.abspath(entrada)

        if os.path.isdir(entrada):
            # Pasta: coleta todos os PDFs em ordem alfabética
            encontrados = sorted(glob.glob(os.path.join(entrada, "**/*.pdf"),
                                           recursive=True))
            encontrados += sorted(glob.glob(os.path.join(entrada, "**/*.PDF"),
                                            recursive=True))
            if not encontrados:
                print(f"❌ Nenhum PDF encontrado em: {entrada}")
                sys.exit(1)
            pdfs.extend(encontrados)
            print(f"📁 Pasta: {len(encontrados)} PDFs encontrados em {entrada}")

        elif entrada.lower().endswith(".pdf"):
            if not os.path.exists(entrada):
                print(f"❌ Arquivo não encontrado: {entrada}")
                sys.exit(1)
            pdfs.append(entrada)

        else:
            print(f"❌ Entrada não reconhecida: {entrada}")
            sys.exit(1)

    if not pdfs:
        print("❌ Nenhum PDF válido encontrado")
        sys.exit(1)

    # Um único arquivo — usa direto, sem merge
    if len(pdfs) == 1:
        return pdfs[0], Path(pdfs[0]).stem

    # Múltiplos arquivos — faz merge
    return merge_pdfs(pdfs), Path(pdfs[0]).stem + "_merged"


def merge_pdfs(caminhos: list[str]) -> str:
    """
    Combina múltiplos PDFs em um único arquivo temporário.
    A ordem da lista define a ordem das pranchas no arquivo final.
    """
    try:
        import fitz

        print(f"\n🔗 Unificando {len(caminhos)} PDFs...")
        for i, c in enumerate(caminhos):
            print(f"   {i+1:02d}. {os.path.basename(c)}")

        doc_final = fitz.open()
        total_paginas = 0

        for caminho in caminhos:
            doc = fitz.open(caminho)
            doc_final.insert_pdf(doc)
            total_paginas += doc.page_count
            doc.close()

        # Salva em arquivo temporário no diretório de trabalho
        saida = os.path.join("output", "_merged_temp.pdf")
        os.makedirs("output", exist_ok=True)
        doc_final.save(saida)
        doc_final.close()

        print(f"   ✅ Merged: {total_paginas} páginas → {saida}\n")
        return os.path.abspath(saida)

    except ImportError:
        print("❌ PyMuPDF necessário para merge de PDFs: pip install PyMuPDF")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro ao fazer merge dos PDFs: {e}")
        sys.exit(1)


def converter_pdf_para_imagens(caminho_pdf: str, dpi: int) -> list:
    """Converte PDF em lista de imagens PIL."""
    try:
        from pdf2image import convert_from_path
        log.info(f"Convertendo PDF em imagens a {dpi} DPI...")
        # poppler_path garante funcionamento mesmo sem PATH configurado
        import shutil
        poppler_path = shutil.which("pdftoppm")
        poppler_path = os.path.dirname(poppler_path) if poppler_path else None
        # Fallback para caminho padrão no Windows
        if not poppler_path and os.name == "nt":
            candidates = [
                r"C:\poppler-25.12.0\Library\bin",
                r"C:\poppler\Library\bin",
                r"C:\Program Files\poppler\Library\bin",
            ]
            for c in candidates:
                if os.path.exists(os.path.join(c, "pdftoppm.exe")):
                    poppler_path = c
                    break
        imagens = convert_from_path(caminho_pdf, dpi=dpi, poppler_path=poppler_path)
        log.info(f"{len(imagens)} páginas convertidas")
        return imagens
    except ImportError:
        log.warning("pdf2image não disponível — tentando PyMuPDF")
        return _converter_via_fitz(caminho_pdf, dpi)
    except Exception as e:
        log.error(f"Erro ao converter PDF: {e}")
        return []


def _converter_via_fitz(caminho_pdf: str, dpi: int) -> list:
    """Fallback: converte via PyMuPDF."""
    try:
        import fitz
        from PIL import Image
        import io

        doc = fitz.open(caminho_pdf)
        imagens = []
        mat = fitz.Matrix(dpi / 72, dpi / 72)

        for num_pag in range(doc.page_count):
            pag = doc[num_pag]
            pix = pag.get_pixmap(matrix=mat)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            imagens.append(img)

        doc.close()
        log.info(f"{len(imagens)} páginas convertidas via PyMuPDF")
        return imagens
    except Exception as e:
        log.error(f"Fallback PyMuPDF falhou: {e}")
        return []


def main():
    parser = argparse.ArgumentParser(
        description="Lastra Intelligence — Analisador de Projetos Arquitetônicos",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Exemplos:
  python worker.py projeto.pdf
  python worker.py A-01.pdf A-02.pdf A-03.pdf
  python worker.py pasta_do_projeto/
  python worker.py A-01.pdf A-02.pdf --sem-ia --max-pranchas 5"""
    )
    parser.add_argument(
        "inputs",
        nargs="+",
        metavar="PDF_OU_PASTA",
        help="PDF(s) ou pasta do projeto"
    )
    parser.add_argument(
        "--descricao", "-d",
        default="",
        help="Descrição livre do projeto (opcional)"
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=None,
        help=f"Resolução DPI para conversão (padrão: {__import__('config').PDF_DPI})"
    )
    parser.add_argument(
        "--sem-ia",
        action="store_true",
        help="Roda apenas o pipeline pré-IA (sem chamar APIs)"
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Diretório de saída (padrão: output/nome_do_arquivo)"
    )
    parser.add_argument(
        "--max-pranchas",
        type=int,
        default=None,
        help="Limita o número de pranchas processadas (útil para testes rápidos)"
    )
    parser.add_argument(
        "--disciplina",
        default="arquitetonico",
        choices=["arquitetonico", "estrutural", "hidraulico", "eletrico", "memorial"],
        help="Disciplina do projeto (padrão: arquitetonico)"
    )
    parser.add_argument(
        "--contexto",
        default=None,
        metavar="JSON",
        help="Contexto da calculadora como JSON inline"
    )
    parser.add_argument(
        "--contexto-arquivo",
        default=None,
        metavar="ARQUIVO.json",
        help="Caminho para arquivo JSON com contexto da calculadora"
    )
    args = parser.parse_args()

    # ── Resolve inputs: PDF único, múltiplos PDFs ou pasta ────────────────────
    caminho_pdf, nome_base = resolver_inputs(args.inputs)

    # ── Diretório de saída ─────────────────────────────────────────────────────
    output_dir = args.output or os.path.join(
        "output",
        f"{nome_base}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    )
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.join(output_dir, "debug"), exist_ok=True)
    os.makedirs(os.path.join(output_dir, "fragmentos"), exist_ok=True)

    # ── Header ────────────────────────────────────────────────────────────────
    num_inputs = len(args.inputs)
    label_input = (
        os.path.basename(caminho_pdf) if num_inputs == 1
        else f"{num_inputs} arquivos unificados"
    )
    ctx_label = "sim" if (args.contexto or args.contexto_arquivo) else "não"
    print(f"""
╔══════════════════════════════════════════════════════╗
║          LASTRA INTELLIGENCE — Fase 0                ║
╚══════════════════════════════════════════════════════╝
  Input:      {label_input}
  Disciplina: {args.disciplina}
  Contexto:   {ctx_label}
  Output:     {output_dir}
  Modo:       {"Somente pré-IA" if args.sem_ia else "Pipeline completo"}
""")

    deps = verificar_dependencias()
    imprimir_status_deps(deps)

    # ── Importa módulos do projeto ─────────────────────────────────────────────
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from config import PDF_DPI
    from project_state import ProjectState
    from pre_ai import processar_pre_ai, extrair_metadados_pdf
    from ai_pipeline import processar_pipeline_ia
    from report import gerar_relatorio

    dpi = args.dpi or PDF_DPI

    # ── Inicializa state ───────────────────────────────────────────────────────
    # ── Resolve contexto da calculadora ──────────────────────────────────────
    contexto_calculadora = None

    if args.contexto_arquivo:
        try:
            with open(args.contexto_arquivo, encoding="utf-8") as f:
                contexto_calculadora = json.load(f)
            print(f"   📋 Contexto carregado de: {args.contexto_arquivo}")
        except Exception as e:
            print(f"⚠️  Erro ao ler contexto: {e}")

    elif args.contexto:
        try:
            contexto_calculadora = json.loads(args.contexto)
            print(f"   📋 Contexto carregado via argumento")
        except Exception as e:
            print(f"⚠️  JSON de contexto inválido: {e}")

    if contexto_calculadora:
        campos = [k for k, v in contexto_calculadora.items() if v is not None]
        print(f"   Campos: {', '.join(campos[:8])}{'...' if len(campos) > 8 else ''}")

    state = ProjectState(
        caminho_pdf=caminho_pdf,
        descricao_usuario=args.descricao,
        contexto_calculadora=contexto_calculadora,
        disciplina=args.disciplina
    )

    inicio = time.time()

    # ── Etapa 0: Metadados ─────────────────────────────────────────────────────
    print("📋 Extraindo metadados do PDF...")
    num_paginas = extrair_metadados_pdf(caminho_pdf, state)
    print(f"   {num_paginas} páginas detectadas")
    if state.software_origem:
        print(f"   Software: {state.software_origem}")

    # ── Etapa 1: Conversão para imagens ────────────────────────────────────────
    print(f"\n🖼️  Convertendo PDF em imagens ({dpi} DPI)...")
    imagens = converter_pdf_para_imagens(caminho_pdf, dpi)

    if not imagens:
        print("❌ Não foi possível converter o PDF em imagens")
        sys.exit(1)

    # Limita pranchas se solicitado
    if args.max_pranchas:
        imagens = imagens[:args.max_pranchas]
        print(f"   ⚠️  Limitado a {args.max_pranchas} pranchas (modo teste)")

    print(f"   {len(imagens)} imagens geradas")

    # ── Etapa 2: Pipeline pré-IA ───────────────────────────────────────────────
    print(f"\n🔍 Executando pipeline pré-IA em {len(imagens)} pranchas...")
    t0 = time.time()

    ordem_processamento = processar_pre_ai(
        caminho_pdf, imagens, state, output_dir
    )

    t_pre_ia = time.time() - t0
    print(f"   ✅ Concluído em {t_pre_ia:.1f}s")
    print(f"   {len(ordem_processamento)} pranchas para processar com IA")

    # Sumário pré-IA
    tipos = {}
    for i, p in state.pranchas.items():
        tipos[p.tipo_provavel] = tipos.get(p.tipo_provavel, 0) + 1
    print("\n   Classificação pré-IA:")
    for tipo, qtd in sorted(tipos.items(), key=lambda x: -x[1]):
        print(f"     {tipo}: {qtd}")

    if state.ambientes:
        print(f"\n   📐 Tabela de áreas extraída geometricamente:")
        print(f"      {len(state.ambientes)} ambientes, "
              f"total={state.area_total_m2 or 0:.1f}m²")

    # Salva state pré-IA
    state.salvar_json(os.path.join(output_dir, "state_pre_ia.json"))

    # ── Etapa 3: Pipeline de IA ────────────────────────────────────────────────
    resultado_final = {}

    if not args.sem_ia and ordem_processamento:
        apis_disponiveis = (
            deps.get("anthropic") and deps.get("google.generativeai")
        )

        if not apis_disponiveis:
            print("\n⚠️  APIs não disponíveis — pulando pipeline de IA")
            print("   Configure ANTHROPIC_API_KEY e GOOGLE_API_KEY para usar")
        else:
            print(f"\n🤖 Executando pipeline de IA...")
            t0 = time.time()

            resultado_final = processar_pipeline_ia(
                imagens, ordem_processamento, state, output_dir
            )

            t_ia = time.time() - t0
            print(f"   ✅ Concluído em {t_ia:.1f}s")
            print(f"   Custo: ${state.custo_total_usd:.4f} USD "
                  f"/ R$ {state.custo_total_usd * 5.70:.2f} "
                  f"/ {state.creditos_total:.0f} créditos Lastra")
    else:
        if args.sem_ia:
            print("\n⏭️  Pipeline de IA ignorado (--sem-ia)")
        else:
            print("\n⏭️  Nenhuma prancha para processar com IA")

    # ── Etapa 4: Salva resultados ──────────────────────────────────────────────
    print("\n💾 Salvando resultados...")

    state.salvar_json(os.path.join(output_dir, "state_final.json"))

    if resultado_final:
        with open(os.path.join(output_dir, "resultado_final.json"), "w",
                  encoding="utf-8") as f:
            json.dump(resultado_final, f, ensure_ascii=False, indent=2)

    # ── Etapa 5: Relatório HTML ────────────────────────────────────────────────
    print("\n📊 Gerando relatório HTML...")
    caminho_relatorio = gerar_relatorio(
        state, resultado_final, imagens, output_dir
    )

    # ── Sumário final ──────────────────────────────────────────────────────────
    tempo_total = time.time() - inicio

    print(f"""
╔══════════════════════════════════════════════════════╗
║                   CONCLUÍDO                          ║
╚══════════════════════════════════════════════════════╝

  ⏱️  Tempo total:     {tempo_total:.1f}s
  📄  Pranchas:        {len(state.pranchas)} total
  📦  Dados extraídos: {len(state.dados_extraidos)}
  🏠  Ambientes:       {len(state.ambientes)}
  🚪  Esquadrias:      {len(state.esquadrias)}
  ❌  Erros:           {len(state.erros)}

  💰  Custo API:       ${state.custo_total_usd:.4f} USD
                       R$ {state.custo_total_usd * 5.70:.2f}
                       {state.creditos_total:.0f} créditos Lastra

  📂  Saída:
      {output_dir}/
      ├── relatorio.html          ← ABRA ESTE
      ├── resultado_final.json
      ├── state_final.json
      ├── state_pre_ia.json
      ├── fragmentos/             ← imagens recortadas pela IA
      └── debug/                  ← pranchas anotadas pré-IA
""")


if __name__ == "__main__":
    main()
