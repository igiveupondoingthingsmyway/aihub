"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Byte } from "@/components/Byte";

const BYTE_ICON_SMALL = "/ic_stat_byte_96.png.png";
const BYTE_ICON_LARGE = "/byte-icon-512.png.png";

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
    return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="byte-loader" role="status" aria-live="polite"><Byte state="loading" /><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;;
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
              <img src={BYTE_ICON_LARGE} alt="" className="mx-auto h-20 w-20 object-contain" />
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
                    <img src={BYTE_ICON_SMALL} alt="" className="h-full w-full object-contain p-1" />
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