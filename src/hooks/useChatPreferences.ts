import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/untyped";
import { ChatPreferences } from "@/lib/chat/metaprompts";

const defaultPreferences: ChatPreferences = {
  estilo: "conciso",
  expertise: "intermediario",
  foco: "geral",
  proatividade: "proativo",
  wake_word_enabled: false,
  auto_speak: false,
  voice_fab_enabled: true
};

export function useChatPreferences() {
  const [preferences, setPreferences] = useState<ChatPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        setIsLoading(true);
        const { data: userResp } = await supabase.auth.getUser();
        if (!userResp.user) return;

        const { data, error } = await supabase
          .from("chat_preferences")
          .select("*")
          .eq("user_id", userResp.user.id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao buscar preferências de chat:", error);
          return;
        }

        if (data) {
          setPreferences({
            estilo: data.estilo as ChatPreferences["estilo"],
            expertise: data.expertise as ChatPreferences["expertise"],
            foco: data.foco as ChatPreferences["foco"],
            proatividade: data.proatividade as ChatPreferences["proatividade"],
            wake_word_enabled: !!data.wake_word_enabled,
            auto_speak: !!data.auto_speak,
            voice_fab_enabled: data.voice_fab_enabled !== false, // default true if null
          });
        }
      } catch (err) {
        console.error("Erro inesperado ao buscar preferências:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreferences();
  }, []);

  const updatePreferences = useCallback(async (partial: Partial<ChatPreferences>) => {
    try {
      setIsSaving(true);
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp.user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userResp.user.id)
        .single();
        
      if (!profile) throw new Error("Perfil não encontrado");

      const newPrefs = { ...preferences, ...partial };
      
      const { error } = await supabase
        .from("chat_preferences")
        .upsert({
          user_id: userResp.user.id,
          company_id: profile.company_id,
          ...newPrefs,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;

      setPreferences(newPrefs);
      return true;
    } catch (err) {
      console.error("Erro ao salvar preferências de chat:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [preferences]);

  return {
    preferences,
    updatePreferences,
    isLoading,
    isSaving
  };
}
