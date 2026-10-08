import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendPushNotification, type PushKind } from "@/lib/push";

const allowedKinds: PushKind[] = ["message", "post_like", "post_comment", "friend", "friend_accepted"];

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";
    const kind = body.kind as PushKind;
    const url = typeof body.url === "string" ? body.url : "/";
    const messageBody = typeof body.body === "string" ? body.body : undefined;

    if (!targetUserId || !allowedKinds.includes(kind)) {
      return NextResponse.json({ error: "Invalid push request" }, { status: 400 });
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ sent: 0 });
    }

    const senderUsername = typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username
      : "someone";

    const result = await sendPushNotification({
      userId: targetUserId,
      kind,
      senderUsername,
      url,
      body: messageBody,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[PUSH API]", error);
    return NextResponse.json({ error: error?.message ?? "Push failed" }, { status: 500 });
  }
}
