"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Orbit, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links=[{href:"/#categories",label:"Categories"},{href:"/#tools",label:"All tools"}];

export function Navbar(){
 const [open,setOpen]=useState(false); const [signedIn,setSignedIn]=useState(false);
 useEffect(()=>{const s=createClient();s.auth.getUser().then(({data})=>setSignedIn(!!data.user));const {data}=s.auth.onAuthStateChange((_e,session)=>setSignedIn(!!session));return()=>data.subscription.unsubscribe();},[]);
 return <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
  <Link href="/" className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.08em]"><span className="flex h-7 w-7 items-center justify-center border border-line"><Orbit size={14} strokeWidth={1.5}/></span>AI / HUB</Link>
  <nav className="hidden items-center gap-7 text-[11px] uppercase tracking-[0.1em] text-muted md:flex">{links.map(l=><Link key={l.href} href={l.href} className="transition-colors hover:text-fg">{l.label}</Link>)}<Link href="/profile" className="flex items-center gap-2 border border-line px-4 py-2 text-fg transition-colors hover:bg-fg hover:text-bg"><UserRound size={13}/>{signedIn?"Profile":"Account"}</Link></nav>
  <button className="p-2 text-muted hover:text-fg md:hidden" aria-label={open?"Close menu":"Open menu"} aria-expanded={open} onClick={()=>setOpen(o=>!o)}>{open?<X size={20}/>:<Menu size={20}/>}</button>
 </div>{open&&<nav className="border-t border-line px-5 py-4 md:hidden">{links.map(l=><Link key={l.href} href={l.href} onClick={()=>setOpen(false)} className="block py-3 text-xs uppercase tracking-[0.1em] text-muted hover:text-fg">{l.label}</Link>)}<Link href="/profile" className="mt-2 flex items-center justify-center gap-2 border border-line py-3 text-xs uppercase tracking-[0.1em] text-fg"><UserRound size={13}/>{signedIn?"Profile":"Account"}</Link></nav>}</header>;
}