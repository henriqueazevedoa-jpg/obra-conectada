import os
import time
import json
import io
import fitz  # PyMuPDF
import pdfplumber
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERRO: Variáveis de ambiente do Supabase não configuradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
        
        # 4. Extração página por página (com pdfplumber em memória)
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
                    
                    # Atualiza o status parcial no master (progresso em realtime)
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
        }).eq("id", arquivo_id).execute()
        
        print(f"[{arquivo_id}] Processamento concluído com sucesso!")
        
        # 6. Disparar notificação push
        if user_id:
            send_push_notification(
                user_id,
                "Projeto processado",
                f"{arquivo.get('nome_original', 'O arquivo')} está pronto para consulta."
            )
            
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

def worker_loop():
    print("Iniciando Worker Python de Processamento de PDFs...")
    while True:
        try:
            # Busca arquivo na fila
            res = supabase.table("projeto_arquivos").select("*").eq("status", "aguardando").order("created_at").limit(1).execute()
            arquivos = res.data
            
            if arquivos and len(arquivos) > 0:
                processar_pdf(arquivos[0])
            else:
                time.sleep(10)  # Aguarda 10s se não tiver nada
        except Exception as e:
            print(f"Erro no loop principal: {e}")
            time.sleep(10)

if __name__ == "__main__":
    worker_loop()
