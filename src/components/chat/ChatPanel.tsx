import React, { useRef, useEffect, useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useLocation } from "react-router-dom";
import { X, Send, Mic, Sparkles, Settings, ChevronLeft, Loader2 } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatSuggestions from "./ChatSuggestions";
import TypingIndicator from "./TypingIndicator";
import { ChatSettings } from "./ChatSettings";
import { useObras } from "@/contexts/ObrasContext";
import { useObraSelection } from "@/contexts/ObraSelectionContext";
import { useVoice } from "@/hooks/useVoice";

export default function ChatPanel() {
  const { isOpen, close, messages, isLoading, simulateAssistantResponse } = useChat();
  const location = useLocation();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const [inputValue, setInputValue] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isRecording, startRecording, stopRecording } = useVoice({ wakeWordEnabled: false });

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  }, [inputValue]);

  if (!isOpen && window.innerWidth < 768) return null; // Mobile conditionally render

  const currentObra = obras.find(o => o.id === selectedObraId);
  const obraNome = currentObra?.nome || "Sem obra selecionada";

  const getSuggestions = () => {
    const path = location.pathname;
    if (path.includes("/cronograma")) return ["Analisa atrasos", "Caminho crítico", "Resumo semanal"];
    if (path.includes("/orcamento")) return ["Desvios do budget", "Maior gasto", "Projeção final"];
    if (path.includes("/contratos")) return ["Contratos a vencer", "Pendências", "Resumo contratos"];
    return ["Status da obra", "Riscos atuais", "Resumo para cliente"];
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    simulateAssistantResponse(inputValue.trim());
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const panelContent = (
    <div 
      className="flex flex-col h-full shadow-xl md:shadow-none"
      style={{
        width: "100%",
        maxWidth: "100%",
        background: "linear-gradient(180deg, #0F0D1A 0%, #0C0A16 50%, #0A0812 100%)",
        borderLeft: "1px solid rgba(175,169,236,0.08)",
      }}
    >
      {/* HEADER */}
      <div 
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(175,169,236,0.07)" }}
      >
        <div className="flex items-center gap-2">
          {isSettingsOpen ? (
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(255,255,255,0.04)] text-[rgba(148,140,195,0.6)] hover:text-white transition-colors"
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
          ) : (
            <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: "rgba(83,74,183,0.2)" }}>
              <Sparkles style={{ width: 14, height: 14, color: "#818CF8" }} />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-white leading-tight">
              {isSettingsOpen ? "Configurações" : "Lastra Chat"}
            </span>
            {!isSettingsOpen && <span className="text-[10px] text-[rgba(148,140,195,0.6)] leading-tight truncate max-w-[150px]">{obraNome}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isSettingsOpen && (
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(255,255,255,0.04)] text-[rgba(148,140,195,0.6)] hover:text-white transition-colors"
              title="Configurações do Chat"
            >
              <Settings style={{ width: 15, height: 15 }} />
            </button>
          )}
          <button 
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(255,255,255,0.04)] text-[rgba(148,140,195,0.6)] hover:text-white transition-colors"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {isSettingsOpen ? (
        <ChatSettings />
      ) : (
        <>
          {/* MESSAGES AREA */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col" style={{ background: "transparent" }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3 opacity-60">
                <Sparkles style={{ width: 32, height: 32, color: "#818CF8" }} />
                <p className="text-[13px] text-[rgba(148,140,195,0.6)]">
                  Sou seu assistente Lastra. Pergunte sobre o andamento, custos e riscos da obra.
                </p>
              </div>
            ) : (
              messages.map(msg => <ChatMessage key={msg.id} message={msg} />)
            )}
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="rounded-2xl px-4 py-2.5 shadow-sm flex items-center" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(175,169,236,0.08)", borderBottomLeftRadius: "4px" }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* SUGGESTIONS & INPUT */}
          <div 
            className="flex flex-col shrink-0" 
            style={{ borderTop: "1px solid rgba(175,169,236,0.07)" }}
          >
            {!isLoading && <ChatSuggestions suggestions={getSuggestions()} onSelect={(s) => simulateAssistantResponse(s)} />}
            
            <div className="p-3 pt-1">
              <div 
                className="flex items-end gap-2 p-2 rounded-xl transition-colors"
                style={{ 
                  background: "rgba(255,255,255,0.03)", 
                  border: "1px solid rgba(175,169,236,0.1)" 
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre a obra..."
                  className="flex-1 max-h-24 min-h-[24px] resize-none bg-transparent outline-none text-[13px] text-white placeholder-[rgba(148,140,195,0.4)] py-0.5 px-1"
                  rows={1}
                />
                <div className="flex items-center gap-1 shrink-0 mb-0.5">
                  <button 
                    onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
                    onPointerUp={async (e) => {
                      e.preventDefault();
                      setIsProcessingVoice(true);
                      try {
                        const text = await stopRecording();
                        if (text.trim()) {
                          simulateAssistantResponse(text);
                        }
                      } catch {} finally {
                        setIsProcessingVoice(false);
                      }
                    }}
                    onPointerLeave={async (e) => {
                      if (isRecording) {
                        setIsProcessingVoice(true);
                        try {
                          const text = await stopRecording();
                          if (text.trim()) {
                            simulateAssistantResponse(text);
                          }
                        } catch {} finally {
                          setIsProcessingVoice(false);
                        }
                      }
                    }}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      isRecording 
                        ? "bg-destructive/20 text-destructive animate-pulse" 
                        : "text-[rgba(148,140,195,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                    title="Segure para falar"
                  >
                    {isProcessingVoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic style={{ width: 14, height: 14 }} className={isRecording ? "scale-110" : ""} />}
                  </button>
                  <button 
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                    style={{
                      background: inputValue.trim() && !isLoading ? "#534AB7" : "rgba(255,255,255,0.05)",
                      color: inputValue.trim() && !isLoading ? "#fff" : "rgba(148,140,195,0.3)"
                    }}
                  >
                    <Send style={{ width: 12, height: 12, marginLeft: 2 }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Desktop wrapper behavior
  const panelWidth = isOpen ? 320 : 0;
  
  return (
    <>
      {/* Mobile Overlay */}
      <div className="md:hidden">
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
            <div className="relative w-[320px] max-w-[85vw] h-full bg-white shadow-2xl transition-transform duration-300 transform translate-x-0">
              {panelContent}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Inline Panel */}
      <div 
        className="hidden md:block shrink-0 transition-all duration-300 ease-out h-full overflow-hidden"
        style={{ width: panelWidth }}
      >
        <div style={{ width: 320, height: "100%" }}>
          {panelContent}
        </div>
      </div>
    </>
  );
}
