import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentPayload {
  email: string
  nome: string
  plano: 'start' | 'pro' | 'enterprise'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload: PaymentPayload = await req.json()

    if (!payload.email || !payload.nome || !payload.plano) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, nome, plano' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validPlans = ['start', 'pro', 'enterprise']
    if (!validPlans.includes(payload.plano)) {
      return new Response(
        JSON.stringify({ error: 'Plano inválido. Use: start, pro ou enterprise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Buscar plano
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('slug', payload.plano)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: `Plano "${payload.plano}" não encontrado na base` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verificar se usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === payload.email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Criar usuário com senha temporária
      const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!'
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nome: payload.nome },
      })

      if (createError || !newUser.user) {
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário', details: createError?.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = newUser.user.id
    }

    // 3. Verificar se já tem profile
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', userId)
      .maybeSingle()

    // 4. Criar company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        nome: payload.nome,
        cnpj: '',
        email: payload.email,
        telefone: '',
        plan_id: plan.id,
        status: 'active',
      })
      .select('id')
      .single()

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar empresa', details: companyError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Criar subscription
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    await supabaseAdmin.from('subscriptions').insert({
      company_id: company.id,
      plan_id: plan.id,
      status: 'trial',
      ciclo: 'mensal',
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
    })

    // 6. Criar ou atualizar profile
    if (existingProfile) {
      await supabaseAdmin
        .from('profiles')
        .update({ company_id: company.id, role: 'gestor' })
        .eq('user_id', userId)
    } else {
      await supabaseAdmin.from('profiles').insert({
        user_id: userId,
        nome: payload.nome,
        role: 'gestor',
        company_id: company.id,
      })
    }

    // 7. Enviar email de reset de senha para o novo usuário definir sua senha
    if (!existingUser) {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: payload.email,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        company_id: company.id,
        plan: payload.plano,
        is_new_user: !existingUser,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
