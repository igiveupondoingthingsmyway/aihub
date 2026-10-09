import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendPushNotification, type PushKind } from "@/lib/push";
import { createClient } from "@supabase/supabase-js";

const allowedKinds: PushKind[] = ["message", "post_like", "post_comment", "friend", "friend_accepted"];

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
      console.error("[PUSH API] Missing required Supabase environment variables.");
      return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    });

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

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: senderProfile } = await admin.from("profiles").select("username").eq("id", user.id).maybeSingle();
    const senderUsername = senderProfile?.username ?? (typeof user.user_metadata?.username === "string" ? user.user_metadata.username : "someone");

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
