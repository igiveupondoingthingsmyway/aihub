"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle, Search, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; bio: string; avatar_url: string; last_seen: string };
type Request = { id: string; sender_id: string; receiver_id?: string; status: string; sender?: Profile; receiver?: Profile };
type Conversation = { id: string; user_one: string; user_two: string; other?: Profile };

export default function MessagesPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [sentRequests, setSentRequests] = useState<Request[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
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

      const { data: requestRows } = await supabase.from("friend_requests").select("id,sender_id,receiver_id,status").eq("receiver_id", user.id).eq("status", "pending");
      if (requestRows?.length) {
        const { data: senders } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").in("id", requestRows.map(r => r.sender_id));
        setRequests(requestRows.map(r => ({ ...r, sender: senders?.find(p => p.id === r.sender_id) })));
      }

      const { data: sentRows } = await supabase.from("friend_requests").select("id,sender_id,receiver_id,status").eq("sender_id", user.id).eq("status", "pending");
      if (sentRows?.length) {
        const { data: receivers } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").in("id", sentRows.map(r => r.receiver_id));
        setSentRequests(sentRows.map(r => ({ ...r, receiver: receivers?.find(p => p.id === r.receiver_id) })));
      }

      const { data: conversationRows } = await supabase.from("conversations").select("id,user_one,user_two").or("user_one.eq." + user.id + ",user_two.eq." + user.id).order("created_at", { ascending: false });
      if (conversationRows?.length) {
        const otherIds = conversationRows.map(c => c.user_one === user.id ? c.user_two : c.user_one);
        const { data: profiles } = await supabase.from("profiles").select("id,username,bio,avatar_url,last_seen").in("id", otherIds);
        setConversations(conversationRows.map(c => ({ ...c, other: profiles?.find(p => p.id === (c.user_one === user.id ? c.user_two : c.user_one)) })));
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
    if (error) {
      setNotice(error.code === "23505" ? "Friend request already sent." : error.message);
      return;
    }
    setSentRequests((items) => [...items, { id: profile.id, sender_id: user.id, receiver_id: profile.id, status: "pending", receiver: profile }]);
    setNotice("Request sent to @" + profile.username + ".");
  }

  async function openChat(profile: Profile) {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_or_create_conversation", { other_user: profile.id });
    if (error || !data) {
      setNotice(error?.message || "Could not open conversation.");
      return;
    }
    setConversations((items) => items.some((item) => item.id === data) ? items : [{ id: data, user_one: user.id, user_two: profile.id, other: profile }, ...items]);
    window.location.href = "/messages/" + profile.username;
  }

  async function respond(request: Request, accept: boolean) {
    if (!user) return;
    const supabase = createClient();
    if (!accept) {
      await supabase.from("friend_requests").update({ status: "declined" }).eq("id", request.id);
    } else {
      const { error } = await supabase.rpc("accept_friend_request", { request_id: request.id });
      if (error) {
        setNotice(error.message);
        return;
      }
    }
    setRequests((items) => items.filter((item) => item.id !== request.id));
    if (accept && request.sender) setFriends((items) => items.some(x => x.id === request.sender!.id) ? items : [...items, request.sender!]);
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-24 text-xs uppercase tracking-[0.12em] text-muted sm:px-8">Loading...</main>;

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="flex items-center justify-between border-y border-line py-3 text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>Social / Network</span>
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fg" />0 / 30 online</span>
      </div>

      <div className="mt-12 grid gap-16 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="flex items-end justify-between border-b border-line pb-4">
            <div>
              <p className="mb-3 text-[9px] uppercase tracking-[0.18em] text-muted">Your network</p>
              <h1 className="text-5xl tracking-[-0.06em] sm:text-7xl">PEOPLE.</h1>
            </div>
            <Users size={22} strokeWidth={1.15} />
          </div>

          <div className="border-b border-line">
            {conversations.length === 0 ? (
              <div className="flex min-h-72 items-center justify-center text-center">
                <div>
                  <MessageCircle className="mx-auto" size={30} strokeWidth={1.1}/>
                  <p className="mt-5 text-xs uppercase tracking-[0.14em]">No conversations yet.</p>
                  <p className="mt-2 max-w-xs text-[10px] leading-5 text-muted">Find someone on the right and start the first conversation.</p>
                </div>
              </div>
            ) : (
              <div>
                {conversations.map(conversation => conversation.other && (
                  <Link key={conversation.id} href={"/profile/" + conversation.other.username} className="group flex items-center gap-4 border-b border-line py-5 transition-colors hover:text-muted">
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line">{conversation.other.avatar_url ? <img src={conversation.other.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase">{conversation.other.username.slice(0, 1)}</span>}</span>
                    <div>
                      <p className="text-xs">@{conversation.other.username}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-muted">Conversation</p>
                    </div>
                    <ArrowRight className="ml-auto transition-transform group-hover:translate-x-1" size={14}/>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside>
          <div className="border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Find people</div>
          <div className="relative mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15}/>
            <input value={query} onChange={(e) => searchPeople(e.target.value)} placeholder="SEARCH USERNAME" className="h-11 w-full border border-line bg-transparent pl-9 pr-3 text-xs uppercase tracking-[0.08em] focus:border-fg focus:outline-none"/>
          </div>
          {people.length > 0 && <div className="mt-2 border border-line">{people.map(person => <div key={person.id} className="flex gap-3 border-b border-line px-3 py-3 last:border-0"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase">{person.username.slice(0, 1)}</span>}</span><div className="min-w-0 flex-1"><Link href={"/profile/" + person.username} className="block hover:text-muted"><p className="text-xs">@{person.username}</p><p className="mt-1 text-[10px] text-muted">{person.bio || "AI Hub member"}</p></Link><div className="mt-3 flex gap-2"><button onClick={() => openChat(person)} className="flex items-center gap-2 border border-line px-3 py-2 text-[9px] uppercase tracking-[0.1em] hover:bg-fg hover:text-bg"><MessageCircle size={12}/>Chat</button><button onClick={() => addFriend(person)} className="flex items-center gap-2 border border-line px-3 py-2 text-[9px] uppercase tracking-[0.1em] hover:bg-fg hover:text-bg"><UserPlus size={12}/>Add</button></div></div>)}</div>}
          {notice && <p className="mt-4 text-[10px] uppercase tracking-[0.08em] text-muted">{notice}</p>}

          <div className="mt-12 border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Friend requests {requests.length > 0 && "/" + requests.length}</div>
          {requests.length === 0 ? <p className="py-8 text-[10px] uppercase tracking-[0.08em] text-muted">No pending requests.</p> : <div>{requests.map(request => request.sender && <div key={request.id} className="flex items-center gap-3 border-b border-line py-4"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line">{request.sender.avatar_url ? <img src={request.sender.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase">{request.sender.username.slice(0, 1)}</span>}</span><div className="min-w-0 flex-1"><Link href={"/profile/" + request.sender.username} className="text-xs hover:text-muted">@{request.sender.username}</Link><div className="mt-3 flex gap-2"><button onClick={() => respond(request,true)} className="bg-fg px-3 py-2 text-[9px] uppercase tracking-[0.1em] text-bg">Accept</button><button onClick={() => respond(request,false)} className="border border-line px-3 py-2 text-[9px] uppercase tracking-[0.1em]">Decline</button></div></div>)}</div>}

          <div className="mt-12 border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Sent requests {sentRequests.length > 0 && "/" + sentRequests.length}</div>
          {sentRequests.length === 0 ? <p className="py-8 text-[10px] uppercase tracking-[0.08em] text-muted">No active requests sent.</p> : <div>{sentRequests.map(request => request.receiver && <div key={request.id} className="flex items-center gap-3 border-b border-line py-4"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line">{request.receiver.avatar_url ? <img src={request.receiver.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase">{request.receiver.username.slice(0, 1)}</span>}</span><Link href={"/profile/" + request.receiver.username} className="min-w-0 flex-1 text-xs hover:text-muted"> className="text-xs hover:text-muted">@{request.receiver.username}</Link><span className="text-[10px] uppercase tracking-[0.08em] text-muted">Pending</span></div>)}</div>}

          <div className="mt-12 border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Friends / {friends.length}</div>
          {friends.length === 0 ? <p className="py-8 text-[10px] uppercase tracking-[0.08em] text-muted">No friends yet.</p> : <div>{friends.map(friend => <div key={friend.id} className="flex items-center gap-3 border-b border-line py-4"><Link href={"/profile/" + friend.username} className="flex min-w-0 flex-1 items-center gap-3 hover:text-muted"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line">{friend.avatar_url ? <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[9px] uppercase">{friend.username.slice(0, 1)}</span>}</span><span className="text-xs">@{friend.username}</span></Link><button onClick={() => openChat(friend)} aria-label={"Message @" + friend.username} className="p-2 text-muted hover:text-fg"><MessageCircle size={14}/></button></div>)}</div>}
        </aside>
      </div>
    </main>
  );
}
