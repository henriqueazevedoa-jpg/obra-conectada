import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import toast from "react-hot-toast";

const STORAGE_KEY = "lastra_notification_dismissed";

export function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [showDeniedInstructions, setShowDeniedInstructions] = useState(false);
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushNotifications();

  useEffect(() => {
    if (!isSupported) return;
    if (isSubscribed) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Aguarda 4s para não competir com o InstallPrompt
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [isSupported, isSubscribed]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const handleActivate = async () => {
    try {
      await subscribe();
      toast.success("Notificações ativadas!");
      dismiss();
    } catch {
      if (Notification.permission === "denied") {
        setShowDeniedInstructions(true);
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6"
        style={{
          background: "linear-gradient(180deg, #1A1530 0%, #0F0D1A 100%)",
          border: "1px solid rgba(175,169,236,0.12)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-[rgba(148,140,195,0.5)] hover:text-white transition-colors"
        >
          <X style={{ width: 15, height: 15 }} />
        </button>

        {/* Ícone */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(83,74,183,0.2)", border: "1px solid rgba(83,74,183,0.3)" }}
          >
            <Bell style={{ width: 28, height: 28, color: "#818CF8" }} />
          </div>
        </div>

        <h2 className="text-[17px] font-bold text-white text-center mb-2">
          Ative os alertas da obra
        </h2>
        <p className="text-[13px] text-[rgba(148,140,195,0.7)] text-center leading-relaxed mb-6">
          Receba avisos de vencimentos, atrasos e ocorrências importantes diretamente no seu celular.
        </p>

        {showDeniedInstructions ? (
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(175,169,236,0.1)" }}
          >
            <p className="text-[12px] text-[rgba(220,217,245,0.8)] leading-relaxed">
              Para ativar manualmente: acesse as <strong>Configurações</strong> do seu navegador → <strong>Notificações</strong> → encontre o Lastra e altere para <strong>Permitir</strong>.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleActivate}
            disabled={isLoading}
            className="w-full py-3 rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-50"
            style={{ background: "#534AB7", color: "#fff" }}
          >
            {isLoading ? "Ativando..." : "Ativar notificações"}
          </button>
          <button
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium text-[rgba(148,140,195,0.6)] hover:text-white transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
