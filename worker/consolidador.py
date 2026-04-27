import json

def extrair_tabelas_camelot(pdf_bytes, numero_pagina):
    try:
        import camelot
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        tabelas = camelot.read_pdf(tmp_path, pages=str(numero_pagina), flavor='lattice')
        if tabelas.n == 0:
            tabelas = camelot.read_pdf(tmp_path, pages=str(numero_pagina), flavor='stream')
        os.unlink(tmp_path)
        resultado = []
        for tabela in tabelas:
            resultado.append(tabela.df.to_dict(orient='records'))
        return resultado
    except Exception as e:
        print(f"Camelot falhou na página {numero_pagina}: {e}")
        return []

def extrair_entidades_spacy(texto):
    try:
        import spacy
        import re
        entidades = {}
        padroes = {
            'fck_mpa': r'(?:fck|f\'c|resistencia caracteristica)[^\d]*(\d+(?:[.,]\d+)?)\s*(?:mpa|n/mm)',
            'aco': r'(CA-?(?:25|50|60))',
            'slump': r'slump[^\d]*(\d+(?:[.,]\d+)?)\s*(?:±\s*\d+)?\s*cm',
            'cobrimento_cm': r'cobrimento[^\d]*(\d+(?:[.,]\d+)?)\s*cm',
            'consumo_cimento': r'consumo[^\d]*(\d+(?:[.,]\d+)?)\s*kg',
        }
        for chave, padrao in padroes.items():
            matches = re.findall(padrao, texto.lower())
            if matches:
                entidades[chave] = matches[0] if len(matches) == 1 else matches
        normas = re.findall(r'NBR\s*\d+(?:[:\-]\d+)?', texto.upper())
        if normas:
            entidades['normas'] = list(set(normas))
        return entidades
    except Exception as e:
        print(f"spaCy falhou: {e}")
        return {}

def consolidar_elementos(lista_elementos, threshold_similaridade=85):
    import pandas as pd
    from rapidfuzz import fuzz
    if not lista_elementos:
        return [], []
    df = pd.DataFrame(lista_elementos)
    consolidados = []
    conflitos = []
    processados = set()
    for i, elem_a in df.iterrows():
        if i in processados:
            continue
        grupo = [elem_a.to_dict()]
        processados.add(i)
        id_a = str(elem_a.get('id', ''))
        for j, elem_b in df.iterrows():
            if j in processados or j == i:
                continue
            id_b = str(elem_b.get('id', ''))
            similaridade = fuzz.ratio(id_a.upper(), id_b.upper())
            if similaridade >= threshold_similaridade:
                grupo.append(elem_b.to_dict())
                processados.add(j)
        if len(grupo) == 1:
            consolidados.append(grupo[0])
        else:
            valores_unicos = set()
            for g in grupo:
                chave_valor = str(sorted(g.items()))
                valores_unicos.add(chave_valor)
            if len(valores_unicos) == 1:
                consolidados.append(grupo[0])
            else:
                conflitos.append({
                    'id': id_a,
                    'ocorrencias': grupo,
                    'motivo': 'valores_divergentes'
                })
    return consolidados, conflitos

def resolver_conflitos_claude(conflitos, disciplina, tipo, anthropic_client):
    try:
        resposta = anthropic_client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=1000,
            temperature=0.0,
            system="Você é um engenheiro civil especialista em análise de projetos brasileiros.",
            messages=[{
                "role": "user",
                "content": f"""Analise estes conflitos encontrados na consolidação de um projeto de construção civil.
Disciplina: {disciplina}
Tipo de elemento: {tipo}
Conflitos encontrados:
{json.dumps(conflitos, ensure_ascii=False, indent=2)}

Para cada conflito, determine qual valor é o correto baseado no contexto técnico.
Retorne APENAS JSON no formato:
[{{"id": "id_do_elemento", "valor_correto": {{...}}, "justificativa": "razão técnica"}}]"""
            }]
        )
        texto = resposta.content[0].text.replace("```json", "").replace("```", "").strip()
        resolucoes = json.loads(texto)
        
        # Tracking costs locally for UI/Worker registration
        tokens_in = resposta.usage.input_tokens
        tokens_out = resposta.usage.output_tokens
        custo = (tokens_in * 3.00 + tokens_out * 15.00) / 1_000_000
        
        for resolucao in resolucoes:
            for conflito in conflitos:
                if conflito.get('id') == resolucao.get('id'):
                    conflito['resolucao'] = resolucao.get('valor_correto')
                    conflito['justificativa'] = resolucao.get('justificativa')
                    conflito['resolvido'] = True
                    conflito['_custo'] = custo
                    conflito['_tokens'] = tokens_in + tokens_out
        return conflitos
    except Exception as e:
        print(f"Falha ao resolver conflitos com Claude: {e}")
        return conflitos

def consolidar_obra(obra_id, supabase_client, anthropic_client):
    print(f"[{obra_id}] Iniciando consolidação de quantitativos...")
    res = supabase_client.table("projeto_chunks").select("id, arquivo_id, numero_pagina, disciplina, tipo_conteudo, texto, entidades_extraidas, confianca, resumo, company_id").eq("obra_id", obra_id).neq("relevancia", "descartar").execute()
    chunks = res.data
    if not chunks:
        print(f"[{obra_id}] Nenhum chunk encontrado para consolidar.")
        supabase_client.table("obras").update({
            "quantitativos_status": "erro"
        }).eq("id", obra_id).execute()
        return False
    
    company_id = chunks[0].get('company_id')
    agrupado = {}
    for chunk in chunks:
        disc = chunk.get('disciplina', 'indeterminado')
        if disc not in agrupado:
            agrupado[disc] = []
        agrupado[disc].append(chunk)
        
    registros_salvos = 0
    total_custo = 0.0
    total_tokens = 0
    
    for disciplina, chunks_disc in agrupado.items():
        print(f"[{obra_id}] Consolidando disciplina: {disciplina} ({len(chunks_disc)} chunks)")
        entidades_por_tipo = {}
        for chunk in chunks_disc:
            entidades = chunk.get('entidades_extraidas') or {}
            texto = chunk.get('texto', '')
            entidades_spacy = extrair_entidades_spacy(texto)
            entidades.update({k: v for k, v in entidades_spacy.items() if k not in entidades})
            for tipo, valores in entidades.items():
                if tipo not in entidades_por_tipo:
                    entidades_por_tipo[tipo] = []
                if isinstance(valores, list):
                    entidades_por_tipo[tipo].extend(valores)
                else:
                    entidades_por_tipo[tipo].append(valores)
        
        for tipo, elementos in entidades_por_tipo.items():
            if not elementos:
                continue
            if isinstance(elementos[0], dict):
                consolidados, conflitos = consolidar_elementos(elementos)
            else:
                from collections import Counter
                contagem = Counter([str(e) for e in elementos])
                consolidados = [{'valor': v, 'ocorrencias': c} for v, c in contagem.items()]
                conflitos = []
                
            if conflitos and anthropic_client:
                conflitos = resolver_conflitos_claude(conflitos, disciplina, tipo, anthropic_client)
                for c in conflitos:
                    if '_custo' in c:
                        total_custo += c['_custo']
                        total_tokens += c['_tokens']
                        del c['_custo']
                        del c['_tokens']
            
            supabase_client.table("projeto_quantitativos").upsert({
                "obra_id": obra_id,
                "company_id": company_id,
                "disciplina": disciplina,
                "tipo": tipo,
                "dados": {"elementos": consolidados},
                "fonte": "claude_sonnet_spacy_pandas",
                "confianca": "alta" if not conflitos else "media",
                "conflitos": conflitos,
            }).execute()
            registros_salvos += 1
            
    # Tarefa 6 - Registrar custo do AI para essa consolidação
    if total_custo > 0:
        try:
            supabase_client.table("processamento_custos").insert({
                "obra_id": obra_id,
                "company_id": company_id,
                "fase": "consolidacao_quantitativos",
                "modelo": "claude_sonnet_4_5+pandas+spacy",
                "tokens_entrada": total_tokens,
                "tokens_saida": 0,
                "unidades": len(chunks),
                "custo_usd": total_custo
            }).execute()
        except Exception as e:
            print(f"Erro ao registrar custo de quantitativos: {e}")
            
    # Cálculo de Créditos: 10 + (1 crédito por cada 10 chunks)
    creditos = 10 + (len(chunks) / 10.0)
    
    # Finaliza e atualiza Status e Créditos na tabela de Obras
    supabase_client.table("obras").update({
        "quantitativos_status": "concluido",
        "quantitativos_gerados_em": "now()",
        "quantitativos_creditos_consumidos": creditos
    }).eq("id", obra_id).execute()
    
    print(f"[{obra_id}] Consolidação concluída. {registros_salvos} registros salvos. Custo LLM: ${total_custo:.4f} | Créditos: {creditos:.1f}")
    return True
