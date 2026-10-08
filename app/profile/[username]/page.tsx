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

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [status, setStatus] = useState("");
  const [friendState, setFriendState] = useState<"none" | "friends" | "sent" | "received">("none");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
      setLoading(false);
    }

    load();
  }, [params]);

  async function addFriend() {
    if (!me || !profile || friendState !== "none") return;
    setStatus("");
    const supabase = createClient();

    const { data, error } = await supabase.rpc("send_friend_request", {
      receiver_user: profile.id,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    if (!data) {
      setStatus("UNABLE TO SEND REQUEST.");
      return;
    }

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

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="byte-loader" role="status" aria-live="polite"><Byte state="loading" /><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;;

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <Link href="/messages" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted hover:text-fg"><ArrowLeft size={13}/> Back to network</Link>
        <h1 className="mt-20 text-5xl tracking-[-0.06em]">USER NOT FOUND.</h1>
      </main>
    );
  }

  const isMe = me === profile.id;

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <Link href="/messages" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted hover:text-fg"><ArrowLeft size={13}/> Back to network</Link>

      <section className="mt-6 overflow-hidden border border-line sm:mt-8">
        <div className="relative h-40 bg-white/[0.02] sm:h-52 lg:h-60">
          {profile.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
        </div>

        <div className="relative flex flex-col gap-8 px-5 pb-8 pt-0 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-10">
          <div className="flex items-end gap-5">
            <div className="-mt-20 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden border border-line bg-bg sm:-mt-20 sm:h-28 sm:w-28">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound size={34} strokeWidth={1.15}/>}
            </div>
            <div>
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-fg" /> Active member
              </div>
              <h1 className="mt-3 text-5xl tracking-[-0.06em] sm:text-7xl">@{profile.username}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{profile.bio || "No bio yet."}</p>
            </div>
          </div>

          {!isMe && me && (
            <div className="flex gap-2">
              <Link href={"/messages/" + profile.username} className="flex items-center gap-2 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg"><MessageCircle size={14}/> Message</Link>
              {friendState === "none" && <button onClick={addFriend} className="flex items-center gap-2 bg-fg px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-bg"><UserPlus size={14}/> Add friend</button>}
              {friendState === "sent" && <button onClick={cancelRequest} className="flex items-center gap-2 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg"><Clock3 size={14}/> Requested</button>}
              {friendState === "received" && <><button onClick={acceptRequest} className="flex items-center gap-2 bg-fg px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-bg"><Check size={14}/> Accept</button><button onClick={declineRequest} className="flex items-center gap-2 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg"><X size={14}/> Decline</button></>}
              {friendState === "friends" && <button onClick={removeFriend} className="flex items-center gap-2 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg"><UserMinus size={14}/> Remove friend</button>}
            </div>
          )}
        </div>

        <div className="grid border-t border-line sm:grid-cols-3">
          <div className="flex items-center gap-3 border-b border-line py-5 sm:border-b-0 sm:border-r sm:pr-6">
            <Users size={16} strokeWidth={1.15}/>
            <div><p className="text-[9px] uppercase tracking-[0.14em] text-muted">Friends</p><p className="mt-1 text-xl tracking-[-0.04em]">{friendCount}</p></div>
          </div>
          <div className="border-b border-line py-5 sm:border-b-0 sm:border-r sm:px-6">
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted">Status</p>
            <p className="mt-1 text-sm uppercase tracking-[0.04em]">Online</p>
          </div>
          <div className="py-5 sm:pl-6">
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted">Member</p>
            <p className="mt-1 text-sm uppercase tracking-[0.04em]">SHB</p>
          </div>
        </div>
      </section>

      {status && <p className="mt-5 text-[10px] uppercase tracking-[0.1em] text-muted">{status}</p>}
    </main>
  );
}
