"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordValid = password.length >= 6 && /[A-Z]/.test(password);
  const strengthLabel = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"][strength];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!passwordValid) return;
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback?next=/profile",
        },
      });

      if (error) throw error;
      if (!data.session) {
        throw new Error("Email confirmation is still enabled in Supabase. Disable Confirm email in Authentication settings.");
      }
      window.location.href = "/profile";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
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
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full border border-line bg-transparent px-4 text-sm focus:border-fg focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Password</span>
            <div className="relative">
              <input
                required
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
                className="h-12 w-full border border-line bg-transparent px-4 pr-12 text-sm focus:border-fg focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-muted hover:text-fg"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="mt-2 block text-[10px] uppercase tracking-[0.08em] text-muted">
              Password must be at least 6 characters and include an uppercase letter.
            </span>
          </label>

          {password && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={"h-1 flex-1 " + (i <= strength ? "bg-fg" : "bg-line")} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-[0.1em] text-muted">
                <span>Password strength</span>
                <span className="text-fg">{strengthLabel}</span>
              </div>
            </div>
          )}

          {message && <p className="border border-line px-4 py-3 text-xs leading-5 text-muted">{message}</p>}

          <button
            disabled={loading || !passwordValid}
            className="flex h-12 w-full items-center justify-center gap-3 bg-fg text-bg text-[11px] uppercase tracking-[0.12em] disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <>Create account <ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="mt-7 text-xs text-muted">
          Already have an account? <Link href="/login" className="text-fg underline underline-offset-4">Log in</Link>
        </p>
      </div>
    </main>
  );
}
