"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = { params: Promise<{ username: string }> };
type Message = { id: string; sender_id: string; content: string; created_at: string };\ntype Profile = { id: string; username: string; avatar_url: string };

export default function ChatPage({ params }: Props) {
  const [username, setUsername] = useState("");
  const [me, setMe] = useState("");
  const [otherId, setOtherId] = useState("");\n  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    async function load() {
      const { username: rawUsername } = await params;
      const target = decodeURIComponent(rawUsername).toLowerCase();
      setUsername(target);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setMe(user.id);

      const { data: profile } = await supabase.from("profiles").select("id,username").eq("username", target).maybeSingle();
      if (!profile) { setError("User not found."); setLoading(false); return; }
      setOtherId(profile.id);

      const { data: conversation, error: rpcError } = await supabase.rpc("get_or_create_conversation", { other_user: targetProfile.id });
      if (rpcError || !conversation) { setError(rpcError?.message ?? "Unable to open conversation."); setLoading(false); return; }
      setConversationId(conversation);

      const { data } = await supabase.from("messages").select("id,sender_id,content,created_at").eq("conversation_id", conversation).order("created_at", { ascending: true });
      setMessages(data ?? []);

      channel = supabase.channel("chat-" + conversation)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversation }, (payload) => {
          const incoming = payload.new as Message;
          setMessages((current) => current.some((m) => m.id === incoming.id) ? current : [...current, incoming]);
        })
        .subscribe();
      setLoading(false);
    }
    load();
    return () => { if (channel) createClient().removeChannel(channel); };
  }, [params]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content || !conversationId || !me) return;
    setText("");
    const supabase = createClient();
    const { data, error: sendError } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: me, content }).select("id,sender_id,content,created_at").single();
    if (sendError) { setText(content); setError(sendError.message); return; }
    if (data) setMessages((current) => current.some((m) => m.id === data.id) ? current : [...current, data]);
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-24 text-xs uppercase tracking-[0.12em] text-muted sm:px-8">Loading...</main>;
  if (error) return <main className="mx-auto max-w-6xl max-w-6xl px-5 py-24 sm:px-8"><p className="text-sm">{error}</p><Link href="/messages" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] underline">Back to messages</Link></main>;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-center justify-between border-y border-line py-4">
        <Link href="/messages" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-fg"><ArrowLeft size={14}/> Messages</Link>
        <div className="flex items-center gap-3">\n          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line">\n            {profile?.avatar_url ? (\n              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />\n            ) : (\n              <span className="text-[9px] uppercase">{username.slice(0, 1)}</span>\n            )}\n          </span>\n          <span className="text-xs">@{username}</span>\n        </div>
      </div>

      <div className="mt-6 min-h-[55vh] border-b border-line">
        {messages.length === 0 ? (
          <div className="flex min-h-[55vh] items-center justify-center text-center">
            <div><p className="text-xs uppercase tracking-[0.12em]">Start the conversation.</p><p className="mt-2 text-[10px] text-muted">Send the first message to @{username}.</p></div>
          </div>
        ) : (
          <div className="space-y-3 py-6">
            {messages.map((message) => (
              <div key={message.id} className={"flex " + (message.sender_id === me ? "justify-end" : "justify-start")}>
                <div className={"max-w-[80%] px-4 py-3 text-sm leading-6 " + (message.sender_id === me ? "bg-fg text-bg" : "border border-line")}>
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={bottom}/>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 4000))} placeholder="WRITE A MESSAGE..." className="h-12 min-w-0 flex-1 border border-line bg-transparent px-4 text-xs uppercase tracking-[0.06em] focus:border-fg focus:outline-none"/>
        <button disabled={!text.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center bg-fg text-bg disabled:opacity-40" aria-label="Send message"><Send size={15}/></button>
      </form>
    </main>
  );
}
