import React, { useState } from "react";
import { ChatPreferences } from "@/lib/chat/metaprompts";
import { useChatPreferences } from "@/hooks/useChatPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/untyped";
import toast from "react-hot-toast";
import { Loader2, Bell, BellOff, BellRing, Mic } from "lucide-react";
import { synthesizeSpeech } from "@/lib/voice/voiceService";

export function ChatSettings() {
  const { preferences, updatePreferences, isLoading, isSaving } = useChatPreferences();
  const [localPrefs, setLocalPrefs] = useState<ChatPreferences | null>(null);
  const { isSupported: pushSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [testingPush, setTestingPush] = useState(false);

  // Sync initial state
  React.useEffect(() => {
    if (!isLoading && !localPrefs) {
      setLocalPrefs(preferences);
    }
  }, [isLoading, preferences, localPrefs]);

  if (isLoading || !localPrefs) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[rgba(148,140,195,0.6)]" />
      </div>
    );
  }

  const handleSave = async () => {
    const success = await updatePreferences(localPrefs);
    if (success) {
      toast.success("Preferências salvas com sucesso!");
    } else {
      toast.error("Erro ao salvar preferências.");
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp.user) throw new Error("Não autenticado");

      const { error } = await supabase.functions.invoke("send-push", {
        body: {
          user_id: userResp.user.id,
          titulo: "Teste Lastra",
          corpo: "As notificações estão funcionando!",
          tipo: "teste"
        }
      });

      if (error) throw error;
      toast.success("Notificação de teste enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar notificação de teste.");
      console.error(err);
    } finally {
      setTestingPush(false);
    }
  };

  const renderGroup = (
    title: string,
    field: keyof ChatPreferences,
    options: { value: string, label: string, desc?: string }[]
  ) => {
    return (
      <div className="mb-6">
        <h3 className="text-[13px] font-medium text-white mb-3">{title}</h3>
        <div className="flex flex-col gap-2">
          {options.map(opt => {
            const isSelected = localPrefs[field] === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setLocalPrefs({ ...localPrefs, [field]: opt.value as any })}
                className="flex flex-col text-left px-3 py-2.5 rounded-xl transition-colors border hover:bg-[rgba(255,255,255,0.02)]"
                style={{
                  background: isSelected ? "rgba(83,74,183,0.15)" : "transparent",
                  borderColor: isSelected ? "#534AB7" : "rgba(175,169,236,0.1)",
                }}
              >
                <span style={{ color: isSelected ? "#818CF8" : "rgba(220,217,245,0.88)" }} className="text-[13px] font-medium mb-0.5">
                  {opt.label}
                </span>
                {opt.desc && (
                  <span className="text-[11px] text-[rgba(148,140,195,0.6)] leading-tight">
                    {opt.desc}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Status da notificação para exibição
  const pushStatusLabel = !pushSupported
    ? "Não suportado neste dispositivo"
    : isSubscribed
    ? "Ativas"
    : "Inativas";

  const pushStatusColor = !pushSupported
    ? "rgba(163,45,45,0.8)"
    : isSubscribed
    ? "rgba(59,109,17,0.9)"
    : "rgba(175,169,236,0.5)";

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
      {renderGroup("Estilo de Resposta", "estilo", [
        { value: "conciso", label: "Conciso", desc: "Direto e objetivo. Máximo 3 parágrafos." },
        { value: "formal", label: "Formal", desc: "Linguagem técnica e profissional." },
        { value: "didatico", label: "Didático", desc: "Exemplos práticos e analogias." },
        { value: "executivo", label: "Executivo", desc: "Foco em números, riscos e recomendações." }
      ])}
      
      {renderGroup("Nível de Expertise", "expertise", [
        { value: "iniciante", label: "Iniciante", desc: "Explica termos e jargões." },
        { value: "intermediario", label: "Intermediário", desc: "Usa termos técnicos normalmente." },
        { value: "especialista", label: "Especialista", desc: "Direto ao ponto, referencia NBR/NR." }
      ])}

      {renderGroup("Foco de Análise", "foco", [
        { value: "geral", label: "Geral", desc: "Visão equilibrada de todos os aspectos." },
        { value: "financeiro", label: "Financeiro", desc: "Prioriza custos e orçamento." },
        { value: "cronograma", label: "Cronograma", desc: "Prioriza prazos e caminho crítico." },
        { value: "tecnico", label: "Técnico", desc: "Prioriza especificações e execução." },
        { value: "risco", label: "Risco", desc: "Prioriza alertas e mitigações." }
      ])}

      {renderGroup("Proatividade", "proatividade", [
        { value: "reativo", label: "Reativo", desc: "Responde apenas o que foi perguntado." },
        { value: "proativo", label: "Proativo", desc: "Sugere próximos passos e pontos de atenção." },
        { value: "consultivo", label: "Consultivo", desc: "Questiona premissas e age como consultor." }
      ])}

      <div className="mb-6">
        <h3 className="text-[13px] font-medium text-white mb-3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mic size={14} color="#AFA9EC" />
          Voz e Áudio
        </h3>
        <div className="flex flex-col">
          {[
            { title: "Hey Lastra", field: "wake_word_enabled" as const, desc: "Ative o chat falando 'Hey Lastra'. (Pode afetar bateria)" },
            { title: "Resposta em voz", field: "auto_speak" as const, desc: "O assistente responde em voz após cada mensagem." },
            { title: "Botão Flutuante (FAB)", field: "voice_fab_enabled" as const, desc: "Exibir botão flutuante de gravação em todas as telas." }
          ].map(item => {
            const isActive = !!localPrefs[item.field];
            return (
              <div key={item.field} className="flex items-center justify-between py-3 border-b" style={{ borderColor: "rgba(175,169,236,0.1)" }}>
                <div className="flex flex-col pr-4">
                  <span className="text-[13px] font-medium text-white mb-0.5">{item.title}</span>
                  <span className="text-[11px] text-[rgba(148,140,195,0.6)] leading-tight">{item.desc}</span>
                </div>
                <button
                  onClick={() => setLocalPrefs({ ...localPrefs, [item.field]: !isActive })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-[#534AB7]' : 'bg-[rgba(255,255,255,0.1)]'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
        
        {localPrefs.auto_speak && (
          <button
            onClick={() => synthesizeSpeech("Olá, sou o assistente do Lastra. A voz está funcionando.")}
            className="mt-3 w-full text-[12px] py-2 rounded-lg border border-[rgba(83,74,183,0.3)] text-[#818CF8] hover:bg-[rgba(83,74,183,0.1)] transition-colors"
          >
            Testar voz
          </button>
        )}
      </div>

      <div className="mt-8 mb-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full flex items-center justify-center py-2.5 rounded-lg text-[13px] font-medium transition-colors hover:bg-[#433A97] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "#534AB7",
            color: "#fff"
          }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar preferências"}
        </button>
      </div>

      {/* ── Seção Notificações ─────────────────────────────────── */}
      <div
        style={{
          marginTop: 8,
          paddingTop: 20,
          borderTop: "1px solid rgba(83,74,183,0.15)",
        }}
      >
        <h3 className="text-[13px] font-medium text-white mb-4" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bell size={14} color="#AFA9EC" />
          Notificações
        </h3>

        {/* Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            border: "1px solid rgba(83,74,183,0.12)",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(175,169,236,0.7)" }}>Status</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: pushStatusColor,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {isSubscribed ? <BellRing size={12} /> : <BellOff size={12} />}
            {pushLoading ? "Verificando..." : pushStatusLabel}
          </span>
        </div>

        {/* Botão Ativar / Desativar */}
        {pushSupported && (
          <button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={pushLoading}
            style={{
              width: "100%",
              height: 38,
              marginBottom: 8,
              background: isSubscribed ? "rgba(163,45,45,0.15)" : "rgba(83,74,183,0.15)",
              border: `1px solid ${isSubscribed ? "rgba(163,45,45,0.3)" : "rgba(83,74,183,0.3)"}`,
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 500,
              color: isSubscribed ? "rgba(163,45,45,0.9)" : "#818CF8",
              cursor: pushLoading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: pushLoading ? 0.6 : 1,
            }}
          >
            {pushLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isSubscribed ? (
              <><BellOff size={13} /> Desativar notificações</>
            ) : (
              <><Bell size={13} /> Ativar notificações</>
            )}
          </button>
        )}

        {/* Botão Testar — apenas se subscrito */}
        {isSubscribed && (
          <button
            onClick={handleTestPush}
            disabled={testingPush}
            style={{
              width: "100%",
              height: 38,
              background: "rgba(83,74,183,0.08)",
              border: "1px solid rgba(83,74,183,0.2)",
              borderRadius: 10,
              fontSize: 12,
              color: "rgba(175,169,236,0.7)",
              cursor: testingPush ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: testingPush ? 0.6 : 1,
            }}
          >
            {testingPush ? <Loader2 size={13} className="animate-spin" /> : <BellRing size={13} />}
            {testingPush ? "Enviando..." : "Enviar notificação de teste"}
          </button>
        )}

        {/* Aviso VAPID não configurado (dev) */}
        {pushSupported && !import.meta.env.VITE_VAPID_PUBLIC_KEY && (
          <p style={{ fontSize: 10, color: "rgba(175,169,236,0.35)", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
            Configure VITE_VAPID_PUBLIC_KEY no .env para ativar push
          </p>
        )}
      </div>
    </div>
  );
}
