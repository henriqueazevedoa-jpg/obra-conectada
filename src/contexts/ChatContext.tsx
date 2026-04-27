import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useChat as useChatBackend } from "@/hooks/useChat";
import type { ChatMessage } from "@/lib/chat/types";

// Re-export para compatibilidade com imports existentes
export type { ChatMessage } from "@/lib/chat/types";



interface ChatContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  currentObraId: string | null;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  messages: ChatMessage[];
  addMessage: (content: string, role: "user" | "assistant") => void;
  isLoading: boolean;
  simulateAssistantResponse: (userMessage: string) => void;
  usage: { hoje: number; limite: number } | null;
  error: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const location = useLocation();
  
  let currentObraId: string | null = null;
  const match = location.pathname.match(/\/obras\/([a-zA-Z0-9-]+)/);
  if (match) {
    currentObraId = match[1];
  }

  const { messages, sendMessage, isLoading, usage, error } = useChatBackend(currentObraId);

  const toggle = () => setIsOpen(prev => !prev);
  const close = () => setIsOpen(false);

  // Monitora novas mensagens para incrementar o unreadCount se o chat estiver fechado
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages.length, isOpen]); // depende do length para triggar na adição

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const addMessage = useCallback((content: string, role: "user" | "assistant") => {
    // Compatibilidade com o mock anterior. Não faremos nada aqui pois o hook 
    // gerencia seu próprio estado, mas a assinatura é mantida para não quebrar dependências.
    console.warn("addMessage is deprecated. Use simulateAssistantResponse/sendMessage instead.");
  }, []);

  const simulateAssistantResponse = useCallback((userMessage: string) => {
    sendMessage(userMessage);
  }, [sendMessage]);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        toggle,
        close,
        currentObraId,
        unreadCount,
        setUnreadCount,
        messages,
        addMessage,
        isLoading,
        simulateAssistantResponse,
        usage,
        error
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
