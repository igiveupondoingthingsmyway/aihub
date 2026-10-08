"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, Search, UserMinus, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; bio: string; avatar_url: string; last_seen: string };
type Request = { id: string; sender_id: string; receiver_id?: string; status: string; sender?: Profile; receiver?: Profile };

export default function NetworkPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [sentRequests, setSentRequests] = useState<Request[]>([]);
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
      const ids = (friendshipRows ?? []).map(row => row.friend_id);
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").in("id", ids);
        setFriends(data ?? []);
      } else setFriends([]);

      const { data: requestRows } = await supabase.from("friend_requests").select("id,sender_id,receiver_id,status").eq("receiver_id", user.id).eq("status", "pending");
      if (requestRows?.length) {
        const { data: senders } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").in("id", requestRows.map(r => r.sender_id));
        setRequests(requestRows.map(r => ({ ...r, sender: senders?.find(p => p.id === r.sender_id) })));
      } else setRequests([]);

      const { data: sentRows } = await supabase.from("friend_requests").select("id,sender_id,receiver_id,status").eq("sender_id", user.id).eq("status", "pending");
      if (sentRows?.length) {
        const { data: receivers } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").in("id", sentRows.map(r => r.receiver_id));
        setSentRequests(sentRows.map(r => ({ ...r, receiver: receivers?.find(p => p.id === r.receiver_id) })));
      } else setSentRequests([]);
      setLoading(false);
    }
    load();
    const poll = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(poll);
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
    if (friends.some(friend => friend.id === profile.id)) { setNotice("Already friends with @" + profile.username + "."); return; }
    const { data, error } = await createClient().rpc("send_friend_request", { receiver_user: profile.id });
    if (error) { setNotice(error.message); return; }
    if (!data) { setNotice("Unable to send friend request."); return; }
    const request = Array.isArray(data) ? data[0] : data;
    setSentRequests(items => [...items.filter(item => item.id !== request.id), { ...request, receiver: profile }]);
    setNotice("Request sent to @" + profile.username + ".");
  }

  async function cancelRequest(request: Request) {
    const { error } = await createClient().rpc("cancel_friend_request", { request_id: request.id });
    if (error) { setNotice(error.message); return; }
    setSentRequests(items => items.filter(item => item.id !== request.id));
  }

  async function removeFriend(friend: Profile) {
    const { error } = await createClient().rpc("remove_friend", { friend_user: friend.id });
    if (error) { setNotice(error.message); return; }
    setFriends(items => items.filter(item => item.id !== friend.id));
  }

  async function respond(request: Request, accept: boolean) {
    const supabase = createClient();
    const { error } = await supabase.rpc(accept ? "accept_friend_request" : "reject_friend_request", { request_id: request.id });
    if (error) { setNotice(error.message); return; }
    setRequests(items => items.filter(item => item.id !== request.id));
    if (accept && request.sender) setFriends(items => items.some(x => x.id === request.sender!.id) ? items : [...items, request.sender!]);
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="byte-loader" role="status" aria-live="polite"><svg className="byte-svg" viewBox="270 85 210 150" aria-hidden="true" focusable="false"><line className="byte-ground" x1="285" y1="224" x2="395" y2="224"/><g className="byte-bob"><rect className="byte-leg byte-leg-a" x="344" y="210" width="10" height="14"/><rect className="byte-leg byte-leg-b" x="372" y="210" width="10" height="14"/><line className="byte-antenna-line" x1="340" y1="120" x2="340" y2="102"/><rect className="byte-antenna" x="335" y="92" width="10" height="10"/><rect className="byte-body" x="290" y="120" width="100" height="90"/><path className="byte-body" d="M306 210 L306 232 L330 210"/><line className="byte-seam" x1="307" y1="210" x2="329" y2="210"/><g className="byte-eyes"><rect x="314" y="152" width="14" height="14"/><rect x="352" y="152" width="14" height="14"/></g><rect className="byte-cursor" x="328" y="186" width="24" height="4"/></g><rect className="byte-bubble" x="408" y="104" width="68" height="30"/><rect className="byte-dot" x="420" y="115" width="8" height="8"/><rect className="byte-dot byte-dot-2" x="438" y="115" width="8" height="8"/><rect className="byte-dot byte-dot-3" x="456" y="115" width="8" height="8"/></svg><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="flex items-center justify-between border-y border-line py-3 text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>Social / Network</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fg" />SHB NETWORK</span>
      </div>
      <div className="mt-12">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <div><p className="mb-3 text-[9px] uppercase tracking-[0.18em] text-muted">Your network</p><h1 className="text-5xl tracking-[-0.06em] sm:text-7xl">PEOPLE.</h1></div>
          <Users size={22} strokeWidth={1.15} />
        </div>

        <div className="mt-8 max-w-xl">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15}/><input value={query} onChange={e => searchPeople(e.target.value)} placeholder="SEARCH USERNAME" className="h-11 w-full border border-line bg-transparent pl-9 pr-3 text-xs uppercase tracking-[0.08em] focus:border-fg focus:outline-none"/></div>
          {people.length > 0 && <div className="mt-2 border border-line">{people.map(person => <div key={person.id} className="flex gap-3 border-b border-line px-3 py-3 last:border-0"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover"/> : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase">{person.username.slice(0,1)}</span>}</span><div className="min-w-0 flex-1"><Link href={"/profile/"+person.username} className="block hover:text-muted"><p className="text-xs">@{person.username}</p><p className="mt-1 text-[10px] text-muted">{person.bio || "SHB member"}</p></Link><div className="mt-3 flex gap-2"><Link href={"/messages/"+person.username} className="flex items-center gap-2 border border-line px-3 py-2 text-[9px] uppercase tracking-[0.1em] hover:bg-fg hover:text-bg"><MessageCircle size={12}/>Chat</Link><button onClick={() => addFriend(person)} className="flex items-center gap-2 border border-line px-3 py-2 text-[9px] uppercase tracking-[0.1em] hover:bg-fg hover:text-bg"><UserPlus size={12}/>Add</button></div></div></div>)}</div>}
          {notice && <p className="mt-4 text-[10px] uppercase tracking-[0.08em] text-muted">{notice}</p>}
        </div>

        <div className="mt-14 grid gap-14 lg:grid-cols-3">
          <section><div className="border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Friend requests {requests.length > 0 && "/"+requests.length}</div>{requests.length === 0 ? <p className="py-8 text-[10px] uppercase tracking-[0.08em] text-muted">No pending requests.</p> : requests.map(request => request.sender && <div key={request.id} className="flex items-center gap-3 border-b border-line py-4"><Link href={"/profile/"+request.sender.username} className="flex min-w-0 flex-1 items-center gap-3"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line">{request.sender.avatar_url ? <img src={request.sender.avatar_url} alt="" className="h-full w-full object-cover"/> : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase">{request.sender.username.slice(0,1)}</span>}</span><span className="text-xs">@{request.sender.username}</span></Link><button onClick={() => respond(request,true)} className="bg-fg px-3 py-2 text-[9px] uppercase text-bg">Accept</button><button onClick={() => respond(request,false)} className="border border-line px-3 py-2 text-[9px] uppercase">Decline</button></div>)}</section>
          <section><div className="border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Sent requests {sentRequests.length > 0 && "/"+sentRequests.length}</div>{sentRequests.length === 0 ? <p className="py-8 text-[10px] uppercase tracking-[0.08em] text-muted">No active requests.</p> : sentRequests.map(request => request.receiver && <div key={request.id} className="flex items-center gap-3 border-b border-line py-4"><Link href={"/profile/"+request.receiver.username} className="min-w-0 flex-1 text-xs">@{request.receiver.username}</Link><button onClick={() => cancelRequest(request)} className="flex items-center gap-1 border border-line px-2 py-1 text-[9px] uppercase"><UserMinus size={11}/>Cancel</button></div>)}</section>
          <section><div className="border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Friends / {friends.length}</div>{friends.length === 0 ? <p className="py-8 text-[10px] uppercase tracking-[0.08em] text-muted">No friends yet.</p> : friends.map(friend => <div key={friend.id} className="flex items-center gap-3 border-b border-line py-4"><Link href={"/profile/"+friend.username} className="flex min-w-0 flex-1 items-center gap-3 hover:text-muted"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line">{friend.avatar_url ? <img src={friend.avatar_url} alt="" className="h-full w-full object-cover"/> : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase">{friend.username.slice(0,1)}</span>}</span><span className="text-xs">@{friend.username}</span></Link><Link href={"/messages/"+friend.username} aria-label={"Message @"+friend.username} className="p-2 text-muted hover:text-fg"><MessageCircle size={14}/></Link><button onClick={() => removeFriend(friend)} className="p-2 text-muted hover:text-fg"><UserMinus size={14}/></button></div>)}</section>
        </div>
      </div>
    </main>
  );
}