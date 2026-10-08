"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreHorizontal, Send, UserRound, Users, Sticker, X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { Byte } from "@/components/Byte";
import { ByteSticker } from "@/components/ByteSticker";

const BYTE_ICON_SMALL = "/ic_stat_byte_96.png.png";
const BYTE_ICON_LARGE = "/byte-icon-512.png.png";

type Message = { id: string; sender_id: string; content: string; created_at: string };
type StickerId = "class" | "dislike" | "love" | "laugh" | "wow" | "sad" | "cool" | "think" | "angry" | "error" | "wink" | "sleepy";
const STICKERS: Array<{ id: StickerId; label: string; symbolId: string }> = [
  { id: "class", label: "CLASS", symbolId: "f-class" }, { id: "dislike", label: "DISLIKE", symbolId: "f-dislike" },
  { id: "love", label: "LOVE", symbolId: "f-love" }, { id: "laugh", label: "LAUGH", symbolId: "f-laugh" },
  { id: "wow", label: "WOW", symbolId: "f-wow" }, { id: "sad", label: "SAD", symbolId: "f-sad" },
  { id: "cool", label: "COOL", symbolId: "f-cool" }, { id: "think", label: "THINK", symbolId: "f-think" },
  { id: "angry", label: "ANGRY", symbolId: "f-angry" }, { id: "error", label: "ERROR", symbolId: "f-error" },
  { id: "wink", label: "WINK", symbolId: "f-wink" }, { id: "sleepy", label: "SLEEPY", symbolId: "f-sleepy" },
];
const stickerContent = (id: StickerId) => "[[sticker:" + id + "]]";
const getSticker = (content: string) => {
  const match = content.match(/^\[\[sticker:(class|dislike|love|laugh|wow|sad|cool|think|angry|error|wink|sleepy)\]\]$/);
  return match ? STICKERS.find((sticker) => sticker.id === match[1]) ?? null : null;
};
type Profile = { id: string; username: string; bio: string; avatar_url: string; last_seen: string };

export default function ChatPage() {
  const routeParams = useParams<{ username: string }>();
  const targetUsername = decodeURIComponent(routeParams.username ?? "").toLowerCase();
  const [username, setUsername] = useState(targetUsername);
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
  const typingChannel = useRef<any>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [recentStickers, setRecentStickers] = useState<StickerId[]>([]);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    async function load() {
      try {
        const target = targetUsername;
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
  }, [targetUsername, retryKey]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("shb-recent-stickers") || "[]");
      if (Array.isArray(saved)) setRecentStickers(saved.filter((id): id is StickerId => STICKERS.some((sticker) => sticker.id === id)).slice(0, 8));
    } catch {}
  }, []);

  useEffect(() => {
    if (!stickerOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setStickerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [stickerOpen]);
  useEffect(() => {
    if (!conversationId || !me || !otherId) return;
    const supabase = createClient();
    const channel = supabase.channel("typing-" + conversationId, {
      config: { presence: { key: me } },
    });
    typingChannel.current = channel;

    const updateTyping = () => {
      const presence = channel.presenceState() as Record<string, Array<{ typing?: boolean }>>;
      const otherPresence = presence[otherId] ?? [];
      setOtherTyping(otherPresence.some((entry) => entry?.typing === true));
    };

    channel.on("presence", { event: "sync" }, updateTyping);
    channel.on("presence", { event: "join" }, updateTyping);
    channel.on("presence", { event: "leave" }, updateTyping);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ typing: false });
        updateTyping();
      }
    });

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = null;
      setOtherTyping(false);
      void supabase.removeChannel(channel);
      typingChannel.current = null;
    };
  }, [conversationId, me, otherId]);

  const publishTyping = () => {
    const channel = typingChannel.current;
    if (!channel) return;
    void channel.track({ typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void channel.track({ typing: false });
    }, 1800);
  };

  const stopTyping = () => {
    const channel = typingChannel.current;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
    if (channel) void channel.track({ typing: false });
  };



  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (text.trim()) {
        void sendMessage(event as unknown as FormEvent);
      }
    }
  }

  async function sendSticker(id: StickerId) {
    if (!conversationId || !me) return;
    stopTyping();
    setStickerOpen(false);
    const nextRecent = [id, ...recentStickers.filter((item) => item !== id)].slice(0, 8);
    setRecentStickers(nextRecent);
    try { localStorage.setItem("shb-recent-stickers", JSON.stringify(nextRecent)); } catch {}
    const supabase = createClient();
    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: me, content: stickerContent(id) })
      .select("id,sender_id,content,created_at")
      .single();
    if (sendError) { setError(sendError.message); return; }
    if (data) {
      setMessages((current) => current.some((m) => m.id === data.id) ? current : [...current, data]);
      void fetch("/api/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: otherId, kind: "message", url: "/messages/" + username }) }).catch(() => {});
    }
  }

  async function deleteMessage(messageId: string) {
    if (!me) return;
    setDeletingMessageId(messageId);
    setError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("messages").delete().eq("id", messageId).eq("sender_id", me);
    if (deleteError) setError(deleteError.message);
    else setMessages((current) => current.filter((message) => message.id !== messageId));
    setDeletingMessageId(null);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content || !conversationId || !me) return;
    setText("");
    const supabase = createClient();
    const { data, error: sendError } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: me, content }).select("id,sender_id,content,created_at").single();
    if (sendError) { setText(content); setError(sendError.message); return; }
    if (data) {
      setMessages((current) => current.some((m) => m.id === data.id) ? current : [...current, data]);
      void fetch("/api/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: otherId, kind: "message", url: "/messages/" + username }) }).catch(() => {});
    }
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16"><div className="byte-loader" role="status" aria-live="polite"><Byte state="loading" /><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;
  if (error) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16"><div className="byte-state" role="alert"><Byte state="error" /><h3>Something broke</h3><p>{error}</p><button type="button" className="byte-retry" onClick={() => { setError(""); setLoading(true); setRetryKey((key) => key + 1); }}>Retry</button><Link href="/messages" className="mt-4 text-[9px] uppercase tracking-[0.12em] underline">Back to messages</Link></div></main>;

  return (
    <main className="mobile-chat-page mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">\n      <div className="flex items-center justify-between border-y border-line py-4">
        <Link href="/messages" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-fg"><ArrowLeft size={14}/> Messages</Link>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line">
            {avatarSrc ? (
              <img src={avatarSrc} alt={"@" + username + " avatar"} className="h-full w-full object-cover" />
            ) : (
              <img src={BYTE_ICON_SMALL} alt="" className="h-full w-full object-contain p-1" />
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
          <div className="byte-state min-h-[55vh]"><img src={BYTE_ICON_LARGE} alt="" className="h-24 w-24 object-contain" /><h3>No messages yet</h3><p>Say hi to @{username}.</p></div>
        ) : (
          <div className="space-y-3 py-6">
            {messages.map((message) => {
              const sticker = getSticker(message.content);
              return (
              <div key={message.id} className={"flex " + (message.sender_id === me ? "justify-end" : "justify-start")}>
                {sticker ? (
                  <div className={"sticker-msg group flex items-end gap-2 " + (message.sender_id === me ? "justify-end" : "justify-start")}>
                    <div className="relative flex flex-col items-center">
                      {message.sender_id === me && <button type="button" onClick={() => void deleteMessage(message.id)} disabled={deletingMessageId === message.id} className="absolute right-1 top-1 z-10 hidden h-6 w-6 items-center justify-center border border-line bg-bg text-fg hover:bg-fg hover:text-bg disabled:opacity-40 group-hover:flex" aria-label="Delete message"><Trash2 size={11} strokeWidth={1.25} /></button>}
                      <ByteSticker id={sticker.id} size={112} />
                      <span className="mt-1 text-[7px] uppercase tracking-[0.18em] text-muted">{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ) : (
                  <div className={"group relative max-w-[80%] px-4 py-3 text-sm leading-6 " + (message.sender_id === me ? "bg-fg text-bg" : "border border-line")}>
                    {message.sender_id === me && <button type="button" onClick={() => void deleteMessage(message.id)} disabled={deletingMessageId === message.id} className="absolute right-2 top-2 z-10 hidden h-6 w-6 items-center justify-center border border-line bg-bg text-fg hover:bg-fg hover:text-bg disabled:opacity-40 group-hover:flex" aria-label="Delete message"><Trash2 size={11} strokeWidth={1.25} /></button>}
                    <div>{message.content}</div>
                    <div className={"mt-2 text-[8px] uppercase tracking-[0.08em] " + (message.sender_id === me ? "text-bg/60" : "text-muted")}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
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

      {otherTyping && <div className="byte-inline mb-2" role="status" aria-live="polite"><Byte state="typing" className="!w-[56px]" /><span>@{username} is typing</span></div>}
      <div className="relative mt-4">
        {stickerOpen && (
          <section id="sticker-panel" className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-full border border-line bg-bg p-4 shadow-2xl" aria-label="Stickers">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <span className="text-[9px] uppercase tracking-[0.16em]">Stickers / Байт</span>
              <button type="button" onClick={() => setStickerOpen(false)} className="text-muted hover:text-fg" aria-label="Close stickers"><X size={14} strokeWidth={1.25}/></button>
            </div>
            {recentStickers.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-[8px] uppercase tracking-[0.16em] text-muted">Recent</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {recentStickers.map((id) => {
                    const sticker = STICKERS.find((item) => item.id === id)!;
                    return <button key={id} type="button" onClick={() => void sendSticker(id)} className="flex aspect-square items-center justify-center border border-line p-2 hover:bg-fg hover:text-bg" aria-label={sticker.label + " sticker"}><ByteSticker id={sticker.id} size={56} /></button>;
                  })}
                </div>
              </div>
            )}
            <div className="mb-2 text-[8px] uppercase tracking-[0.16em] text-muted">All</div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {STICKERS.map((sticker) => (
                <button key={sticker.id} type="button" onClick={() => void sendSticker(sticker.id)} className="flex aspect-square flex-col items-center justify-center gap-1 border border-line hover:bg-fg hover:text-bg" aria-label={sticker.label + " sticker"}>
                  <ByteSticker id={sticker.id} size={48} />
                  <span className="text-[6px] uppercase tracking-[0.14em] opacity-50">{sticker.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 text-right text-[7px] uppercase tracking-[0.14em] text-muted">Esc to close</div>
          </section>
        )}
        <form onSubmit={sendMessage} className="flex gap-2">
        <button type="button" onClick={() => setStickerOpen((open) => !open)} aria-expanded={stickerOpen} aria-controls="sticker-panel" aria-label="Stickers" className={"flex h-12 w-12 shrink-0 items-center justify-center border border-line " + (stickerOpen ? "bg-fg text-bg" : "text-fg hover:bg-fg hover:text-bg")}>
          <Sticker size={16} strokeWidth={1.25}/>
        </button>
          <input value={text} onChange={(e) => { setText(e.target.value.slice(0, 4000)); publishTyping(); }} onBlur={stopTyping} placeholder="WRITE A MESSAGE..." className="h-12 min-w-0 flex-1 border border-line bg-transparent px-4 text-xs uppercase tracking-[0.06em] focus:border-fg focus:outline-none"/>
        <button disabled={!text.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center bg-fg text-bg disabled:opacity-40" aria-label="Send message"><Send size={15}/></button>
        </form>
      </div>
    </main>
  );
}