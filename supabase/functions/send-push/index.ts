import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push implementation for Deno (manual VAPID signing without external lib)
async function buildVAPIDAuthorizationHeader(
  audience: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  email: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 12 * 3600;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp, sub: `mailto:${email}` };

  const encodeBase64Url = (data: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(data)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the private key (raw base64url encoded)
  const rawKey = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(signingInput)
  );

  const jwt = `${signingInput}.${encodeBase64Url(signature)}`;
  return `vapid t=${jwt},k=${vapidPublicKey}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, titulo, corpo, tipo, obra_id, url } = await req.json();

    if (!user_id || !titulo || !corpo) {
      throw new Error("user_id, titulo e corpo são obrigatórios");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidEmail = Deno.env.get("VAPID_EMAIL") ?? "";

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      throw new Error("VAPID keys não configuradas");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Buscar todas as subscriptions do usuário
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, company_id")
      .eq("user_id", user_id);

    if (subErr) throw subErr;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ enviadas: 0, falhas: 0, motivo: "Sem subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const company_id = subscriptions[0].company_id;
    const payload = JSON.stringify({
      title: titulo,
      body: corpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: url || "/" }
    });

    let enviadas = 0;
    let falhas = 0;

    for (const sub of subscriptions) {
      try {
        const urlObj = new URL(sub.endpoint);
        const audience = `${urlObj.protocol}//${urlObj.host}`;

        const authHeader = await buildVAPIDAuthorizationHeader(
          audience, vapidPublicKey, vapidPrivateKey, vapidEmail
        );

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "TTL": "86400",
          },
          body: new TextEncoder().encode(payload),
        });

        if (res.ok || res.status === 201) {
          enviadas++;
        } else {
          console.error(`Push falhou: ${res.status} ${await res.text()}`);
          falhas++;
        }
      } catch (e) {
        console.error("Erro ao enviar push:", e);
        falhas++;
      }
    }

    // Registrar no log
    await supabase.from("push_notifications_log").insert({
      user_id,
      company_id,
      obra_id: obra_id || null,
      titulo,
      corpo,
      tipo: tipo || "geral",
    });

    return new Response(JSON.stringify({ enviadas, falhas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
