"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreHorizontal, Send, UserRound, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Byte } from "@/components/Byte";

type Props = { params: Promise<{ username: string }> };
type Message = { id: string; sender_id: string; content: string; created_at: string };
type Profile = { id: string; username: string; bio: string; avatar_url: string; last_seen: string };

export default function ChatPage({ params }: Props) {
  const [username, setUsername] = useState("");
  const [me, setMe] = useState("");
  const [otherId, setOtherId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarSrc, setAvatarSrc] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    async function load() {
      try {
        const { username: rawUsername } = await params;
        const target = decodeURIComponent(rawUsername).toLowerCase();
        setUsername(target);
        setError("");

        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          window.location.href = "/login";
          return;
        }
        setMe(user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id,username,bio,avatar_url,last_seen")
          .eq("username", target)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!profile) {
          setError("User not found.");
          return;
        }
        setOtherId(profile.id);

        if (profile.avatar_url) {
          const isExternalUrl = profile.avatar_url.startsWith("http://") || profile.avatar_url.startsWith("https://");
          if (isExternalUrl) {
            const marker = "/storage/v1/object/public/profile-media/";
            const markerIndex = profile.avatar_url.indexOf(marker);
            if (markerIndex !== -1) {
              const storagePath = decodeURIComponent(profile.avatar_url.slice(markerIndex + marker.length));
              const { data: signed } = await supabase.storage.from("profile-media").createSignedUrl(storagePath, 60 * 60);
              setAvatarSrc(signed?.signedUrl || profile.avatar_url);
            } else {
              setAvatarSrc(profile.avatar_url);
            }
          } else {
            const { data: signed } = await supabase.storage.from("profile-media").createSignedUrl(profile.avatar_url, 60 * 60);
            setAvatarSrc(signed?.signedUrl || "");
          }
        } else {
          setAvatarSrc("");
        }

        const { data: conversation, error: rpcError } = await supabase.rpc("get_or_create_conversation", { other_user: profile.id });
        if (rpcError) throw rpcError;
        if (!conversation) throw new Error("Unable to open conversation.");
        setConversationId(conversation);

        const { error: notificationError } = await supabase.rpc("mark_conversation_notifications_read", { target_conversation: conversation });
        if (notificationError) {
          console.warn("Could not mark chat notifications as read:", notificationError.message);
        }

        const { data, error: messagesError } = await supabase
          .from("messages")
          .select("id,sender_id,content,created_at")
          .eq("conversation_id", conversation)
          .order("created_at", { ascending: true });
        if (messagesError) throw messagesError;
        setMessages(data ?? []);

        channel = supabase.channel("chat-" + conversation)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversation }, (payload) => {
            const incoming = payload.new as Message;
            setMessages((current) => current.some((m) => m.id === incoming.id) ? current : [...current, incoming]);
          })
          .subscribe();
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Unable to load chat.";
        console.error("Chat load failed:", loadError);
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { if (channel) createClient().removeChannel(channel); };
  }, [params, retryKey]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (text.trim()) {
        void sendMessage(event as unknown as FormEvent);
      }
    }
  }

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

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16"><div className="byte-loader" role="status" aria-live="polite"><Byte state="loading" /><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;
  if (error) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16"><div className="byte-state" role="alert"><Byte state="error" /><h3>Something broke</h3><p>{error}</p><button type="button" className="byte-retry" onClick={() => { setError(""); setLoading(true); setRetryKey((key) => key + 1); }}>Retry</button><Link href="/messages" className="mt-4 text-[9px] uppercase tracking-[0.12em] underline">Back to messages</Link></div></main>;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-center justify-between border-y border-line py-4">
        <Link href="/messages" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-fg"><ArrowLeft size={14}/> Messages</Link>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line">
            {avatarSrc ? (
              <img src={avatarSrc} alt={"@" + username + " avatar"} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[9px] uppercase">{username.slice(0, 1)}</span>
            )}
          </span>
          <span className="text-xs">@{username}</span>
          <Link href={"/profile/" + username} aria-label={"Open @" + username + " profile"} className="ml-3 text-muted hover:text-fg"><UserRound size={15} strokeWidth={1.4}/></Link>
          <button type="button" aria-label="Chat options" className="ml-1 text-muted hover:text-fg"><MoreHorizontal size={17} strokeWidth={1.4}/></button>
        </div>
      </div>

      <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-[1fr_280px]">
        <section className="min-h-[55vh] border-b border-line">
        {messages.length === 0 ? (
          <div className="byte-state min-h-[55vh]"><Byte state="idle" /><h3>No messages yet</h3><p>Say hi to @{username}.</p></div>
        ) : (
          <div className="space-y-3 py-6">
            {messages.map((message) => (
              <div key={message.id} className={"flex " + (message.sender_id === me ? "justify-end" : "justify-start")}>
                <div className={"max-w-[80%] px-4 py-3 text-sm leading-6 " + (message.sender_id === me ? "bg-fg text-bg" : "border border-line")}>
                  <div>{message.content}</div>
                  <div className={"mt-2 text-[8px] uppercase tracking-[0.08em] " + (message.sender_id === me ? "text-bg/60" : "text-muted")}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottom}/>
          </div>
        )}
        </section>

        <aside className="min-h-[55vh] h-full border border-line lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[9px] uppercase tracking-[0.16em]">Profile</span>
            <Users size={14} strokeWidth={1.2} />
          </div>

          <div className="px-5 py-6">
            <div className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg">
              {avatarSrc ? (
                <img src={avatarSrc} alt={"@" + username + " avatar"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl uppercase">{username.slice(0, 1)}</span>
              )}
            </div>

            <div className="mt-5 text-center">
              <p className="text-sm">@{username}</p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.12em] text-muted">
                Active on SHB
              </p>
            </div>

            <div className="mt-6 border-y border-line py-4">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted">Bio</p>
              <p className="mt-2 text-xs leading-5">
                {profile?.bio || "No bio yet."}
              </p>
            </div>

            <Link
              href={"/profile/" + username}
              className="mt-4 flex items-center justify-center gap-2 border border-line px-4 py-3 text-[9px] uppercase tracking-[0.12em] transition-colors hover:bg-fg hover:text-bg"
            >
              <UserRound size={13} strokeWidth={1.25} />
              Open profile
            </Link>
          </div>
        </aside>
      </div>

      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 4000))} onKeyDown={handleKeyDown} placeholder="WRITE A MESSAGE..." className="h-12 min-w-0 flex-1 border border-line bg-transparent px-4 text-xs uppercase tracking-[0.06em] focus:border-fg focus:outline-none"/>
        <button disabled={!text.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center bg-fg text-bg disabled:opacity-40" aria-label="Send message"><Send size={15}/></button>
      </form>
    </main>
  );
}