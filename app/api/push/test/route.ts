import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendPushNotification } from "@/lib/push";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll(values) {
            try {
              values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {}
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in before testing push notifications." }, { status: 401 });

    const result = await sendPushNotification({
      userId: user.id,
      kind: "message",
      senderUsername: "SHB",
      url: "/profile",
      body: "Push test from SHB. Your device can receive notifications.",
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Push test failed.";
    console.error("[PUSH TEST]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
