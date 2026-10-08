"use client";

import Link from "next/link";
import { Home, MessageSquare, Network, Plus, UserRound, X, Send } from "lucide-react";
import { MobileFeed } from "@/components/MobileFeed";
import { MobileNetwork } from "@/components/MobileNetwork";
import { MobileMessages } from "@/components/MobileMessages";
import { MobileProfile } from "@/components/MobileProfile";
import { usePathname } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const active = pathname === "/" ? "feed"
    : pathname.startsWith("/network") ? "network"
    : pathname.startsWith("/messages") ? "messages"
    : pathname.startsWith("/profile") ? "profile"
    : "";

  async function createPost(event: FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content || posting) return;
    setPosting(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const { error: insertError } = await supabase.from("posts").insert({ author_id: user.id, content });
    if (insertError) {
      setError(insertError.message);
    } else {
      setText("");
      setCreateOpen(false);
      window.location.href = "/";
    }
    setPosting(false);
  }

  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <Link href="/" className="mobile-logo">SHB</Link>
        <Link href="/messages" className="mobile-header-icon" aria-label="Messages">
          <MessageSquare size={17} strokeWidth={1.25} />
        </Link>
      </header>

      <div className="mobile-content">{pathname === "/" ? <MobileFeed /> : pathname.startsWith("/network") ? <MobileNetwork /> : pathname === "/messages" ? <MobileMessages /> : pathname === "/profile" ? <MobileProfile /> : children}</div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link href="/" className={active === "feed" ? "active" : ""} aria-label="Feed">
          <Home size={17} strokeWidth={1.25} /><span>Feed</span>
        </Link>
        <Link href="/network" className={active === "network" ? "active" : ""} aria-label="Network">
          <Network size={17} strokeWidth={1.25} /><span>Network</span>
        </Link>
        <button type="button" className="mobile-create-button" onClick={() => setCreateOpen(true)} aria-label="Create post">
          <Plus size={22} strokeWidth={1.25} />
        </button>
        <Link href="/messages" className={active === "messages" ? "active" : ""} aria-label="Messages">
          <MessageSquare size={17} strokeWidth={1.25} /><span>Messages</span>
        </Link>
        <Link href="/profile" className={active === "profile" ? "active" : ""} aria-label="Profile">
          <UserRound size={17} strokeWidth={1.25} /><span>Profile</span>
        </Link>
      </nav>

      {createOpen && (
        <div className="mobile-overlay">
          <div className="mobile-overlay-header">
            <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close create post"><X size={19} strokeWidth={1.25} /></button>
            <span>NEW POST</span>
            <span className="mobile-overlay-spacer" />
          </div>
          <form className="mobile-create-form" onSubmit={createPost}>
            <textarea
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 5000))}
              maxLength={5000}
              placeholder="WHAT'S HAPPENING?"
            />
            {error && <p className="mobile-form-error">{error}</p>}
            <div className="mobile-create-meta">
              <span>{text.length} / 5000</span>
              <button type="submit" disabled={!text.trim() || posting}>
                <Send size={13} strokeWidth={1.25} />
                {posting ? "POSTING" : "POST"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
