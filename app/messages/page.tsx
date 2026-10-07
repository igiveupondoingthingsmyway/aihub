"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MessageSquare, Search, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; bio: string; avatar_url: string; last_seen: string };
type Request = { id: string; sender_id: string; status: string; sender?: Profile };

export default function MessagesPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUser({ id: user.id });

      const { data: friendshipRows } = await supabase.from("friendships").select("friend_id").eq("user_id", user.id);
      const ids = (friendshipRows ?? []).map((row) => row.friend_id);
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").in("id", ids);
        setFriends(data ?? []);
      }

      const { data: requestRows } = await supabase.from("friend_requests").select("id,sender_id,status").eq("receiver_id", user.id).eq("status", "pending");
      if (requestRows?.length) {
        const { data: senders } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").in("id", requestRows.map(r => r.sender_id));
        setRequests(requestRows.map(r => ({ ...r, sender: senders?.find(p => p.id === r.sender_id) })));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function searchPeople(value: string) {
    setQuery(value);
    if (!value.trim() || !user) { setPeople([]); return; }
    const { data } = await createClient().from("profiles").select("id,username,bio,avatar_url,last_seen")
      .ilike("username", "%" + value.trim().toLowerCase() + "%").neq("id", user.id).limit(8);
    setPeople(data ?? []);
  }

  async function addFriend(profile: Profile) {
    if (!user) return;
    const { error } = await createClient().from("friend_requests").insert({ sender_id: user.id, receiver_id: profile.id });
    setNotice(error ? (error.code === "23505" ? "Friend request already sent." : error.message) : "Request sent to @" + profile.username + ".");
  }

  async function respond(request: Request, accept: boolean) {
    if (!user) return;
    const supabase = createClient();
    if (!accept) {
      await supabase.from("friend_requests").update({ status: "declined" }).eq("id", request.id);
    } else {
      await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", request.id);
      const { error } = await supabase.rpc("accept_friend_request", { request_id: request.id });
      if (error) setNotice(error.message);
    }
    setRequests((items) => items.filter((item) => item.id !== request.id));
    if (accept && request.sender) setFriends((items) => items.some(x => x.id === request.sender!.id) ? items : [...items, request.sender!]);
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-24 text-xs uppercase tracking-[0.12em] text-muted sm:px-8">Loading...</main>;

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="border-y border-line py-3 text-[10px] uppercase tracking-[0.18em] text-muted">Social / Messages</div>
      <div className="mt-12 grid gap-16 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="flex items-end justify-between border-b border-line pb-3">
            <h1 className="text-4xl tracking-[-0.05em] sm:text-5xl">MESSAGES.</h1><MessageSquare size={20} strokeWidth={1.25}/>
          </div>
          <div className="flex min-h-64 items-center justify-center border-b border-line text-center">
            <div><MessageSquare className="mx-auto" size={28} strokeWidth={1.25}/><p className="mt-5 text-xs uppercase tracking-[0.12em]">No conversations yet.</p><p className="mt-2 text-[10px] text-muted">Open a friend to start chatting.</p></div>
          </div>
        </section>
        <aside>
          <div className="border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Find people</div>
          <div className="relative mt-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15}/><input value={query} onChange={(e) => searchPeople(e.target.value)} placeholder="SEARCH USERNAME" className="h-11 w-full border border-line bg-transparent pl-9 pr-3 text-xs uppercase tracking-[0.08em] focus:border-fg focus:outline-none"/></div>
          {people.length > 0 && <div className="mt-2 border border-line">{people.map(person => <div key={person.id} className="flex items-center justify-between border-b border-line px-3 py-3 last:border-0"><div><p className="text-xs">@{person.username}</p><p className="mt-1 text-[10px] text-muted">{person.bio || "AI Hub member"}</p></div><button onClick={() => addFriend(person)} className="flex items-center gap-2 border border-line px-3 py-2 text-[9px] uppercase tracking-[0.1em] hover:bg-fg hover:text-bg"><UserPlus size={12}/>Add</button></div>)}</div>}
          {notice && <p className="mt-4 text-[10px] uppercase tracking-[0.08em] text-muted">{notice}</p>}
          <div className="mt-12 border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Friend requests {requests.length > 0 && "/" + requests.length}</div>
          {requests.length === 0 ? <p className="py-8 text-[10px] uppercase tracking-[0.08em] text-muted">No pending requests.</p> : <div>{requests.map(request => request.sender && <div key={request.id} className="border-b border-line py-4"><p className="text-xs">@{request.sender.username}</p><div className="mt-3 flex gap-2"><button onClick={() => respond(request,true)} className="bg-fg px-3 py-2 text-[9px] uppercase tracking-[0.1em] text-bg">Accept</button><button onClick={() => respond(request,false)} className="border border-line px-3 py-2 text-[9px] uppercase tracking-[0.1em]">Decline</button></div></div>)}</div>}
          <div className="mt-12 border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Friends / {friends.length}</div>
          {friends.length === 0 ? <p className="py-8 text-[10px] uppercase tracking-[0.08em] text-muted">No friends yet.</p> : <div>{friends.map(friend => <Link key={friend.id} href={"/messages/" + friend.username} className="flex items-center gap-3 border-b border-line py-4 hover:text-muted"><span className="h-2 w-2 rounded-full bg-fg"/><span className="text-xs">@{friend.username}</span><ArrowRight className="ml-auto" size={13}/></Link>)}</div>}
        </aside>
      </div>
    </main>
  );
}
