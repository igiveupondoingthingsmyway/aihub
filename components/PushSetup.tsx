"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushSetup() {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "error">("idle");
  const [message, setMessage] = useState("");

  async function enable() {
    if (!window.isSecureContext) {
      setStatus("error");
      setMessage("Push requires HTTPS.");
      return;
    }

    if (!("Notification" in window)) {
      setStatus("error");
      setMessage("System notifications are unavailable in this browser.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");

      const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
      if (!keyResponse.ok) throw new Error("Push notifications are not configured yet.");
      const { publicKey } = await keyResponse.json();
      if (!publicKey) throw new Error("Push notifications are not configured yet.");

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      if (!registration.pushManager) {
        throw new Error(
          /iPhone|iPad|iPod/i.test(navigator.userAgent) && !isStandalone
            ? "On iPhone/iPad, add SHB to the Home Screen and open the app from there to enable push."
            : "Web Push is unavailable in this browser context."
        );
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      });

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You need to be signed in.");

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Could not read the push subscription.");
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
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Could not save push subscription.");

      setStatus("enabled");
      setMessage("PUSH ENABLED");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not enable push.");
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <button
        type="button"
        onClick={() => void enable()}
        disabled={status === "loading" || status === "enabled"}
        className="w-full border border-line px-3 py-3 text-[9px] uppercase tracking-[0.14em] hover:bg-fg hover:text-bg disabled:opacity-50"
      >
        {status === "loading" ? "ENABLING..." : status === "enabled" ? "PUSH ENABLED" : "ENABLE PUSH NOTIFICATIONS"}
      </button>
      {message && <p className={"mt-2 text-[8px] uppercase tracking-[0.1em] " + (status === "error" ? "text-muted" : "")}>{message}</p>}
    </div>
  );
}