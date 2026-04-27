import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped";
import type { ChatMessage } from "@/lib/chat/types";
import { synthesizeSpeech } from "@/lib/voice/voiceService";
import { useChatPreferences } from "@/hooks/useChatPreferences";

export function useChat(obraId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ hoje: number; limite: number } | null>(null);
  const { preferences } = useChatPreferences();

  // Carregar histórico
  useEffect(() => {
    async function loadHistory() {
      if (!obraId) return;
      
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp.user) return;

      // Pegar a sessão mais recente aberta por este usuário para esta obra
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("obra_id", obraId)
        .eq("user_id", userResp.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (session) {
        setSessionId(session.id);
        const { data: msgData } = await supabase
          .from("chat_messages")
          .select("id, role, content, created_at")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (msgData && msgData.length > 0) {
          const formatted = msgData.reverse().map(m => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.created_at)
          }));
          setMessages(formatted);
        } else {
          setMessages([]);
        }
      } else {
        setSessionId(null);
        setMessages([]);
      }
    }
    
    loadHistory();
  }, [obraId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!obraId) {
      setError("Selecione uma obra antes de interagir com o assistente.");
      return;
    }

    // Otimista: adiciona mensagem na tela
    const tempUserId = Math.random().toString(36).substring(7);
    const userMsg: ChatMessage = {
      id: tempUserId,
      role: "user",
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("lastra-chat", {
        body: {
          mensagem: content,
          obra_id: obraId,
          session_id: sessionId
        }
      });

      if (fnError) {
        throw new Error(fnError.message || "Falha de conexão com o assistente");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      if (data.usage) {
        setUsage({ hoje: data.usage.mensagens_hoje, limite: data.usage.limite });
      }

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      if (preferences.auto_speak) {
        synthesizeSpeech(data.message).catch(err => console.error("Falha no TTS", err));
      }
      
    } catch (err: any) {
      console.error("Chat error:", err);
      // Mensagem de erro mockada na UI sem salvar no banco
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao se comunicar com o sistema: " + (err.message || err),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [obraId, sessionId]);

  return {
    messages,
    sendMessage,
    isLoading,
    usage,
    error
  };
}
