"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function passwordStrength(password: string) {\n  let score = 0;\n  if (password.length >= 8) score++;\n  if (password.length >= 12) score++;\n  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;\n  if (/\\d/.test(password)) score++;\n  if (/[^A-Za-z0-9]/.test(password)) score++;\n  return score;\n}\n\nexport default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);\n  const strength = useMemo(() => passwordStrength(password), [password]);\n  const strengthLabel = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"][strength];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback?next=/profile",
        },
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-6xl items-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted">
            <span className="h-px w-8 bg-line" />
            Account / Confirmation
          </div>
          <MailCheck size={28} strokeWidth={1.25} />
          <h1 className="mt-7 text-4xl tracking-[-0.05em] sm:text-5xl">CHECK YOUR EMAIL.</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            We sent a confirmation link to <span className="text-fg">{email}</span>. Confirm your email to activate your AI Hub account.
          </p>
          <Link href="/login" className="mt-8 flex h-12 items-center justify-center gap-3 bg-fg text-bg text-[11px] uppercase tracking-[0.12em]">
            Go to login <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-6xl items-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted">
          <span className="h-px w-8 bg-line" />
          Account / Sign up
        </div>
        <h1 className="text-4xl tracking-[-0.05em] sm:text-5xl">CREATE ACCOUNT.</h1>
        <p className="mt-4 text-xs leading-6 text-muted">One account for your saved AI tools and profile.</p>
        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Email</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full border border-line bg-transparent px-4 text-sm focus:border-fg focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Password</span>
            <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full border border-line bg-transparent px-4 text-sm focus:border-fg focus:outline-none" />
          </label>
          {message && <p className="border border-line px-4 py-3 text-xs leading-5 text-muted">{message}</p>}
          <button disabled={loading || strength < 3} className="flex h-12 w-full items-center justify-center gap-3 bg-fg text-bg text-[11px] uppercase tracking-[0.12em] disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <>Create account <ArrowRight size={15} /></>}
          </button>
        </form>
        <p className="mt-7 text-xs text-muted">Already have an account? <Link href="/login" className="text-fg underline underline-offset-4">Log in</Link></p>
      </div>
    </main>
  );
}
