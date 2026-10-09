import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type PushKind = "message" | "post_like" | "post_comment" | "friend" | "friend_accepted";

export async function sendPushNotification(input: {
  userId: string;
  kind: PushKind;
  senderUsername: string;
  url: string;
  body?: string;
}) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn("[PUSH] Missing server environment variables");
    return { sent: 0, skipped: true };
  }

  webpush.setVapidDetails("mailto:admin@shb.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", input.userId);

  if (error) throw error;

  const labels: Record<PushKind, string> = {
    message: "sent you a message",
    post_like: "liked your post",
    post_comment: "commented on your post",
    friend: "sent you a friend request",
    friend_accepted: "accepted your friend request",
  };

  const payload = JSON.stringify({
    title: "SHB",
    body: input.body ?? `@${input.senderUsername} ${labels[input.kind]}`,
    icon: "/byte-icon-512.png.png",
    badge: "/ic_stat_byte_96.png.png",
    image: "/byte-icon-512.png.png",
    url: input.url,
  });

  let sent = 0;
  for (const subscription of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload
      );
      sent += 1;
    } catch (error: any) {
      const status = error?.statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      } else {
        console.error("[PUSH] send failed", status ?? error?.message ?? error);
      }
    }
  }

  return { sent, skipped: false, subscriptions: (subscriptions ?? []).length };
}
