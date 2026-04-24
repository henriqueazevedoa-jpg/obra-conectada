"""
Lastra Intelligence — Pipeline de IA
Gemini 2.5 Flash: bounding boxes com contexto pré-formado
Claude Sonnet:    interpretação e extração de dados estruturados
"""

import json
import logging
import base64
import re
from io import BytesIO
from typing import Optional
from PIL import Image

from project_state import ProjectState, InfoPrancha
from config import (
    ANTHROPIC_API_KEY, GOOGLE_API_KEY,
    CLAUDE_MODEL, GEMINI_MODEL,
    CONFIANCA_ALTA, CONFIANCA_MEDIA, CONFIANCA_BAIXA
)

log = logging.getLogger("ai_pipeline")


# ══════════════════════════════════════════════════════════════════════════════
# UTILITÁRIOS
# ══════════════════════════════════════════════════════════════════════════════

def imagem_para_base64(imagem: Image.Image, qualidade: int = 85) -> str:
    buf = BytesIO()
    imagem.save(buf, format="JPEG", quality=qualidade)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def recortar_fragmento(imagem: Image.Image, bbox_norm: list,
                        margem: float = 0.01) -> Image.Image:
    """
    Recorta fragmento a partir de bbox normalizado (0-1000).
    Adiciona margem para não cortar elementos nas bordas.
    """
    w, h = imagem.size
    y0 = max(0, int((bbox_norm[0] / 1000 - margem) * h))
    x0 = max(0, int((bbox_norm[1] / 1000 - margem) * w))
    y1 = min(h, int((bbox_norm[2] / 1000 + margem) * h))
    x1 = min(w, int((bbox_norm[3] / 1000 + margem) * w))
    return imagem.crop((x0, y0, x1, y1))


def parse_json_resposta(texto: str) -> Optional[dict]:
    """Extrai JSON da resposta do modelo, removendo markdown se necessário."""
    texto = re.sub(r"```json\s*", "", texto)
    texto = re.sub(r"```\s*", "", texto)
    texto = texto.strip()
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        # Tenta encontrar bloco JSON na resposta
        m = re.search(r"\{.*\}", texto, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        m = re.search(r"\[.*\]", texto, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
    return None


# ══════════════════════════════════════════════════════════════════════════════
# GEMINI — Bounding Boxes
# ══════════════════════════════════════════════════════════════════════════════

def gemini_bounding_boxes(imagem: Image.Image, num_prancha: int,
                           state: ProjectState) -> list[dict]:
    """
    Chama Gemini 2.5 Flash para detectar regiões visuais e retornar
    bounding boxes no formato nativo [y_min, x_min, y_max, x_max] 0-1000.

    Retorna lista de: {box_2d, label, tipo, escala_visual, confianca}
    """
    if not GOOGLE_API_KEY:
        log.warning("GOOGLE_API_KEY não configurada — pulando Gemini")
        return []

    try:
        import google.generativeai as genai
        genai.configure(api_key=GOOGLE_API_KEY)
        modelo = genai.GenerativeModel(GEMINI_MODEL)

        contexto = state.resumo_para_gemini(num_prancha)
        img_b64  = imagem_para_base64(imagem)

        prompt = f"""{contexto}

TAREFA:
Você está analisando uma prancha de projeto arquitetônico residencial brasileiro.
Identifique TODAS as regiões visuais distintas presentes nesta prancha.

Para cada região, retorne um objeto com:
- "box_2d": [y_min, x_min, y_max, x_max] coordenadas normalizadas 0-1000
- "label": descrição específica da região (ex: "Planta Baixa Pavimento Térreo")
- "tipo": um dos tipos abaixo
- "escala_visual": escala detectada visualmente (ex: "1:50") ou null
- "confianca": 0.0 a 1.0

TIPOS VÁLIDOS:
  planta_baixa | corte_longitudinal | corte_transversal | elevacao_fachada |
  implantacao | tabela_esquadrias | tabela_areas | tabela_acabamentos |
  tabela_revisoes | carimbo | legenda | memorial_descritivo | detalhe_construtivo |
  planta_cobertura | planta_estrutural | outro

REGRAS:
- Retorne APENAS um array JSON válido, sem texto adicional
- Limite de 20 regiões por prancha
- Se a descrição do usuário não bater com o conteúdo real, identifique o que
  realmente está presente (não force a classificação)
- Pule regiões menores que 3% da área total da prancha
- Não desative o thinking para esta tarefa
"""

        resposta = modelo.generate_content(
            [prompt, {"mime_type": "image/jpeg", "data": img_b64}],
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=2000,
            )
        )

        # Rastreia custo
        if hasattr(resposta, "usage_metadata"):
            state.registrar_custo(
                provedor="google",
                modelo=GEMINI_MODEL,
                tokens_input=resposta.usage_metadata.prompt_token_count or 0,
                tokens_output=resposta.usage_metadata.candidates_token_count or 0,
                operacao=f"bounding_boxes_prancha_{num_prancha}"
            )

        texto_resposta = resposta.text
        resultado = parse_json_resposta(texto_resposta)

        if isinstance(resultado, list):
            log.info(f"Gemini prancha {num_prancha}: "
                     f"{len(resultado)} regiões detectadas")
            return resultado
        else:
            log.warning(f"Gemini retornou formato inesperado para prancha {num_prancha}")
            return []

    except Exception as e:
        log.error(f"Erro Gemini prancha {num_prancha}: {e}")
        return []


# ══════════════════════════════════════════════════════════════════════════════
# CLAUDE — Interpretação por tipo de fragmento
# ══════════════════════════════════════════════════════════════════════════════

PROMPTS_POR_TIPO = {

    "tabela_esquadrias": """
Extraia TODOS os itens desta tabela de esquadrias.
Preserve a terminologia exata do projeto (não normalize materiais ou acabamentos).

Retorne JSON com esta estrutura:
{
  "tipo_tabela": "tabela_esquadrias",
  "itens": [
    {
      "codigo": "P01",
      "tipo": "porta|janela|portao|basculante|outro",
      "largura_m": 0.90,
      "altura_m": 2.10,
      "material": "madeira angelim",
      "acabamento": "verniz natural",
      "quantidade": 3,
      "observacoes": ""
    }
  ],
  "total_itens": 15,
  "confianca_geral": 0.92
}

Se algum campo não estiver presente na tabela, use null (não invente valores).
""",

    "tabela_areas": """
Extraia todas as áreas da tabela.

Retorne JSON:
{
  "tipo_tabela": "tabela_areas",
  "pavimentos": [
    {
      "nome": "Pavimento Térreo",
      "ambientes": [
        {"nome": "Sala de Estar", "area_m2": 32.5},
        {"nome": "Cozinha", "area_m2": 18.0}
      ],
      "area_total_pavimento": 180.5
    }
  ],
  "area_construida_total": 487.2,
  "area_terreno": null,
  "confianca_geral": 0.95
}
""",

    "tabela_acabamentos": """
Extraia a tabela de acabamentos por ambiente.

Retorne JSON:
{
  "tipo_tabela": "tabela_acabamentos",
  "ambientes": [
    {
      "nome": "Sala de Estar",
      "piso": {"material": "porcelanato 60x60", "referencia": "Portobello Stone Areia", "cor": "bege"},
      "parede": {"material": "tinta acrílica", "referencia": "Suvinil", "cor": "branco neve"},
      "teto": {"material": "gesso liso", "referencia": null, "cor": "branco"}
    }
  ],
  "confianca_geral": 0.88
}
""",

    "carimbo": """
Extraia todos os dados do carimbo do projeto.

Retorne JSON:
{
  "tipo": "carimbo",
  "nome_projeto": "Residência...",
  "responsavel_tecnico": "Arq. João Silva",
  "cau_crea": "CAU A-12345-6",
  "numero_art": "2026012345",
  "data_projeto": "03/2026",
  "revisao": "02",
  "escala": "1:50",
  "numero_prancha": "A-03",
  "descricao_prancha": "Planta Baixa Pavimento Térreo",
  "nome_arquivo": null,
  "confianca_geral": 0.93
}
""",

    "planta_baixa": """
Analise esta planta baixa arquitetônica.

Retorne JSON:
{
  "tipo": "planta_baixa",
  "pavimento": "Pavimento Térreo",
  "escala_detectada": "1:50",
  "ambientes": [
    {
      "nome": "Sala de Estar",
      "dimensoes_aproximadas": {"largura_m": 5.5, "comprimento_m": 6.0},
      "area_estimada_m2": 33.0,
      "tem_janela": true,
      "num_portas": 2,
      "observacoes": ""
    }
  ],
  "elementos_especiais": ["escada", "elevador", "garagem"],
  "num_banheiros": 2,
  "num_suites": 1,
  "confianca_geral": 0.75,
  "observacoes": "Cotas parcialmente legíveis na região norte"
}

IMPORTANTE: Não invente dimensões. Se uma cota não estiver legível, use null.
""",

    "corte_longitudinal": """
Analise este corte arquitetônico.

Retorne JSON:
{
  "tipo": "corte",
  "identificacao": "Corte AA",
  "escala_detectada": "1:50",
  "pavimentos": [
    {
      "nome": "Pavimento Térreo",
      "pe_direito_m": 2.80,
      "nivel_m": 0.00
    },
    {
      "nome": "1º Pavimento",
      "pe_direito_m": 2.80,
      "nivel_m": 3.10
    }
  ],
  "altura_total_m": 9.5,
  "sistema_estrutural_visivel": "concreto armado|alvenaria|misto|indeterminado",
  "confianca_geral": 0.80
}
""",

    "implantacao": """
Analise a planta de implantação/locação.

Retorne JSON:
{
  "tipo": "implantacao",
  "area_terreno_m2": 450.0,
  "area_construida_m2": 280.0,
  "taxa_ocupacao": 0.42,
  "afastamentos": {
    "frontal_m": 5.0,
    "lateral_esq_m": 1.5,
    "lateral_dir_m": 1.5,
    "fundos_m": 3.0
  },
  "orientacao_norte": "indicada|ausente",
  "confianca_geral": 0.70
}
""",

    "outro": """
Descreva o que está presente nesta prancha/região do projeto arquitetônico.

Retorne JSON:
{
  "tipo": "outro",
  "descricao": "descrição do conteúdo",
  "dados_relevantes": {},
  "confianca_geral": 0.60
}
"""
}


def sonnet_interpretar_fragmento(fragmento: Image.Image, tipo: str,
                                  num_prancha: int, label: str,
                                  state: ProjectState) -> Optional[dict]:
    """
    Interpreta um fragmento de imagem com Claude Sonnet.
    Usa prompt especializado por tipo + contexto acumulado do state.
    """
    if not ANTHROPIC_API_KEY:
        log.warning("ANTHROPIC_API_KEY não configurada — pulando Claude")
        return None

    try:
        import anthropic
        cliente = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        contexto  = state.resumo_para_sonnet(tipo)
        prompt_tipo = PROMPTS_POR_TIPO.get(tipo, PROMPTS_POR_TIPO["outro"])
        img_b64   = imagem_para_base64(fragmento, qualidade=90)

        mensagem = cliente.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2000,
            system=f"""Você é um especialista em análise de projetos arquitetônicos 
brasileiros. Extrai dados estruturados de imagens de pranchas de projeto.
Retorne APENAS JSON válido, sem texto adicional, sem markdown.
Seja preciso: não invente dados que não estão visíveis na imagem.""",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": img_b64
                        }
                    },
                    {
                        "type": "text",
                        "text": f"{contexto}\n\nFRAGMENTO: {label} (tipo: {tipo})\n\n{prompt_tipo}"
                    }
                ]
            }]
        )

        # Rastreia custo
        state.registrar_custo(
            provedor="anthropic",
            modelo=CLAUDE_MODEL,
            tokens_input=mensagem.usage.input_tokens,
            tokens_output=mensagem.usage.output_tokens,
            operacao=f"interpretacao_{tipo}_prancha_{num_prancha}"
        )

        resultado = parse_json_resposta(mensagem.content[0].text)
        if resultado:
            log.info(f"Sonnet prancha {num_prancha} ({tipo}): "
                     f"confiança={resultado.get('confianca_geral', '?')}")
            return resultado
        else:
            log.warning(f"Sonnet retornou JSON inválido para prancha {num_prancha}/{tipo}")
            return None

    except Exception as e:
        log.error(f"Erro Claude prancha {num_prancha}/{tipo}: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# CONSOLIDAÇÃO FINAL
# ══════════════════════════════════════════════════════════════════════════════

def sonnet_consolidar(state: ProjectState) -> dict:
    """
    Consolidação final: cruza todas as informações, resolve contradições,
    gera o JSON final do projeto com confiança por campo.
    """
    if not ANTHROPIC_API_KEY:
        log.warning("ANTHROPIC_API_KEY não configurada — consolidação pulada")
        return {}

    try:
        import anthropic
        cliente = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        # Monta corpus de dados extraídos
        dados_por_tipo = {}
        for dado in state.dados_extraidos:
            if dado.tipo not in dados_por_tipo:
                dados_por_tipo[dado.tipo] = []
            dados_por_tipo[dado.tipo].append({
                "valor":    dado.valor,
                "confianca": dado.confianca,
                "prancha":  dado.prancha_origem,
                "fonte":    dado.fonte
            })

        corpus = json.dumps(dados_por_tipo, ensure_ascii=False, indent=2)

        # Limita tamanho do corpus para não explodir o contexto
        if len(corpus) > 40000:
            log.warning("Corpus muito grande — truncando para consolidação")
            corpus = corpus[:40000] + "\n... [truncado]"

        prompt = f"""Você recebeu dados extraídos de múltiplas pranchas de um projeto 
arquitetônico. Consolide tudo em um JSON final limpo.

METADADOS IDENTIFICADOS:
{json.dumps(state.to_dict()['metadados_projeto'], ensure_ascii=False, indent=2)}

DADOS EXTRAÍDOS POR TIPO:
{corpus}

TAREFA:
1. Para cada tipo de dado, consolide os valores de múltiplas fontes.
   - Quando há concordância: use o valor com maior confiança
   - Quando há divergência > 5%: liste ambos com flag "divergencia": true
   - Dados "pre_ai" (extração geométrica) têm prioridade sobre inferência

2. Para dados ausentes que você pode inferir com alta confiança (ex: área de
   ambiente que aparece cotado mas não na tabela), inclua com "inferido": true

3. Retorne JSON com esta estrutura:
{{
  "projeto": {{
    "nome": "...",
    "responsavel": "...",
    "cau_crea": "...",
    "art": "...",
    "data": "...",
    "escala_padrao": "...",
    "tipologia": "residencial_unifamiliar|residencial_multifamiliar|comercial|industrial|outro",
    "num_pavimentos": 4,
    "area_total_m2": 487.2
  }},
  "orcamento": {{
    "areas": [
      {{"ambiente": "...", "area_m2": 32.5, "pavimento": "...", 
        "confianca": 0.95, "fonte": "tabela_areas", "inferido": false}}
    ],
    "esquadrias": [...],
    "acabamentos": [...]
  }},
  "contratos": {{
    "responsavel_tecnico": "...",
    "cau_crea": "...",
    "numero_art": "...",
    "data_projeto": "..."
  }},
  "cronograma": {{
    "tipologia_detectada": "...",
    "num_pavimentos": 4,
    "area_por_pavimento": [...]
  }},
  "inconsistencias": [
    {{"campo": "area_sala", "valor_a": 32.5, "valor_b": 34.0, 
      "fonte_a": "tabela_areas", "fonte_b": "planta_baixa"}}
  ],
  "confianca_geral": 0.87,
  "campos_ausentes": ["area_terreno", "orientacao_solar"]
}}

Retorne APENAS o JSON, sem texto adicional."""

        mensagem = cliente.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        state.registrar_custo(
            provedor="anthropic",
            modelo=CLAUDE_MODEL,
            tokens_input=mensagem.usage.input_tokens,
            tokens_output=mensagem.usage.output_tokens,
            operacao="consolidacao_final"
        )

        resultado = parse_json_resposta(mensagem.content[0].text)
        if resultado:
            log.info(f"Consolidação concluída: "
                     f"confiança={resultado.get('confianca_geral', '?')}, "
                     f"inconsistências={len(resultado.get('inconsistencias', []))}")
            return resultado
        else:
            log.warning("Consolidação retornou JSON inválido")
            return {}

    except Exception as e:
        log.error(f"Erro na consolidação: {e}")
        return {}


# ══════════════════════════════════════════════════════════════════════════════
# ORQUESTRADOR DO PIPELINE DE IA
# ══════════════════════════════════════════════════════════════════════════════

def processar_pipeline_ia(imagens: list[Image.Image],
                           ordem_processamento: list[int],
                           state: ProjectState,
                           output_dir: str) -> dict:
    """
    Executa as fases de IA em ordem de prioridade.
    Fase 1: pranchas textuais (tabelas, carimbo) — alimentam o state
    Fase 2: pranchas visuais (plantas, cortes) — leem o state rico
    """
    import os

    # Separa fases
    pranchas_fase1 = []
    pranchas_fase2 = []

    tipos_fase1 = {
        "tabela_ou_detalhe", "tabela_areas", "tabela_esquadrias",
        "tabela_acabamentos", "tabela_desconhecida",
        "tabela_areas_sem_cabecalho", "tabela_revisoes"
    }

    for i in ordem_processamento:
        prancha = state.pranchas[i]
        # Se já tem tabela geométrica extraída, ainda processa
        # para confirmar/complementar com visão
        if prancha.tipo_provavel in tipos_fase1 or prancha.tem_carimbo:
            pranchas_fase1.append(i)
        else:
            pranchas_fase2.append(i)

    log.info(f"Fase 1: {len(pranchas_fase1)} pranchas textuais")
    log.info(f"Fase 2: {len(pranchas_fase2)} pranchas visuais")

    todos_fragmentos = []

    # ── FASE 1 ────────────────────────────────────────────────────────────────
    for i in pranchas_fase1:
        log.info(f"Fase 1 — processando prancha {i}...")
        fragmentos = _processar_prancha(imagens[i], i, state, output_dir)
        todos_fragmentos.extend(fragmentos)
        state.pranchas_processadas_fase1.append(i)

    log.info(f"Fase 1 concluída. State: {len(state.ambientes)} ambientes, "
             f"{len(state.esquadrias)} esquadrias")

    # ── FASE 2 ────────────────────────────────────────────────────────────────
    for i in pranchas_fase2:
        log.info(f"Fase 2 — processando prancha {i}...")
        fragmentos = _processar_prancha(imagens[i], i, state, output_dir)
        todos_fragmentos.extend(fragmentos)
        state.pranchas_processadas_fase2.append(i)

    # ── CONSOLIDAÇÃO ──────────────────────────────────────────────────────────
    log.info("Iniciando consolidação final...")
    resultado_final = sonnet_consolidar(state)

    # Salva fragmentos como JSON de debug
    if output_dir:
        caminho = os.path.join(output_dir, "fragmentos_extraidos.json")
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(todos_fragmentos, f, ensure_ascii=False, indent=2)

    return resultado_final


def _processar_prancha(imagem: Image.Image, num: int,
                        state: ProjectState, output_dir: str) -> list[dict]:
    """Processa uma prancha: Gemini bboxes → recorte → Sonnet por fragmento."""
    import os

    fragmentos_resultado = []

    # Gemini detecta regiões
    bboxes = gemini_bounding_boxes(imagem, num, state)

    if not bboxes:
        log.info(f"Prancha {num}: sem bboxes do Gemini — pulando")
        return []

    for bbox_info in bboxes:
        tipo  = bbox_info.get("tipo", "outro")
        label = bbox_info.get("label", f"região_{tipo}")
        box   = bbox_info.get("box_2d", [0, 0, 1000, 1000])
        conf_gemini = float(bbox_info.get("confianca", 0.7))

        # Recorta fragmento
        try:
            fragmento = recortar_fragmento(imagem, box)
        except Exception as e:
            log.debug(f"Erro ao recortar prancha {num}/{tipo}: {e}")
            continue

        # Salva fragmento para debug
        if output_dir and hasattr(state, '_salvar_debug') or True:
            _salvar_fragmento_debug(fragmento, num, tipo, label, output_dir)

        # Sonnet interpreta
        resultado = sonnet_interpretar_fragmento(
            fragmento, tipo, num, label, state
        )

        if resultado:
            confianca_final = (
                conf_gemini * 0.3 + 
                float(resultado.get("confianca_geral", 0.7)) * 0.7
            )

            fragmento_data = {
                "prancha":   num,
                "tipo":      tipo,
                "label":     label,
                "bbox":      box,
                "confianca": round(confianca_final, 3),
                "dados":     resultado
            }
            fragmentos_resultado.append(fragmento_data)

            # Atualiza state com dados extraídos
            _atualizar_state(resultado, tipo, num, confianca_final, state)

    return fragmentos_resultado


def _atualizar_state(resultado: dict, tipo: str, num_prancha: int,
                      confianca: float, state: ProjectState):
    """Popula o ProjectState com os dados extraídos pelo Sonnet."""
    prancha_id = f"prancha_{num_prancha}"

    if tipo == "carimbo":
        if resultado.get("nome_projeto") and not state.nome_projeto:
            state.nome_projeto = resultado["nome_projeto"]
        if resultado.get("responsavel_tecnico") and not state.responsavel_tecnico:
            state.responsavel_tecnico = resultado["responsavel_tecnico"]
        if resultado.get("cau_crea") and not state.cau_crea:
            state.cau_crea = resultado["cau_crea"]
        if resultado.get("data_projeto") and not state.data_projeto:
            state.data_projeto = resultado["data_projeto"]
        if resultado.get("escala") and not state.escala_padrao:
            state.escala_padrao = resultado["escala"]
        if resultado.get("numero_art"):
            state.adicionar_dado(
                "contratos", "art",
                {"numero_art": resultado["numero_art"]},
                confianca, prancha_id, "sonnet"
            )

    elif tipo == "tabela_areas":
        pavimentos = resultado.get("pavimentos", [])
        for pav in pavimentos:
            for amb in pav.get("ambientes", []):
                if amb.get("nome") and amb.get("area_m2"):
                    state.ambientes.append({
                        "nome":      amb["nome"],
                        "area_m2":   amb["area_m2"],
                        "pavimento": pav.get("nome", "?"),
                        "fonte":     "sonnet"
                    })
        if resultado.get("area_construida_total"):
            state.area_total_m2 = resultado["area_construida_total"]

        state.adicionar_dado(
            "orcamento", "tabela_areas", resultado,
            confianca, prancha_id, "sonnet"
        )

    elif tipo == "tabela_esquadrias":
        itens = resultado.get("itens", [])
        state.esquadrias.extend(itens)
        state.adicionar_dado(
            "orcamento", "tabela_esquadrias", resultado,
            confianca, prancha_id, "sonnet"
        )

    elif tipo == "tabela_acabamentos":
        state.acabamentos.extend(resultado.get("ambientes", []))
        state.adicionar_dado(
            "orcamento", "tabela_acabamentos", resultado,
            confianca, prancha_id, "sonnet"
        )

    elif tipo == "planta_baixa":
        ambientes = resultado.get("ambientes", [])
        pavimento = resultado.get("pavimento", "não identificado")
        for amb in ambientes:
            if amb.get("nome") and amb.get("area_estimada_m2"):
                # Só adiciona se não existe na tabela de áreas (mais confiável)
                nomes_existentes = {a["nome"].lower() for a in state.ambientes}
                if amb["nome"].lower() not in nomes_existentes:
                    state.ambientes.append({
                        "nome":      amb["nome"],
                        "area_m2":   amb["area_estimada_m2"],
                        "pavimento": pavimento,
                        "fonte":     "sonnet_planta",
                        "inferido":  True
                    })
        # Infere número de pavimentos
        if resultado.get("pavimento") and not state.num_pavimentos:
            _inferir_pavimentos(resultado["pavimento"], state)

        state.adicionar_dado(
            "cronograma", "planta_baixa", resultado,
            confianca, prancha_id, "sonnet"
        )

    elif tipo in ("corte_longitudinal", "corte_transversal"):
        state.adicionar_dado(
            "orcamento", "corte", resultado,
            confianca, prancha_id, "sonnet"
        )

    elif tipo == "implantacao":
        if resultado.get("area_terreno_m2"):
            state.adicionar_dado(
                "orcamento", "area_terreno",
                {"area_m2": resultado["area_terreno_m2"]},
                confianca, prancha_id, "sonnet"
            )


def _inferir_pavimentos(nome_pavimento: str, state: ProjectState):
    """Infere número de pavimentos pelo nome do pavimento."""
    nome = nome_pavimento.lower()
    mapa = {
        "terreo": 1, "térreo": 1,
        "1º": 2, "primeiro": 2,
        "2º": 3, "segundo": 3,
        "3º": 4, "terceiro": 4,
        "4º": 5, "quarto": 5,
        "cobertura": None,  # não conta como pavimento
    }
    for chave, num in mapa.items():
        if chave in nome and num:
            state.num_pavimentos = max(state.num_pavimentos or 0, num)


def _salvar_fragmento_debug(fragmento: Image.Image, num: int, tipo: str,
                              label: str, output_dir: str):
    """Salva fragmento recortado para inspeção visual."""
    import os
    try:
        dir_frag = os.path.join(output_dir, "fragmentos")
        os.makedirs(dir_frag, exist_ok=True)
        nome = f"p{num:02d}_{tipo}_{label[:20].replace(' ', '_')}.jpg"
        fragmento.save(os.path.join(dir_frag, nome), quality=85)
    except Exception:
        pass
