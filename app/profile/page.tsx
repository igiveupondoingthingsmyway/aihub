"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [email,setEmail]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{ createClient().auth.getUser().then(({data})=>{if(!data.user){window.location.href="/login";return;} setEmail(data.user.email??"");setLoading(false);});},[]);
  async function logout(){await createClient().auth.signOut();window.location.href="/";}
  if(loading)return <main className="mx-auto max-w-6xl px-5 py-24 text-xs uppercase tracking-[0.12em] text-muted sm:px-8">Loading...</main>;
  return <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
    <div className="border-y border-line py-3 text-[10px] uppercase tracking-[0.18em] text-muted">Account / Profile</div>
    <div className="mt-12 flex flex-col justify-between gap-10 border-b border-line pb-12 sm:flex-row sm:items-end"><div>
      <div className="flex h-12 w-12 items-center justify-center border border-line"><UserRound size={19} strokeWidth={1.5}/></div>
      <h1 className="mt-7 text-4xl tracking-[-0.05em] sm:text-6xl">YOUR PROFILE.</h1><p className="mt-4 text-sm text-muted">{email}</p>
    </div><button onClick={logout} className="flex w-fit items-center gap-2 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg"><LogOut size={14}/> Log out</button></div>
    <section className="mt-12"><div className="flex items-baseline justify-between border-b border-line pb-3"><h2 className="text-xs uppercase tracking-[0.16em]">Saved tools</h2><Link href="/#tools" className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-fg">Browse tools →</Link></div><div className="py-14 text-xs text-muted">Your saved AI tools will appear here.</div></section>
  </main>;
}
