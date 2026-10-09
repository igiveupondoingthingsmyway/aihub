import { createBrowserClient } from "@supabase/ssr";

// These are public client credentials for this project, not service-role secrets.
// Environment variables still take precedence; the fallback keeps preview builds
// working if Vercel only has the variables assigned to Production.
const SUPABASE_URL = "https://pybzgbteslipuyobmqdc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sXxkFu7n8eqSUgtP8BFc8Q_G9Gj-bAi";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;

  return createBrowserClient(url, key);
}
