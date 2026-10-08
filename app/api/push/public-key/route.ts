import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "VAPID_PUBLIC_KEY is not configured" }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}