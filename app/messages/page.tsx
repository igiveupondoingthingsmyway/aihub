"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; bio: string; avatar_url: string; last_seen: string };
type Conversation = { id: string; user_one: string; user_two: string; other?: Profile };

export default function MessagesPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUser({ id: user.id });

      const { data: conversationRows } = await supabase
        .from("conversations")
        .select("id,user_one,user_two")
        .or("user_one.eq." + user.id + ",user_two.eq." + user.id)
        .order("created_at", { ascending: false });

      if (conversationRows?.length) {
        const otherIds = conversationRows.map(c => c.user_one === user.id ? c.user_two : c.user_one);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,username,bio,avatar_url,last_seen")
          .in("id", otherIds);

        setConversations(
          conversationRows.map(c => ({
            ...c,
            other: profiles?.find(p => p.id === (c.user_one === user.id ? c.user_two : c.user_one)),
          }))
        );
      } else {
        setConversations([]);
      }

      setLoading(false);
    }

    void load();
    const poll = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(poll);
  }, []);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="byte-loader" role="status" aria-live="polite"><svg className="byte-svg" viewBox="270 85 210 150" aria-hidden="true" focusable="false"><line className="byte-ground" x1="285" y1="224" x2="395" y2="224"/><g className="byte-bob"><rect className="byte-leg byte-leg-a" x="344" y="210" width="10" height="14"/><rect className="byte-leg byte-leg-b" x="372" y="210" width="10" height="14"/><line className="byte-antenna-line" x1="340" y1="120" x2="340" y2="102"/><rect className="byte-antenna" x="335" y="92" width="10" height="10"/><rect className="byte-body" x="290" y="120" width="100" height="90"/><path className="byte-body" d="M306 210 L306 232 L330 210"/><line className="byte-seam" x1="307" y1="210" x2="329" y2="210"/><g className="byte-eyes"><rect x="314" y="152" width="14" height="14"/><rect x="352" y="152" width="14" height="14"/></g><rect className="byte-cursor" x="328" y="186" width="24" height="4"/></g><rect className="byte-bubble" x="408" y="104" width="68" height="30"/><rect className="byte-dot" x="420" y="115" width="8" height="8"/><rect className="byte-dot byte-dot-2" x="438" y="115" width="8" height="8"/><rect className="byte-dot byte-dot-3" x="456" y="115" width="8" height="8"/></svg><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="flex items-center justify-between border-y border-line py-3 text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>Social / Messages</span>
        <Link href="/network" className="hover:text-fg">Network →</Link>
      </div>

      <section className="mt-12 max-w-4xl">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <div>
            <p className="mb-3 text-[9px] uppercase tracking-[0.18em] text-muted">Private conversations</p>
            <h1 className="text-5xl tracking-[-0.06em] sm:text-7xl">CHATS.</h1>
          </div>
          <MessageCircle size={22} strokeWidth={1.15} />
        </div>

        {conversations.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center border-b border-line text-center">
            <div>
              <MessageCircle className="mx-auto" size={30} strokeWidth={1.1} />
              <p className="mt-5 text-xs uppercase tracking-[0.14em]">No conversations yet.</p>
              <p className="mt-2 max-w-xs text-[10px] leading-5 text-muted">Go to Network and start a conversation with someone.</p>
              <Link href="/network" className="mt-5 inline-flex items-center gap-2 border border-line px-4 py-3 text-[9px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg">Find people <ArrowRight size={12}/></Link>
            </div>
          </div>
        ) : (
          <div className="border-b border-line">
            {conversations.map(conversation => conversation.other && (
              <Link
                key={conversation.id}
                href={"/messages/" + conversation.other.username}
                className="group flex items-center gap-4 border-b border-line py-5 transition-colors hover:text-muted"
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-line">
                  {conversation.other.avatar_url ? (
                    <img src={conversation.other.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] uppercase">{conversation.other.username.slice(0, 1)}</span>
                  )}
                </span>
                <div>
                  <p className="text-xs">@{conversation.other.username}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-muted">Conversation</p>
                </div>
                <ArrowRight className="ml-auto transition-transform group-hover:translate-x-1" size={14}/>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}