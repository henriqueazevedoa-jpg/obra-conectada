import logging
import traceback    
logging.getLogger("pymupdf").setLevel(logging.ERROR)
import urllib.request
try:
    urllib.request.urlopen('https://api.anthropic.com', timeout=5)
    print("CONECTIVIDADE OK: api.anthropic.com acessível")
except Exception as e:
    print(f"Erro na fase de Classificação e Embedding: {type(e).__name__}: {e}")

try:
    urllib.request.urlopen('https://generativelanguage.googleapis.com', timeout=5)
    print("CONECTIVIDADE OK: generativelanguage.googleapis.com acessível")
except Exception as e:
    print(f"Erro na fase de Classificação e Embedding: {type(e).__name__}: {e}")

import os
import time
import json
import io
import fitz  # PyMuPDF
import pdfplumber
import re
from datetime import datetime, timedelta, timezone
from google import genai
from google.genai import types
from google.genai.types import HttpOptions
from supabase import create_client, Client
from dotenv import load_dotenv
from anthropic import Anthropic
from consolidador import consolidar_obra

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY").strip() if os.environ.get("ANTHROPIC_API_KEY") else None
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY").strip() if os.environ.get("OPENAI_API_KEY") else None
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY").strip() if os.environ.get("GEMINI_API_KEY") else None

PRECO_CLAUDE_SONNET_INPUT_PER_M = 3.00
PRECO_CLAUDE_SONNET_OUTPUT_PER_M = 15.00
PRECO_GEMINI_FLASH_INPUT_PER_M = 0.075
PRECO_GEMINI_FLASH_OUTPUT_PER_M = 0.30
PRECO_GEMINI_EMBEDDING_PER_M = 0.0
PRECO_OPENAI_WHISPER_PER_MIN = 0.006

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERRO: Variáveis de ambiente do Supabase não configuradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print(f"ANTHROPIC_API_KEY presente: {bool(ANTHROPIC_API_KEY)}")
if ANTHROPIC_API_KEY:
    print(f"ANTHROPIC_API_KEY prefixo: {str(ANTHROPIC_API_KEY)[:10]}...")
anthropic = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

gemini_client = genai.Client(api_key=GEMINI_API_KEY, http_options=HttpOptions(api_version="v1")) if GEMINI_API_KEY else None

def registrar_custo(arquivo_id, obra_id, company_id, fase, modelo, tokens_entrada=0, tokens_saida=0, unidades=0, custo_usd=0.0):
    try:
        supabase.table("processamento_custos").insert({
            "arquivo_id": arquivo_id,
            "obra_id": obra_id,
            "company_id": company_id,
            "fase": fase,
            "modelo": modelo,
            "tokens_entrada": tokens_entrada,
            "tokens_saida": tokens_saida,
            "unidades": unidades,
            "custo_usd": custo_usd
        }).execute()
    except Exception as e:
        print(f"[{arquivo_id}] Aviso: falha ao registrar custo ({fase}): {e}")

def send_push_notification(user_id: str, titulo: str, corpo: str):
    """Dispara a Edge Function de push notifications"""
    try:
        supabase.functions.invoke(
            "send-push",
            invoke_options={
                "body": {
                    "user_id": user_id,
                    "titulo": titulo,
                    "corpo": corpo,
                    "tipo": "inteligencia_concluida"
                }
            }
        )
    except Exception as e:
        print(f"Aviso: Falha ao enviar notificação push: {e}")

def processar_pdf(arquivo: dict):
    arquivo_id = arquivo['id']
    storage_path = arquivo['storage_path']
    obra_id = arquivo['obra_id']
    company_id = arquivo['company_id']
    user_id = arquivo.get('user_id')
    
    tentativas_ext = arquivo.get('tentativas_extracao', 0)
    if tentativas_ext >= 3:
        print(f"[{arquivo_id}] Máximo de tentativas de extração atingido. Marcando como erro.")
        supabase.table("projeto_arquivos").update({"status": "erro", "erro_mensagem": "Máximo de tentativas de extração atingido — PDF possivelmente corrompido ou muito pesado"}).eq("id", arquivo_id).execute()
        return

    supabase.table("projeto_arquivos").update({"tentativas_extracao": tentativas_ext + 1}).eq("id", arquivo_id).execute()
    
    print(f"\n[{arquivo_id}] Iniciando processamento de: {storage_path}")
    
    try:
        # 1. Atualizar para 'processando'
        supabase.table("projeto_arquivos").update({
            "status": "processando",
            "erro_mensagem": None
        }).eq("id", arquivo_id).execute()
        
        # 2. Baixar PDF
        print(f"[{arquivo_id}] Baixando PDF...")
        res = supabase.storage.from_("projetos").download(storage_path)
        pdf_bytes = res
        
        # 3. Inicializar PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_paginas = len(doc)
        
        supabase.table("projeto_arquivos").update({
            "total_paginas": total_paginas
        }).eq("id", arquivo_id).execute()
        
        print(f"[{arquivo_id}] Total de páginas: {total_paginas}")
        
        paginas_sucesso = 0
        
        # 4. Extração página por página
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf_p:
            for numero_pagina in range(total_paginas):
                try:
                    # PyMuPDF: Extrair texto
                    page_fitz = doc.load_page(numero_pagina)
                    dict_text = page_fitz.get_text("dict")
                    
                    texto_extraido = ""
                    for block in dict_text.get("blocks", []):
                        if "lines" in block:
                            for line in block["lines"]:
                                for span in line["spans"]:
                                    texto_extraido += span["text"] + " "
                                texto_extraido += "\n"
                            texto_extraido += "\n"
                            
                    texto_extraido = texto_extraido.strip()
                    tem_texto = len(texto_extraido) > 50
                    
                    # pdfplumber: Extrair tabelas
                    page_plumb = pdf_p.pages[numero_pagina]
                    tabelas = page_plumb.extract_tables()
                    tem_tabelas = len(tabelas) > 0
                    tabelas_json = json.dumps(tabelas) if tem_tabelas else None
                    
                    # Salvar no DB
                    supabase.table("projeto_paginas_raw").insert({
                        "arquivo_id": arquivo_id,
                        "obra_id": obra_id,
                        "company_id": company_id,
                        "numero_pagina": numero_pagina + 1,
                        "texto_extraido": texto_extraido,
                        "tabelas_json": tabelas_json,
                        "tem_texto": tem_texto,
                        "tem_tabelas": tem_tabelas
                    }).execute()
                    
                    paginas_sucesso += 1
                    
                    # Atualiza o status parcial no master
                    supabase.table("projeto_arquivos").update({
                        "paginas_processadas": paginas_sucesso
                    }).eq("id", arquivo_id).execute()
                    
                    print(f"[{arquivo_id}] Página {numero_pagina+1}/{total_paginas} processada.")
                    
                except Exception as e_page:
                    print(f"[{arquivo_id}] Falha ao processar a página {numero_pagina+1}: {e_page}")
        
        # 5. Finalizar com sucesso
        supabase.table("projeto_arquivos").update({
            "status": "concluido",
            "paginas_processadas": paginas_sucesso
            # classificado permanecerá false, indicando para o próximo step
        }).eq("id", arquivo_id).execute()
        
        print(f"[{arquivo_id}] Extração bruta concluída. Arquivo enfileirado para Classificação.")
        
    except Exception as e:
        erro_msg = str(e)
        print(f"[{arquivo_id}] ERRO FATAL: {erro_msg}")
        try:
            supabase.table("projeto_arquivos").update({
                "status": "erro",
                "erro_mensagem": erro_msg
            }).eq("id", arquivo_id).execute()
        except:
            pass

def limpar_ruido_para_embedding(texto: str) -> str:
    """Remove sequências numéricas (cotas puras) sem contexto textual"""
    # Remove sequências de números separados por espaço "1 2 3 4 5..."
    texto_limpo = re.sub(r'(\d+\s+){5,}', ' ', texto)
    # Condensar múltiplos espaços ou quebras vazias
    texto_limpo = re.sub(r'\n+', '\n', texto_limpo)
    texto_limpo = re.sub(r'\s{2,}', ' ', texto_limpo)
    return texto_limpo.strip()

def montar_prompt_fase2(disciplina, texto_completo):
    if disciplina == "estrutural":
        system = "Você é um engenheiro estrutural especialista em projetos de concreto armado brasileiros."
        instrucao = """Analise esta prancha estrutural e extraia TODAS as informações técnicas presentes.
Retorne JSON com:
{
  "pilares": [{"id": "", "secao_cm": "", "nivel_m": 0.0, "status": "ativo|morre|muda_secao"}],
  "vigas": [{"id": "", "secao_cm": "", "nivel_m": 0.0}],
  "lajes": [{"tipo": "", "altura_cm": 0, "area_m2": 0.0}],
  "armacoes": [{"elemento": "", "aco": "CA50|CA60", "diametro_mm": 0.0, "quantidade": 0, "comprimento_cm": 0, "peso_kg": 0.0}],
  "concreto_fck_mpa": 0,
  "volume_concreto_m3": 0.0,
  "area_forma_m2": 0.0,
  "normas_referencia": [],
  "notas_construtivas": [],
  "cobrimentos_cm": {},
  "carregamentos": {}
}"""
    elif disciplina == "arquitetonico":
        system = "Você é um arquiteto especialista em projetos residenciais e comerciais brasileiros."
        instrucao = """Analise esta prancha arquitetônica e extraia TODAS as informações técnicas presentes.
Retorne JSON com:
{
  "ambientes": [{"nome": "", "area_m2": 0.0}],
  "pavimento": "",
  "escala": "",
  "cotas_principais": [],
  "areas_totais": {},
  "cortes_referenciados": [],
  "esquadrias": [{"tipo": "", "codigo": "", "dimensoes": ""}]
}"""
    elif disciplina == "hidraulico":
        system = "Você é um engenheiro hidrossanitário especialista em projetos brasileiros."
        instrucao = """Analise esta prancha hidrossanitária e extraia TODAS as informações técnicas presentes.
Retorne JSON com:
{
  "tubulacoes": [{"tipo": "esgoto|agua_fria|agua_quente|pluvial", "diametro_mm": 0, "material": ""}],
  "pontos_esgoto": 0,
  "pontos_agua": 0,
  "caixas_inspecao": 0,
  "caixas_gordura": 0,
  "reservatorios": [{"tipo": "", "volume_litros": 0}],
  "pavimento": "",
  "notas": []
}"""
    elif disciplina == "eletrico":
        system = "Você é um engenheiro eletricista especialista em projetos brasileiros."
        instrucao = """Analise esta prancha elétrica e extraia TODAS as informações técnicas presentes.
Retorne JSON com:
{
  "circuitos": [{"id": "", "descricao": "", "potencia_w": 0}],
  "quadros_distribuicao": [{"id": "", "pavimento": ""}],
  "pontos_tomada": 0,
  "pontos_iluminacao": 0,
  "pavimento": "",
  "carga_instalada_kva": 0.0,
  "notas": []
}"""
    else:
        system = "Você é um especialista em projetos de construção civil brasileiros."
        instrucao = """Analise esta prancha e extraia TODAS as informações técnicas presentes.
Retorne JSON com:
{
  "elementos": [{"nome": "", "valor": ""}],
  "medidas": [],
  "especificacoes": [],
  "observacoes": []
}"""
    return system, instrucao

def extrair_entidades_fase2(disciplina, texto_completo, arquivo_id, obra_id, company_id):
    try:
        if not anthropic:
            return {}
        system_f2, instrucao_f2 = montar_prompt_fase2(disciplina, texto_completo)
        resposta_f2 = anthropic.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=2000,
            temperature=0.0,
            system=system_f2,
            messages=[{
                "role": "user",
                "content": f"{instrucao_f2}\n\nTexto completo da prancha:\n{texto_completo}"
            }]
        )
        
        tokens_entrada_f2 = resposta_f2.usage.input_tokens
        tokens_saida_f2 = resposta_f2.usage.output_tokens
        custo_f2 = (tokens_entrada_f2 * PRECO_CLAUDE_SONNET_INPUT_PER_M + tokens_saida_f2 * PRECO_CLAUDE_SONNET_OUTPUT_PER_M) / 1_000_000
        registrar_custo(arquivo_id, obra_id, company_id, "extracao_claude", "claude-sonnet-4-5", tokens_entrada_f2, tokens_saida_f2, 0, custo_f2)

        text_f2 = resposta_f2.content[0].text.replace("```json", "").replace("```", "").strip()
        return json.loads(text_f2)
    except Exception as e:
        print(f"Fase 2 falhou (não bloqueante): {e}")
        return {}

def classificar_e_indexar(arquivo: dict):
    arquivo_id = arquivo['id']
    obra_id = arquivo['obra_id']
    company_id = arquivo['company_id']
    user_id = arquivo.get('user_id')
    nome_original = arquivo.get('nome_original', 'Documento')

    if not anthropic or not GEMINI_API_KEY:
        print(f"[{arquivo_id}] ERRO: API Keys do Anthropic/Gemini não estão configuradas. Pulando classificação.")
        time.sleep(30)
        return

    tentativas = arquivo.get('tentativas_classificacao', 0)
    if tentativas >= 3:
        print(f"[{arquivo_id}] Máximo de tentativas atingido. Marcando como erro.")
        supabase.table("projeto_arquivos").update({"classificado": True, "erro_mensagem": "Máximo de tentativas de classificação atingido"}).eq("id", arquivo_id).execute()
        return
        
    supabase.table("projeto_arquivos").update({"tentativas_classificacao": tentativas + 1, "ultima_tentativa_em": datetime.utcnow().isoformat()}).eq("id", arquivo_id).execute()

    print(f"\n[{arquivo_id}] Iniciando Classificação e Embeddings...")
    
    try:
        # 1. Buscar páginas raw com texto > 50 chars
        res = supabase.table("projeto_paginas_raw").select("id, numero_pagina, texto_extraido").eq("arquivo_id", arquivo_id).eq("tem_texto", True).execute()
        paginas_raw = res.data

        if not paginas_raw:
            print(f"[{arquivo_id}] Nenhuma página raw legível encontrada.")
            supabase.table("projeto_arquivos").update({"classificado": True}).eq("id", arquivo_id).execute()
            return

        paginas_raw = sorted(paginas_raw, key=lambda x: x['numero_pagina'])
        chunks_criados = 0

        # Lotes de 20 páginas
        batch_size = 20
        for i in range(0, len(paginas_raw), batch_size):
            lote = paginas_raw[i:i + batch_size]
            
            prompt_paginas = ""
            for p in lote:
                # Pegar até os primeiros 1500 chars para avaliação
                snippet = p['texto_extraido'][:1500]
                prompt_paginas += f"--- PÁGINA {p['numero_pagina']} (ID: {p['id']}) ---\n{snippet}\n\n"

            print(f"[{arquivo_id}] Chamando Gemini para classificar Lote {i//batch_size + 1}...")

            prompt_fase1 = f"""Você é um especialista em análise de projetos de construção civil brasileiros.
Analise as páginas de projeto fornecidas e classifique cada uma.
Retorne APENAS um array JSON válido (lista de objetos), sem texto adicional, sem crase de markdown.

Para cada página retorne ESTRITAMENTE:
{{
  "id": "uuid original da página",
  "pagina": número,
  "disciplina": "arquitetonico"|"estrutural"|"hidraulico"|"eletrico"|"avac"|"paisagismo"|"indeterminado",
  "tipo_conteudo": "tabela_quantitativo"|"tabela_especificacao"|"planta_baixa"|"corte_elevacao"|"detalhe"|"memorial"|"capa_indice"|"carimbo_legenda"|"outro",
  "relevancia": "alta"|"media"|"baixa"|"descartar",
  "resumo": "descrição em 1 frase do conteúdo útil desta página",
  "confianca": "alta"|"media"|"baixa",
  "pagina_par": número_da_página_anterior_se_for_continuacao_ou_null,
  "entidades_extraidas": {{}}
}}

Marcar como "descartar": páginas em branco, capas sem informação técnica, páginas só com elementos gráficos sem texto.
Marcar relevancia "alta": tabelas de quantitativos, áreas, esquadrias, armação, memoriais, especificações técnicas.
Agrupamento: detectar páginas consecutivas da mesma sondagem/elemento e apontar a página anterior em pagina_par, senão null.

Páginas:
{prompt_paginas}"""

            try:
                resposta = gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt_fase1
                )
                text_response = resposta.text
                
                tokens_entrada_f1 = resposta.usage_metadata.prompt_token_count if hasattr(resposta, 'usage_metadata') else 0
                tokens_saida_f1 = resposta.usage_metadata.candidates_token_count if hasattr(resposta, 'usage_metadata') else 0
                custo_f1 = (tokens_entrada_f1 * PRECO_GEMINI_FLASH_INPUT_PER_M + tokens_saida_f1 * PRECO_GEMINI_FLASH_OUTPUT_PER_M) / 1_000_000
                registrar_custo(arquivo_id, obra_id, company_id, "classificacao_gemini", "gemini-2.5-flash", tokens_entrada_f1, tokens_saida_f1, 0, custo_f1)
                text_response = text_response.replace("```json", "").replace("```", "").strip()
                classificacoes = json.loads(text_response)
            except Exception as e_json:
                print(f"[{arquivo_id}] Erro ao parsear JSON do Gemini: {e_json}")
                print(f"Stack trace: {traceback.format_exc()}")
                continue

            for cls_page in classificacoes:
                # Filtrar descartáveis
                if cls_page.get("relevancia") == "descartar":
                    continue
                
                raw_id = cls_page.get("id")
                # Localiza a página no lote para pegar o texto_extraido completo original
                page_obj = next((x for x in lote if str(x['id']) == str(raw_id)), None)
                if not page_obj:
                    continue
                
                texto_original = page_obj['texto_extraido']
                texto_limpo = limpar_ruido_para_embedding(texto_original)
                
                if len(texto_limpo) < 20:
                    continue

                print(f"[{arquivo_id}] Fase 2: extraindo entidades página {cls_page.get('pagina')}...")
                entidades = extrair_entidades_fase2(cls_page.get("disciplina", "indeterminado"), texto_original, arquivo_id, obra_id, company_id)

                # 2. Gerar Embedding Gemini
                print(f"[{arquivo_id}] Gerando embedding para a página {cls_page.get('pagina')}...")
                emb_res = gemini_client.models.embed_content(
                    model="text-embedding-004",
                    contents=texto_limpo[:8000]
                )
                embedding_vector = emb_res.embeddings[0].values
                
                # registrar_custo(arquivo_id, obra_id, company_id, "embedding_gemini", "text-embedding-004", len(texto_limpo[:8000].split()), 0, 1, 0.0)
                
                # 3. Inserir Chunk no PGVector
                supabase.table("projeto_chunks").insert({
                    "arquivo_id": arquivo_id,
                    "pagina_raw_id": raw_id,
                    "obra_id": obra_id,
                    "company_id": company_id,
                    "numero_pagina": cls_page.get("pagina", page_obj['numero_pagina']),
                    "texto": texto_original,
                    "disciplina": cls_page.get("disciplina", "indeterminado"),
                    "tipo_conteudo": cls_page.get("tipo_conteudo", "outro"),
                    "relevancia": cls_page.get("relevancia", "baixa"),
                    "resumo": cls_page.get("resumo", ""),
                    "confianca": cls_page.get("confianca", "media"),
                    "pagina_par": cls_page.get("pagina_par"),
                    "entidades_extraidas": entidades,
                    "embedding": embedding_vector
                }).execute()
                
                chunks_criados += 1
                
        # 4. Finalizar Classificação
        supabase.table("projeto_arquivos").update({
            "classificado": True
        }).eq("id", arquivo_id).execute()
        
        print(f"[{arquivo_id}] Classificação concluída! {chunks_criados} chunks vetorizados gerados.")

        # Opcional: Push alert
        if user_id and chunks_criados > 0:
            send_push_notification(
                user_id,
                "Inteligência do Arquivo Indexada",
                f"{nome_original} agora possui {chunks_criados} páginas úteis prontas para o chat!"
            )
            
    except Exception as e:
        erro_str = str(e)
        if '429' in erro_str or 'quota' in erro_str.lower() or 'insufficient_quota' in erro_str:
            print(f"[{arquivo_id}] Erro de quota/rate limit. Aguardando 5 minutos.")
            time.sleep(300)
        else:
            print(f"[{arquivo_id}] Erro na fase de Classificação e Embedding: {erro_str}")
            time.sleep(60)


def worker_loop():
    print("Iniciando Worker Python de Processamento de PDFs e Indexação Vetorial...")
    
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    try:
        supabase.table("projeto_arquivos").update({"status": "aguardando", "erro_mensagem": "Reset: travado em processando"}).eq("status", "processando").lt("updated_at", cutoff).execute()
        print("Reset de arquivos travados concluído.")
    except Exception as reset_e:
        print(f"Aviso no reset inicial: {reset_e}")
        
    while True:
        try:
            # Tarefa A: Extração (aguardando)
            res_ext = supabase.table("projeto_arquivos").select("*").eq("status", "aguardando").order("created_at").limit(1).execute()
            if res_ext.data and len(res_ext.data) > 0:
                processar_pdf(res_ext.data[0])
                continue # não dorme
                
            # Tarefa B: Classificação (concluido E classificado=False)
            res_cls = supabase.table("projeto_arquivos").select("*").eq("status", "concluido").eq("classificado", False).order("created_at").limit(1).execute()
            if res_cls.data and len(res_cls.data) > 0:
                classificar_e_indexar(res_cls.data[0])
                continue
                
            # Tarefa C: Consolidação de Quantitativos (obras gerando)
            res_quant = supabase.table("obras").select("id").eq("quantitativos_status", "gerando").limit(1).execute()
            if res_quant.data and len(res_quant.data) > 0:
                obra_alvo = res_quant.data[0]['id']
                consolidar_obra(obra_alvo, supabase, anthropic)
                continue

            time.sleep(10)  # Aguarda 10s
        except Exception as e:
            print(f"Erro no loop principal: {e}")
            time.sleep(30)

if __name__ == "__main__":
    worker_loop()
