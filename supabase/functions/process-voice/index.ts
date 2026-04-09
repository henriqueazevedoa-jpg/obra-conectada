import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const modulePrompts: Record<string, string> = {
  diario: `Extraia do texto os dados para um registro de diário de obra:
- data (formato YYYY-MM-DD, se mencionada)
- clima (sol, nublado, chuva, chuvoso_forte)
- trabalhadores (número)
- servicos (lista de strings com serviços executados)
- materiais (lista de objetos com {nome, quantidade, unidade})
- problemas (texto)
- observacoes (texto)
Retorne JSON válido.`,
  estoque: `Extraia do texto dados de movimentação de estoque:
- tipo (entrada ou saida)
- material (nome do material)
- quantidade (número)
- unidade (un, kg, m, m², m³, saco, etc.)
- origem_destino (de onde veio ou para onde foi)
- observacoes (texto)
Retorne JSON válido.`,
  cronograma: `Extraia do texto dados de atualização de cronograma:
- etapa (nome da etapa)
- status (nao_iniciada, em_andamento, concluida, atrasada)
- progresso (percentual de 0 a 100)
- observacoes (texto)
Retorne JSON válido.`,
  orcamento: `Extraia do texto dados para orçamento:
- item (descrição do item)
- quantidade (número)
- unidade (un, m, m², etc.)
- observacao (texto)
Retorne JSON válido.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioPath, module } = await req.json();

    if (!audioPath || !module) {
      return new Response(JSON.stringify({ error: "audioPath e module são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Download audio file
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("voice-audio")
      .download(audioPath);

    if (downloadError || !audioData) {
      return new Response(JSON.stringify({ error: "Erro ao baixar áudio: " + (downloadError?.message || "não encontrado") }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert audio to base64
    const arrayBuffer = await audioData.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use Gemini for transcription + interpretation in one step
    const systemPrompt = `Você é um assistente para um sistema de gestão de obras de construção civil.
O usuário gravou um áudio no módulo "${module}".
Primeiro, transcreva o áudio. Depois, extraia os dados estruturados.
${modulePrompts[module] || "Extraia os dados relevantes em JSON."}

IMPORTANTE: Responda APENAS com JSON no formato:
{
  "transcription": "texto transcrito do áudio",
  "parsed": { ...dados extraídos... },
  "confidence": 0.0 a 1.0
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcreva e interprete este áudio:" },
              {
                type: "image_url",
                image_url: { url: `data:audio/webm;base64,${base64Audio}` },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro no processamento de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse the AI response
    let parsed;
    try {
      // Remove markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { transcription: content, parsed: {}, confidence: 0.5 };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-voice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
