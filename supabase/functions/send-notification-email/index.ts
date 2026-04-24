// @ts-nocheck
// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_placeholder'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

Deno.serve(async (req) => {
  try {
    // Apenas responde a POST
    if (req.method !== 'POST') {
      return new Response('Método não permitido', { status: 405 })
    }

    // Auth do Webhook - no futuro validar secret header configurado no Supabase
    // O header 'Authorization' de default enviada pelo webhook contém a anon_key
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Sem autorização', { status: 401 })
    }

    const body = await req.json()
    // O Supabase Webhook envia o registro novo no objeto 'record'
    const record = body.record
    if (!record) {
      return new Response('Formato inválido. Esperado payload de webhook do Supabase.', { status: 400 })
    }

    const { company_id, titulo, mensagem, prioridade } = record

    // Filtrar apenas prioridades importantes
    if (!['importante', 'critica'].includes(prioridade)) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Prioridade ignorada' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Se estiver usando o placeholder (ainda em setup ou dev sem domínio) ignorar silenciosamente
    if (RESEND_API_KEY === 're_placeholder') {
      console.log('RESEND_API_KEY é placeholder. Simulando envio com sucesso (skipped).')
      return new Response(JSON.stringify({ skipped: true, reason: 'Placeholder config' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!company_id) {
      return new Response(JSON.stringify({ error: 'company_id ausente' }), { status: 400 })
    }

    // Inicializar cliente do Supabase *com Service Role* para contornar RLS
    // e pegar o e-mail central da empresa (gestor raiz)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Buscar a empresa dona da notificação
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('email, nome')
      .eq('id', company_id)
      .single()

    if (companyError || !company || !company.email) {
      console.error('Falha ao buscar email da empresa:', companyError)
      return new Response(JSON.stringify({ error: 'Empresa ou E-mail não localizado' }), { status: 404 })
    }

    // Configurando HTML para envio via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // IMPORTANTE: "onboarding@resend.dev" só serve para testes ou deve ser substituído por domínio válido.
        // Se já tiver um domínio validado (ex: no-reply@obraconectada.com), alterar abaixo:
        from: 'ObraConectada <onboarding@resend.dev>',
        to: [company.email],
        subject: `[ObraConectada] ${titulo}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div style="background-color: ${prioridade === 'critica' ? '#ef4444' : '#f59e0b'}; padding: 16px; color: white;">
                <h2 style="margin: 0;">${titulo}</h2>
              </div>
              <div style="padding: 24px; background-color: #f9fafb;">
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                  Olá equipe <strong>${company.nome}</strong>,
                </p>
                <p style="font-size: 16px; line-height: 1.5;">
                  ${mensagem || 'Você possui um novo alerta no painel.'}
                </p>
                <div style="margin-top: 30px;">
                  <a href="https://obraconectada.com" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Abrir Plataforma
                  </a>
                </div>
              </div>
            </div>
          </div>
        `,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Erro na API do Resend:', resendData)
      return new Response(JSON.stringify({ error: 'Falha no provedor de email', details: resendData }), { status: resendRes.status })
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Erro fatal Edge Function:', error)
    return new Response(JSON.stringify({ error: 'Erro Interno do Servidor', message: String(error) }), { status: 500 })
  }
})

/*
======================================================================
INSTRUÇÕES DE SETUP MANUAL NO SUPABASE STUDIO (Dashboard)
======================================================================
Para fazer o vínculo dessa Edge Function assíncrona ao banco em Cloud:

1) Vá em "Database" > "Webhooks" no seu painel da Supabase.
2) Clique em "Create Webhook".
3) Nomeie de algo como 'disparo-de-email-notificacao'.
4) Na seção 'Conditions', escolha:
   - Table: "public.notifications"
   - Events: "Insert"
5) Na seção 'Webhook Configuration', escolha:
   - Method: POST
   - URL: a URL de acesso público da sua Edge Function hospedada.
          (ex: https://<project-ref>.supabase.co/functions/v1/send-notification-email)
   - HTTP Headers: o painel vai auto-preencher 'Authorization: Bearer <Sua_Anon_Key>', 
     pode deixar; a function ignorará isso e instanciará o banco local com o role-key.
6) Deploy desta function executando:
   supabase functions deploy send-notification-email

7) Defina sua chave da API de envios no Supabase secrets:
   supabase secrets set RESEND_API_KEY=re_123456789...
======================================================================
*/
