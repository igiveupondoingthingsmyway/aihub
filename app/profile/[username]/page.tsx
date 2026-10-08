"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Clock3, MessageCircle, UserMinus, UserPlus, UserRound, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Byte } from "@/components/Byte";

type Profile = {
  id: string;
  username: string;
  bio: string;
  avatar_url: string;
  last_seen: string;
  banner_url: string;
};

type ProfilePost = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
};

function formatTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [status, setStatus] = useState("");
  const [friendState, setFriendState] = useState<"none" | "friends" | "sent" | "received">("none");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { username } = await params;
        const cleanUsername = decodeURIComponent(username).replace(/^@/, "").toLowerCase();

        const { data: { user } } = await supabase.auth.getUser();
        setMe(user?.id ?? null);

        const { data, error } = await supabase.from("profiles")
          .select("id,username,bio,avatar_url,banner_url,last_seen")
          .ilike("username", cleanUsername)
          .maybeSingle();

        if (error || !data) {
          setLoading(false);
          return;
        }

        setProfile(data);

        if (user && user.id !== data.id) {
          const { data: friendship } = await supabase.from("friendships").select("friend_id").eq("user_id", user.id).eq("friend_id", data.id).maybeSingle();
          if (friendship) {
            setFriendState("friends");
          } else {
            const { data: outgoing } = await supabase.from("friend_requests").select("id").eq("sender_id", user.id).eq("receiver_id", data.id).eq("status", "pending").maybeSingle();
            const { data: incoming } = await supabase.from("friend_requests").select("id").eq("sender_id", data.id).eq("receiver_id", user.id).eq("status", "pending").maybeSingle();
            if (outgoing) { setFriendState("sent"); setRequestId(outgoing.id); }
            else if (incoming) { setFriendState("received"); setRequestId(incoming.id); }
          }
        }

        const { count } = await supabase.from("friendships")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", data.id);
        setFriendCount(count ?? 0);

        const { data: postRows } = await supabase
          .from("posts")
          .select("id,author_id,content,created_at")
          .eq("author_id", data.id)
          .order("created_at", { ascending: false })
          .limit(50);

        const postIds = (postRows ?? []).map((post) => post.id);
        const [{ data: likes }, { data: comments }] = await Promise.all([
          postIds.length
            ? supabase.from("post_likes").select("post_id,user_id").in("post_id", postIds)
            : Promise.resolve({ data: [] as { post_id: string; user_id: string }[] }),
          postIds.length
            ? supabase.from("post_comments").select("post_id").in("post_id", postIds)
            : Promise.resolve({ data: [] as { post_id: string }[] }),
        ]);

        setPosts((postRows ?? []).map((post) => ({
          id: post.id,
          author_id: post.author_id,
          content: post.content,
          created_at: post.created_at,
          likeCount: (likes ?? []).filter((like) => like.post_id === post.id).length,
          commentCount: (comments ?? []).filter((comment) => comment.post_id === post.id).length,
          liked: (likes ?? []).some((like) => like.post_id === post.id && like.user_id === user?.id),
        })));
      } catch (e: any) {
        setStatus(e?.message ?? "Could not load profile.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params]);

  async function addFriend() {
    if (!me || !profile || friendState !== "none") return;
    setStatus("");
    const { data, error } = await createClient().rpc("send_friend_request", { receiver_user: profile.id });
    if (error) { setStatus(error.message); return; }
    if (!data) { setStatus("UNABLE TO SEND REQUEST."); return; }
    const request = Array.isArray(data) ? data[0] : data;
    setRequestId(request.id);
    setFriendState("sent");
    setStatus("REQUEST SENT.");
  }

  async function cancelRequest() {
    if (!requestId) return;
    const { error } = await createClient().rpc("cancel_friend_request", { request_id: requestId });
    if (error) { setStatus(error.message); return; }
    setRequestId(null);
    setFriendState("none");
    setStatus("REQUEST CANCELLED.");
  }

  async function acceptRequest() {
    if (!requestId) return;
    const { error } = await createClient().rpc("accept_friend_request", { request_id: requestId });
    if (error) { setStatus(error.message); return; }
    setRequestId(null);
    setFriendState("friends");
    setFriendCount((count) => count + 1);
    setStatus("YOU ARE NOW FRIENDS.");
  }

  async function declineRequest() {
    if (!requestId) return;
    const { error } = await createClient().rpc("reject_friend_request", { request_id: requestId });
    if (error) { setStatus(error.message); return; }
    setRequestId(null);
    setFriendState("none");
    setStatus("REQUEST DECLINED.");
  }

  async function removeFriend() {
    if (!profile) return;
    const { error } = await createClient().rpc("remove_friend", { friend_user: profile.id });
    if (error) { setStatus(error.message); return; }
    setFriendState("none");
    setFriendCount((count) => Math.max(0, count - 1));
    setStatus("FRIEND REMOVED.");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="byte-loader" role="status" aria-live="polite">
          <Byte state="loading" />
          <p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p>
          <div className="byte-bar" aria-hidden="true"><i /></div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <Link href="/network" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted hover:text-fg">
          <ArrowLeft size={13} /> Back to network
        </Link>
        <h1 className="mt-20 text-5xl tracking-[-0.06em]">USER NOT FOUND.</h1>
      </main>
    );
  }

  const isMe = me === profile.id;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
      <Link href="/network" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-fg">
        <ArrowLeft size={13} /> Back to network
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section className="min-w-0">
          <div className="mb-7 overflow-hidden border border-line">
            <div className="relative h-32 bg-white/[0.02] sm:h-40">
              {profile.banner_url ? (
                <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(255,255,255,.025)_10px,rgba(255,255,255,.025)_11px)]" />
              )}
            </div>

            <div className="border-t border-line px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg text-xs">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    profile.username.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-muted">Active member</p>
                  <h1 className="mt-1 truncate text-3xl tracking-[-0.06em] sm:text-5xl">@{profile.username}</h1>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">{profile.bio || "No bio yet."}</p>
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xs uppercase tracking-[0.16em]">Posts</h2>
              <span className="text-[9px] uppercase tracking-[0.14em] text-muted">{posts.length}</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.14em] text-muted">SHB / PROFILE</span>
          </div>

          {posts.length === 0 ? (
            <div className="border-y border-line py-16 text-center">
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted">No posts yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {posts.map((post) => (
                <article key={post.id} className="py-7 first:pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line text-[9px]">
                        {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.username.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.07em]">@{profile.username}</span>
                      <span className="text-[8px] uppercase tracking-[0.1em] text-muted">/ {formatTime(post.created_at)}</span>
                    </div>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7">{post.content}</p>
                  <div className="mt-5 flex items-center gap-5 text-[10px] uppercase tracking-[0.12em] text-muted">
                    <span className="inline-flex items-center gap-2"><span className="text-sm">♡</span>{post.likeCount}</span>
                    <span className="inline-flex items-center gap-2"><MessageCircle size={14} strokeWidth={1.25} />{post.commentCount}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="border border-line lg:sticky lg:top-24">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-line bg-bg text-sm">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound size={23} strokeWidth={1.1} />}
              </div>
              <span className="text-[9px] uppercase tracking-[0.16em] text-muted">SHB / 001</span>
            </div>

            <h2 className="mt-6 text-2xl tracking-[-0.05em]">@{profile.username}</h2>
            <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted">Active member</p>

            <div className="mt-7 border-t border-line">
              <div className="flex items-center justify-between border-b border-line py-4">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Friends</span>
                <span className="text-sm">{friendCount}</span>
              </div>
              <div className="flex items-center justify-between border-b border-line py-4">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Status</span>
                <span className="text-[9px] uppercase tracking-[0.12em]">Online</span>
              </div>
              <div className="flex items-center justify-between border-b border-line py-4">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Member</span>
                <span className="text-[9px] uppercase tracking-[0.12em]">SHB</span>
              </div>
              <div className="flex items-center justify-between py-4">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Posts</span>
                <span className="text-sm">{posts.length}</span>
              </div>
            </div>

            {!isMe && me && (
              <div className="mt-5 grid gap-2">
                <Link href={`/messages/${profile.username}`} className="flex items-center justify-center gap-2 border border-line px-4 py-3 text-[9px] uppercase tracking-[0.14em] transition-colors hover:bg-fg hover:text-bg">
                  <MessageCircle size={14} strokeWidth={1.25} /> Message
                </Link>

                {friendState === "none" && (
                  <button onClick={addFriend} className="flex items-center justify-center gap-2 bg-fg px-4 py-3 text-[9px] uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-80">
                    <UserPlus size={14} strokeWidth={1.25} /> Add friend
                  </button>
                )}

                {friendState === "sent" && (
                  <button onClick={cancelRequest} className="flex items-center justify-center gap-2 border border-line px-4 py-3 text-[9px] uppercase tracking-[0.14em] transition-colors hover:bg-fg hover:text-bg">
                    <Clock3 size={14} strokeWidth={1.25} /> Requested
                  </button>
                )}

                {friendState === "received" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={acceptRequest} className="flex items-center justify-center gap-2 bg-fg px-3 py-3 text-[9px] uppercase tracking-[0.12em] text-bg transition-opacity hover:opacity-80">
                      <Check size={13} strokeWidth={1.25} /> Accept
                    </button>
                    <button onClick={declineRequest} className="flex items-center justify-center gap-2 border border-line px-3 py-3 text-[9px] uppercase tracking-[0.12em] transition-colors hover:bg-fg hover:text-bg">
                      <X size={13} strokeWidth={1.25} /> Decline
                    </button>
                  </div>
                )}

                {friendState === "friends" && (
                  <button onClick={removeFriend} className="flex items-center justify-center gap-2 border border-line px-4 py-3 text-[9px] uppercase tracking-[0.14em] transition-colors hover:bg-fg hover:text-bg">
                    <UserMinus size={14} strokeWidth={1.25} /> Remove friend
                  </button>
                )}
              </div>
            )}

            {isMe && (
              <Link href="/profile" className="mt-5 flex items-center justify-center gap-2 border border-line px-4 py-3 text-[9px] uppercase tracking-[0.14em] transition-colors hover:bg-fg hover:text-bg">
                EDIT PROFILE
              </Link>
            )}
          </div>

          {status && (
            <div className="border-t border-line px-6 py-4 text-[9px] uppercase tracking-[0.12em] text-muted">
              {status}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
