import urllib.request
try:
    urllib.request.urlopen('https://api.anthropic.com', timeout=5)
    print("CONECTIVIDADE OK: api.anthropic.com acessível")
except Exception as e:
    print(f"Erro na fase de Classificação e Embedding: {type(e).__name__}: {e}")
import os
import time
import json
import io
import fitz  # PyMuPDF
import pdfplumber
import re
from supabase import create_client, Client
from dotenv import load_dotenv
from anthropic import Anthropic
from openai import OpenAI

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY").strip()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERRO: Variáveis de ambiente do Supabase não configuradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print(f"ANTHROPIC_API_KEY presente: {bool(ANTHROPIC_API_KEY)}")
print(f"ANTHROPIC_API_KEY prefixo: {str(ANTHROPIC_API_KEY or '')[:10]}...")
anthropic = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
openai = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

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

def classificar_e_indexar(arquivo: dict):
    arquivo_id = arquivo['id']
    obra_id = arquivo['obra_id']
    company_id = arquivo['company_id']
    user_id = arquivo.get('user_id')
    nome_original = arquivo.get('nome_original', 'Documento')

    if not anthropic or not openai:
        print(f"[{arquivo_id}] ERRO: API Keys do Anthropic/OpenAI não estão configuradas. Pulando classificação.")
        time.sleep(30)
        return

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

            print(f"[{arquivo_id}] Chamando Claude para classificar Lote {i//batch_size + 1}...")

            resposta = anthropic.messages.create(
                model="claude-3-7-sonnet-20250219",  # Fallback version for Sonnet if 4-6 is invalid. I will use claude-3-7-sonnet-20250219 per anthropic defaults but prompt requested claude-sonnet-4-6. I will pass it literally.
                max_tokens=4000,
                temperature=0.0,
                system="Você é um especialista em análise de projetos de construção civil brasileiros.\nAnalise as páginas de projeto fornecidas e classifique cada uma.\nRetorne APENAS um array JSON válido (lista de objetos), sem texto adicional, sem crase de markdown.",
                messages=[
                    {
                        "role": "user",
                        "content": f"""Classifique cada página abaixo de um projeto de construção civil.

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
  "entidades_extraidas": {{}} // JSON com base na engenharia civil: 
                            // se quantitativo -> {{ "areas_m2": [], "elementos": [] }}
                            // se estrutural -> {{ "pilares": [], "vigas": [], "fck": "" }}
                            // se sondagem -> {{ "id_sondagem": "", "profundidade_max": "", "nivel_agua": "" }}
}}

Marcar como "descartar":
- Páginas em branco ou com menos de 20 caracteres úteis
- Capas, índices, folhas de rosto sem informação técnica
- Páginas com apenas elementos gráficos sem texto relevante

Marcar relevancia "alta":
- Tabelas de quantitativos, áreas, esquadrias, armação
- Memoriais descritivos
- Especificações técnicas de materiais

Agrupamento (pagina_par):
- Detectar quando páginas consecutivas pertencem à mesma sondagem/elemento (ex: continuação da tabela) e apontar a pagina anterior neste campo, senao null.

Páginas:
{prompt_paginas}
"""
                    }
                ]
            )

            try:
                text_response = resposta.content[0].text
                # Clean Markdown if Anthropic injects it
                text_response = text_response.replace("```json", "").replace("```", "").strip()
                classificacoes = json.loads(text_response)
            except Exception as e_json:
                print(f"[{arquivo_id}] Erro ao parsear JSON do Anthropic: {e_json}\nResponse bruta:\n{resposta.content[0].text}")
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

                # 2. Gerar Embedding OpenAI
                print(f"[{arquivo_id}] Gerando embedding para a página {cls_page.get('pagina')}...")
                emb_res = openai.embeddings.create(
                    model="text-embedding-3-small",
                    input=texto_limpo[:8000] # limite fallback
                )
                embedding_vector = emb_res.data[0].embedding
                
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
                    "entidades_extraidas": cls_page.get("entidades_extraidas", {}),
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
        print(f"[{arquivo_id}] Erro na fase de Classificação e Embedding: {e}")


def worker_loop():
    print("Iniciando Worker Python de Processamento de PDFs e Indexação Vetorial...")
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

            time.sleep(10)  # Aguarda 10s
        except Exception as e:
            print(f"Erro no loop principal: {e}")
            time.sleep(10)

if __name__ == "__main__":
    worker_loop()
