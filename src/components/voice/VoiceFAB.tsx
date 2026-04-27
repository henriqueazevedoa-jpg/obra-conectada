import React, { useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { useVoice } from "@/hooks/useVoice";
import { useChat } from "@/contexts/ChatContext";

import { useChatPreferences } from "@/hooks/useChatPreferences";

export function VoiceFAB() {
  const { isRecording, startRecording, stopRecording } = useVoice({ wakeWordEnabled: false });
  const { isOpen, toggle, simulateAssistantResponse } = useChat();
  const { preferences } = useChatPreferences();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pressStart, setPressStart] = useState<number>(0);

  // Não exibe se o chat estiver aberto ou desativado
  if (isOpen || !preferences.voice_fab_enabled) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setPressStart(Date.now());
    startRecording();
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    e.preventDefault();
    
    // Tap simples (menos de 300ms) - abre o chat
    if (Date.now() - pressStart < 300) {
      // Ignora a gravação recém iniciada
      stopRecording().catch(() => {});
      toggle();
      return;
    }

    // Push to talk real
    setIsProcessing(true);
    try {
      const text = await stopRecording();
      if (text.trim()) {
        toggle(); // Abre o chat
        // Adiciona a mensagem imediatamente
        simulateAssistantResponse(text);
      }
    } catch (err) {
      // toast de erro já lançado no hook
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePointerLeave = async (e: React.PointerEvent) => {
    if (isRecording) {
      handlePointerUp(e);
    }
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={`fixed bottom-6 right-6 z-[45] w-[52px] h-[52px] rounded-full shadow-lg flex items-center justify-center transition-all duration-200
        ${isRecording 
          ? "bg-destructive border-2 border-destructive animate-pulse shadow-destructive/40" 
          : "bg-[#534AB7] hover:bg-[#3C3489] text-white"
        }
      `}
      title="Segure para falar ou clique para abrir o chat"
    >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      ) : (
        <Mic className={`h-6 w-6 text-white ${isRecording ? "scale-110" : ""}`} />
      )}
    </button>
  );
}
