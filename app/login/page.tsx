"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/profile";
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to log in."); }
    finally { setLoading(false); }
  }
  return <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-6xl items-center px-5 py-16 sm:px-8"><div className="w-full max-w-md">
    <div className="mb-10 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted"><span className="h-px w-8 bg-line" /> Account / Login</div>
    <h1 className="text-4xl tracking-[-0.05em] sm:text-5xl">WELCOME BACK.</h1>
    <p className="mt-4 text-xs leading-6 text-muted">Log in to save tools and keep your SHB profile.</p>
    <form onSubmit={handleSubmit} className="mt-10 space-y-5">
      <label className="block"><span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Email</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="h-12 w-full border border-line bg-transparent px-4 text-sm focus:border-fg focus:outline-none" /></label>
      <label className="block"><span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Password</span><input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="h-12 w-full border border-line bg-transparent px-4 text-sm focus:border-fg focus:outline-none" /></label>
      {message && <p className="border border-line px-4 py-3 text-xs leading-5 text-muted">{message}</p>}
      <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-3 bg-fg text-bg text-[11px] uppercase tracking-[0.12em] disabled:opacity-50">{loading?<Loader2 size={15} className="animate-spin"/>:<>Log in <ArrowRight size={15}/></>}</button>
    </form>
    <p className="mt-7 text-xs text-muted">No account? <Link href="/signup" className="text-fg underline underline-offset-4">Create one</Link></p>
  </div></main>;
}
