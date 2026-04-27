import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KEYWORDS_INVALIDAS = [
  "piada", "história", "poema", "música", "receita",
  "futebol", "jogo", "filme", "namoro",
  "ignore as instruções", "agora você é", "finja que",
  "novo papel", "roleplay", "[system]"
];

const KEYWORDS_SIMPLES = ["qual", "quanto", "saldo", "valor", "total", "resumo", "hoje"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mensagem, obra_id, session_id: clientSessionId } = await req.json();

    if (!mensagem || !obra_id) {
      throw new Error("Mensagem e obra_id são obrigatórios");
    }

    if (mensagem.length > 500) {
      throw new Error("A mensagem excede o limite de 500 caracteres.");
    }

    const msgLower = mensagem.toLowerCase();
    if (KEYWORDS_INVALIDAS.some(k => msgLower.includes(k))) {
      return new Response(JSON.stringify({
        message: "Posso ajudar apenas com questões relacionadas à gestão desta obra.",
        modelo: "none",
        bloqueado: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } }
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      throw new Error("Não autorizado");
    }

    // Obter profile e company_id
    const { data: profile } = await supabase.from("profiles").select("company_id, name, role").eq("id", user.id).single();
    if (!profile) throw new Error("Perfil não encontrado");
    const company_id = profile.company_id;

    // Verificar e atualizar uso diário usando service_role para contornar RLS em upsert
    // Mas o authHeader já nos dá permissão pelas políticas, se configuradas.
    const hoje = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase.from("chat_usage_daily")
      .select("mensagens_count, id")
      .eq("user_id", user.id)
      .eq("data", hoje)
      .single();

    let mensagensHoje = usageData ? usageData.mensagens_count : 0;
    const limiteDiario = 50; // default provisório

    if (mensagensHoje >= limiteDiario) {
      return new Response(JSON.stringify({
        message: "Você atingiu seu limite diário de mensagens do Lastra Chat.",
        modelo: "none",
        bloqueado: true,
        usage: { mensagens_hoje: mensagensHoje, limite: limiteDiario }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sessão
    let session_id = clientSessionId;
    if (!session_id) {
      const { data: newSession, error: sessErr } = await supabase.from("chat_sessions")
        .insert({ obra_id, user_id: user.id, company_id })
        .select()
        .single();
      if (sessErr) throw sessErr;
      session_id = newSession.id;
    }

    // Salvar mensagem do usuário
    await supabase.from("chat_messages").insert({
      session_id,
      role: "user",
      content: mensagem
    });
    // Build Context e Embeddings (Promises)
    const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const embeddingPromise = openaiKey ? fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({ input: mensagem, model: "text-embedding-3-small" })
    }).then(r => r.json()).catch(() => null) : Promise.resolve(null);

    const [obraRes, historicoRes, prefsRes, embData] = await Promise.all([
      supabase.from("obras").select("nome, status, data_inicio").eq("id", obra_id).single(),
      supabase.from("chat_messages").select("role, content").eq("session_id", session_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("chat_preferences").select("*").eq("user_id", user.id).single(),
      embeddingPromise
    ]);

    const obra = obraRes.data;
    const historico = (historicoRes.data || []).reverse();
    const prefs = prefsRes.data || { estilo: "conciso", expertise: "intermediario", foco: "geral", proatividade: "proativo" };

    // Busca RAG Vetorial
    let contextoRag = "";
    if (embData?.data?.[0]?.embedding) {
      const query_embedding = embData.data[0].embedding;

      const { data: chunks, error: rpcErr } = await supabase.rpc("buscar_chunks_obra", {
        query_embedding: `[${query_embedding.join(",")}]`,
        p_obra_id: obra_id,
        p_company_id: company_id,
        match_count: 5
      });

      if (chunks && chunks.length > 0) {
        contextoRag = "\n\nCONTEXTO DOS DOCUMENTOS DO PROJETO:\n" + chunks.map((c: any) =>
          `[Arquivo: ${c.nome_arquivo || 'Projeto'} | Página: ${c.numero_pagina} | Tipo: ${c.tipo_conteudo}]\n${c.texto}`
        ).join("\n\n---\n\n");
      } else {
        // Checar se não há chunks porque ainda estão sendo processados
        const { data: pendentes } = await supabase.from('projeto_arquivos').select('id').eq('obra_id', obra_id).eq('classificado', false).limit(1);
        if (pendentes && pendentes.length > 0) {
          contextoRag = "\n\n[SISTEMA: Avise o usuário cordialmente que os documentos desta obra ainda estão sendo processados pela inteligência artificial. Como a indexação está em andamento, você pode não conseguir responder a perguntas específicas de engenharia no momento.]";
        }
      }
    }

    const METAPROMPTS = {
      estilo: {
        conciso: `Seja direto e objetivo. Máximo 3 parágrafos por resposta. Prefira listas quando houver múltiplos itens. Sem introduções ou conclusões desnecessárias.`,
        formal: `Use linguagem técnica e profissional. Estruture respostas com clareza e precisão. Adequado para relatórios e comunicação com clientes. Evite gírias ou linguagem informal.`,
        didatico: `Explique com exemplos práticos e concretos. Use analogias quando ajudar na compreensão. Defina termos técnicos quando usá-los. Adequado para usuários menos experientes.`,
        executivo: `Foco em números, riscos e decisões. Sempre termine com uma recomendação clara e direta. Use linguagem de gestão, não técnica. Priorize o impacto financeiro e no prazo.`
      },
      expertise: {
        iniciante: `O usuário tem pouca experiência em gestão de obras. Explique termos técnicos sempre que os usar. Use analogias do dia a dia. Evite jargões sem explicação.`,
        intermediario: `O usuário conhece os fundamentos de gestão de obras. Use termos técnicos normalmente. Não precisa explicar conceitos básicos.`,
        especialista: `O usuário é um profissional experiente em construção civil. Use linguagem técnica diretamente. Pode referenciar normas ABNT e NR sem explicar. Seja preciso e denso, sem simplificações desnecessárias.`
      },
      foco: {
        geral: `Analise todos os aspectos da obra de forma equilibrada.`,
        financeiro: `Priorize sempre o impacto financeiro na sua análise. Mencione custos, desvios de orçamento e fluxo de caixa mesmo quando não perguntado diretamente.`,
        cronograma: `Priorize prazos, dependências entre etapas e caminho crítico. Sempre mencione impacto no prazo final quando relevante.`,
        tecnico: `Priorize especificações técnicas, normas e qualidade de execução. Referencie NBR e boas práticas quando aplicável.`,
        risco: `Sempre identifique riscos antes de oportunidades. Aponte o que pode dar errado mesmo quando não perguntado. Sugira medidas de mitigação.`
      },
      proatividade: {
        reativo: `Responda exatamente o que foi perguntado. Não adicione informações além do solicitado.`,
        proativo: `Além de responder, sempre sugira próximos passos e aponte pontos de atenção relacionados ao tema.`,
        consultivo: `Aja como um consultor sênior. Questione premissas quando necessário. Sugira alternativas ao que foi pedido. Aponte o que não foi perguntado mas deveria ser considerado.`
      },
      escopo: `Responda APENAS sobre gestão de obras e construção civil. Dados desta obra específica e dos documentos do projeto fornecidos têm prioridade. Para qualquer outro assunto fora da obra e documentos, responda educadamente: "Posso ajudar apenas com questões relacionadas à gestão desta obra." Máximo 4 parágrafos por resposta.`,
      identidade: `Você é o assistente de gestão de obras do Lastra. Responda sempre em português brasileiro. Seja direto, prático e objetivo.`
    };

    const identidade = METAPROMPTS.identidade;
    const escopo = METAPROMPTS.escopo;
    const estilo = METAPROMPTS.estilo[prefs.estilo as keyof typeof METAPROMPTS.estilo] || METAPROMPTS.estilo.conciso;
    const expertise = METAPROMPTS.expertise[prefs.expertise as keyof typeof METAPROMPTS.expertise] || METAPROMPTS.expertise.intermediario;
    const foco = METAPROMPTS.foco[prefs.foco as keyof typeof METAPROMPTS.foco] || METAPROMPTS.foco.geral;
    const proatividade = METAPROMPTS.proatividade[prefs.proatividade as keyof typeof METAPROMPTS.proatividade] || METAPROMPTS.proatividade.proativo;

    const baseMetaprompt = [identidade, escopo, estilo, expertise, foco, proatividade].join("\\n\\n");

    const systemPrompt = `${baseMetaprompt}\n\nContexto da Obra Atual:\nNome: ${obra?.nome || "Desconhecida"}\nStatus: ${obra?.status || "Indefinido"}\n\nPerfil do usuário que está perguntando:\nNome: ${profile.name}\nCargo: ${profile.role}${contextoRag}`;
    const isSimples = KEYWORDS_SIMPLES.some(k => msgLower.startsWith(k) || msgLower.includes(" " + k + " "));
    const modelo = isSimples ? "gemini-flash" : "claude-sonnet";

    let answerText = "";
    let inputTokens = 0;
    let outputTokens = 0;

    if (modelo === "gemini-flash") {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\nUsuário diz: " + mensagem }] }],
          generationConfig: { maxOutputTokens: 500 }
        })
      });

      if (!geminiRes.ok) throw new Error(await geminiRes.text());
      const data = await geminiRes.json();
      answerText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui processar sua resposta.";
      // estimativa de tokens se não houver no payload
      outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
      inputTokens = data.usageMetadata?.promptTokenCount || 0;
    } else {
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...historico.filter(m => m.role === "user" || m.role === "assistant").map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: mensagem }
          ]
        })
      });

      if (!anthropicRes.ok) throw new Error(await anthropicRes.text());
      const data = await anthropicRes.json();
      answerText = data.content?.[0]?.text || "Erro ao processar resposta com o Claude.";
      inputTokens = data.usage?.input_tokens || 0;
      outputTokens = data.usage?.output_tokens || 0;
    }

    // Salvar resposta
    await supabase.from("chat_messages").insert({
      session_id,
      role: "assistant",
      content: answerText,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      modelo_usado: modelo
    });

    // Atualizar uso
    if (usageData) {
      await supabase.from("chat_usage_daily")
        .update({ mensagens_count: mensagensHoje + 1, tokens_total: usageData.tokens_total + inputTokens + outputTokens })
        .eq("id", usageData.id);
    } else {
      await supabase.from("chat_usage_daily")
        .insert({
          user_id: user.id,
          company_id,
          data: hoje,
          mensagens_count: 1,
          tokens_total: inputTokens + outputTokens
        });
    }

    return new Response(JSON.stringify({
      message: answerText,
      modelo,
      session_id,
      tokens: { input: inputTokens, output: outputTokens },
      usage: { mensagens_hoje: mensagensHoje + 1, limite: limiteDiario }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({
      error: "Ocorreu um problema ao processar sua requisição.",
      details: err.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
