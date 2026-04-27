import React, { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";

const STORAGE_KEY = "lastra_install_dismissed";

function detectPlatform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

function isMobile(): boolean {
  return window.innerWidth < 768;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    if (!isMobile()) return;
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Aguarda 2s para não competir com o carregamento
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Banner inferior */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[200] flex items-center gap-3 px-4 py-3 md:hidden"
        style={{
          background: "linear-gradient(135deg, #0F0D1A 0%, #1A1530 100%)",
          borderTop: "1px solid rgba(175,169,236,0.12)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ background: "rgba(83,74,183,0.2)", border: "1px solid rgba(83,74,183,0.3)" }}
        >
          <Smartphone style={{ width: 18, height: 18, color: "#818CF8" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white leading-tight">Instale o Lastra</p>
          <p className="text-[11px] text-[rgba(148,140,195,0.7)] leading-tight mt-0.5">
            Acesse direto da tela inicial e receba alertas da obra
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
          style={{ background: "#534AB7", color: "#fff" }}
        >
          Como instalar
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[rgba(148,140,195,0.5)] hover:text-white transition-colors"
        >
          <X style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* Modal de instruções */}
      {showModal && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div
            className="relative w-full rounded-t-2xl p-6 pb-8"
            style={{
              background: "linear-gradient(180deg, #1A1530 0%, #0F0D1A 100%)",
              border: "1px solid rgba(175,169,236,0.1)",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-[rgba(148,140,195,0.5)]"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
            <h2 className="text-[16px] font-bold text-white mb-1">Instalar o Lastra</h2>
            <p className="text-[12px] text-[rgba(148,140,195,0.6)] mb-5">
              Adicione à tela inicial para acesso rápido
            </p>

            {platform === "ios" ? (
              <div className="space-y-3">
                {[
                  { step: "1", text: 'Toque no ícone de compartilhar (□↑) no Safari' },
                  { step: "2", text: 'Role para baixo e toque em "Adicionar à Tela de Início"' },
                  { step: "3", text: 'Toque em "Adicionar" para confirmar' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{ background: "rgba(83,74,183,0.25)", color: "#818CF8" }}
                    >
                      {step}
                    </div>
                    <p className="text-[13px] text-[rgba(220,217,245,0.85)] leading-relaxed">{text}</p>
                  </div>
                ))}
                <p className="text-[11px] text-[rgba(148,140,195,0.5)] mt-3">
                  * Requer Safari no iOS 16.4 ou superior
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{ background: "rgba(83,74,183,0.25)", color: "#818CF8" }}
                  >
                    1
                  </div>
                  <p className="text-[13px] text-[rgba(220,217,245,0.85)] leading-relaxed">
                    O Chrome exibirá automaticamente um prompt de instalação
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{ background: "rgba(83,74,183,0.25)", color: "#818CF8" }}
                  >
                    2
                  </div>
                  <p className="text-[13px] text-[rgba(220,217,245,0.85)] leading-relaxed">
                    Se não aparecer: Menu (⋮) → "Adicionar à tela inicial"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
