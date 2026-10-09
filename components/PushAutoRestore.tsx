"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushAutoRestore() {
  useEffect(() => {
    let cancelled = false;
    async function restoreSubscription() {
      if (!("Notification" in window) || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
      try {
        const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
        if (!keyResponse.ok) {
          console.warn("[PUSH RESTORE] Public key request failed:", keyResponse.status);
          return;
        }
        const { publicKey } = await keyResponse.json();
        if (!publicKey) return;

        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (!registration.pushManager) return;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToUint8Array(publicKey),
          });
        }
        if (cancelled) return;

        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user || cancelled) return;

        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          throw new Error("Browser returned an incomplete push subscription.");
        }
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            userAgent: navigator.userAgent,
          }),
        });
        if (!response.ok) {
          const details = await response.json().catch(() => ({}));
          throw new Error(details.error || "Could not save push subscription.");
        }
        console.info("[PUSH RESTORE] Subscription synchronized.");
      } catch (error) {
        console.warn("[PUSH RESTORE] Could not restore subscription:", error);
      }
    }

    void restoreSubscription();

    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        void restoreSubscription();
      }
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
