import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/untyped";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const isSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verifica se já está inscrito ao montar
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permissão negada");
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("VITE_VAPID_PUBLIC_KEY não configurada");
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp.user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userResp.user.id)
        .single();

      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userResp.user.id,
          company_id: profile?.company_id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" }
      );

      setIsSubscribed(true);
    } catch (err) {
      console.error("Erro ao inscrever para push:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        const { data: userResp } = await supabase.auth.getUser();
        if (userResp.user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userResp.user.id)
            .eq("endpoint", endpoint);
        }
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Erro ao desinscrever do push:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
