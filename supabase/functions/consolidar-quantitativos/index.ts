import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { obra_id, user_id, action = 'preview' } = await req.json()

    if (!obra_id) {
      return new Response(JSON.stringify({ error: 'obra_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Verificar acesso à obra
    const { data: obraUser, error: erroObra } = await supabaseClient
      .from('obras')
      .select('id, company_id')
      .eq('id', obra_id)
      .single()

    if (erroObra || !obraUser) {
      return new Response(JSON.stringify({ error: 'Obra não encontrada ou sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Verificar chunks disponíveis
    const { count: totalChunks, error: erroChunks } = await supabaseAdmin
      .from('projeto_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('obra_id', obra_id)
      .neq('relevancia', 'descartar')

    if (erroChunks || totalChunks === null || totalChunks === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum chunk classificado útil encontrado nesta obra. Extraia e classifique arquivos primeiro.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Calcular e debitar créditos: custo base de 10 créditos + 1 crédito a cada 10 chunks
    const creditosEstimados = 10 + (totalChunks / 10.0)

    if (action === 'preview') {
      return new Response(JSON.stringify({ 
        total_chunks: totalChunks,
        creditos_estimados: creditosEstimados,
        mensagem: `Consolidação de ${totalChunks} chunks consumirá aprox. ${creditosEstimados.toFixed(1)} créditos.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ação: execute
    if (action === 'execute') {
      // 4. Atualizar quantitativos_status para 'gerando'
      const { error: updateError } = await supabaseAdmin
        .from('obras')
        .update({ quantitativos_status: 'gerando' })
        .eq('id', obra_id)

      if (updateError) {
        throw updateError
      }

      // 5. Worker Python processará diretamente (polling monitora o status 'gerando')

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'A consolidação foi iniciada no worker em background.',
        total_chunks: totalChunks,
        creditos_estimados: creditosEstimados
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida. Use preview ou execute.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
