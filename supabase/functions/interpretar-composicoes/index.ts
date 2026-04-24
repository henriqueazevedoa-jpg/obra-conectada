import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conteudo, company_id } = await req.json();

    if (!conteudo || !company_id) {
      throw new Error('Conteúdo ou company_id não fornecidos');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Create client with the user's auth header
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada');
    }

    // Prepare Anthropic prompt
    const systemPrompt = `Você é um assistente de orçamento de construção civil.
Analise o conteúdo abaixo e extraia as composições no formato JSON.
Para cada composição identifique:
- codigo (string, opcional)
- nome (string)
- unidade (string)
- categoria (string, DEVE SER exatamente uma de: Fundações, Estrutura, Alvenaria, Cobertura, Instalações Hidráulicas, Instalações Elétricas, Revestimentos, Esquadrias, Pintura, Pavimentação, Outros)
- preco_medio (number, opcional)
- insumos (array de objetos com: descricao, unidade, quantidade, preco_unitario).

Retorne APENAS JSON válido, sem texto adicional (nenhum markdown \`\`\`json ou explicações).
Formato esperado: { "composicoes": [ ... ] }`;

    // Make the request to Anthropic (Claude 3.5 Sonnet or Haiku)
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Aqui está o conteúdo colado:\n\n${conteudo}` }
        ]
      })
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Erro na Anthropic API:', err);
      throw new Error('Falha na API da IA');
    }

    const aiData = await anthropicRes.json();
    const resultText = aiData.content[0].text;
    
    const inputTokens = aiData.usage.input_tokens || 0;
    const outputTokens = aiData.usage.output_tokens || 0;
    const creditosUsados = (inputTokens + outputTokens) / 1000;

    let composicoesParsed;
    try {
      composicoesParsed = JSON.parse(resultText);
    } catch (e) {
      // Tentar limpar o texto caso venha com markdown
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      composicoesParsed = JSON.parse(cleaned);
    }

    // Pegar o user_id real a partir do token
    const { data: { user } } = await supabase.auth.getUser();

    // Registrar o uso no Supabase
    // Usar o service_role client para inserir ai_usage ignorando RLS (ou se o usuário puder inserir via sua policy, o authHeader funciona)
    // Mas a policy "company_own_insert" permite inserir com o JWT do usuário, então podemos usar o mesmo client.
    await supabase.from('ai_usage').insert({
      company_id,
      user_id: user?.id,
      feature: 'interpretar_composicoes',
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      creditos: creditosUsados,
      metadata: { raw_result_length: resultText.length }
    });

    return new Response(JSON.stringify(composicoesParsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
