import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Trata OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("PAYLOAD RECEBIDO:", JSON.stringify(payload));

    // Aceitar apenas INSERT na tabela storage.objects do bucket 'projetos'
    if (payload.type !== "INSERT" || payload.table !== "objects" || payload.record.bucket_id !== "projetos") {
      return new Response("Ignorado: Não é um insert no bucket projetos.", { status: 200, headers: corsHeaders });
    }

    const path = payload.record.name as string;
    // Formato esperado: {company_id}/{obra_id}/{arquivo_id}/{nome_original}
    const parts = path.split("/");
    if (parts.length < 4) {
      return new Response("Ignorado: Path inválido.", { status: 200, headers: corsHeaders });
    }

    const company_id = parts[0];
    const obra_id = parts[1];
    const arquivo_id = parts[2];
    const nome_original = parts.slice(3).join("/"); // Caso o nome do arquivo tenha /
    const tamanho_bytes = payload.record.metadata?.size || 0;
    const user_id = payload.record.owner; // owner no bucket storage é o auth.uid()

    if (!nome_original.toLowerCase().endsWith(".pdf")) {
      return new Response("Ignorado: Arquivo não é PDF.", { status: 200, headers: corsHeaders });
    }

    // Inicializa Supabase admin (service_role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Inserir registro em projeto_arquivos
    // A coluna 'status' já tem default 'aguardando'
    const { error } = await supabase.from("projeto_arquivos").insert({
      id: arquivo_id, // Preservamos o id gerado no frontend
      obra_id,
      company_id,
      user_id,
      nome_original,
      storage_path: path,
      tamanho_bytes
    });

    if (error) {
      console.error("Erro ao registrar no banco:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    // Retorna 200 indicando enfileiramento bem sucedido
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Erro geral no webhook:", error);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
});
