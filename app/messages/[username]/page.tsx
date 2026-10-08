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
  const [retry, setRetry] = useState(0);
  const [otherTyping, setOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
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

      const { data: profile } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").eq("username", target).maybeSingle();
      if (!profile) { setError("User not found."); setLoading(false); return; }
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
      if (rpcError || !conversation) { setError(rpcError?.message ?? "Unable to open conversation."); setLoading(false); return; }
      setConversationId(conversation);

      await supabase.rpc("mark_conversation_notifications_read", { target_conversation: conversation });

      const { data } = await supabase.from("messages").select("id,sender_id,content,created_at").eq("conversation_id", conversation).order("created_at", { ascending: true });
      setMessages(data ?? []);

      channel = supabase.channel("chat-" + conversation, { config: { presence: { key: user.id } } })
        .on("presence", { event: "sync" }, () => {
          const state = channel?.presenceState<{ typing?: boolean }>() ?? {};
          setOtherTyping(Object.entries(state).some(([key, entries]) => key !== user.id && entries.some(entry => entry.typing === true)));
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversation }, (payload) => {
          const incoming = payload.new as Message;
          setMessages((current) => current.some((m) => m.id === incoming.id) ? current : [...current, incoming]);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") await channel?.track({ typing: false });
        });
      channelRef.current = channel;
      setLoading(false);
    }
    load();
    return () => { if (channel) createClient().removeChannel(channel); };
  }, [params, retry]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const channel = channelRef.current;
    if (channel) void channel.track({ typing: text.length > 0 });
    return () => { if (channel) void channel.track({ typing: false }); };
  }, [text]);

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

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="byte-loader" role="status" aria-live="polite"><Byte state="loading" /><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;

  if (error) return (
    <main className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <div className="byte-state">
        <Byte state="error" />
        <h3>Something broke</h3>
        <p>{error}</p>
        <button className="byte-retry" type="button" onClick={() => { setError(""); setLoading(true); setRetry((value) => value + 1); }}>Retry</button>
      </div>
    </main>
  );}