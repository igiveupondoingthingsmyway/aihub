"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Crown, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Byte } from "@/components/Byte";

type Role = "owner" | "admin" | "user";
type Member = { id: string; username: string; avatar_url: string; role: Role };
type ContentPost = { id: string; author_id: string; content: string; created_at: string };
type ContentComment = { id: string; post_id: string; author_id: string; content: string; created_at: string };
type ContentMessage = { id: string; sender_id: string; content: string; created_at: string };

export default function AdminPage() {
  const [myRole, setMyRole] = useState<Role>("user");
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [messages, setMessages] = useState<ContentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadMembers = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: ownRole, error: roleError } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (roleError || (ownRole?.role !== "owner" && ownRole?.role !== "admin")) {
      setMyRole("user");
      setLoading(false);
      return;
    }
    setMyRole(ownRole.role);

    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("id,username,avatar_url").order("username"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    if (profilesError || rolesError) {
      setNotice(profilesError?.message ?? rolesError?.message ?? "Could not load members.");
      setLoading(false);
      return;
    }
    const roleByUser = new Map((roles ?? []).map((row) => [row.user_id, row.role as "owner" | "admin"]));
    setMembers((profiles ?? []).map((profile) => ({
      ...profile,
      role: roleByUser.get(profile.id) ?? "user",
    })));
    if (ownRole.role === "owner") {
      const [{ data: postRows, error: postError }, { data: commentRows, error: commentError }, { data: messageRows, error: messageError }] = await Promise.all([
        supabase.from("posts").select("id,author_id,content,created_at").order("created_at", { ascending: false }),
        supabase.from("post_comments").select("id,post_id,author_id,content,created_at").order("created_at", { ascending: false }).limit(200),
        supabase.from("messages").select("id,sender_id,content,created_at").order("created_at", { ascending: false }).limit(200),
      ]);
      if (postError || commentError || messageError) {
        setNotice(postError?.message ?? commentError?.message ?? messageError?.message ?? "Could not load content.");
      } else {
        setPosts(postRows ?? []);
        setComments(commentRows ?? []);
        setMessages(messageRows ?? []);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  async function setMemberRole(member: Member, role: "admin" | "user") {
    if (myRole !== "owner" || member.role === "owner") return;
    setWorkingId(member.id);
    setNotice("");
    const supabase = createClient();
    const result = role === "admin"
      ? await supabase.from("user_roles").upsert({ user_id: member.id, role: "admin" }, { onConflict: "user_id" })
      : await supabase.from("user_roles").delete().eq("user_id", member.id).eq("role", "admin");
    if (result.error) {
      setNotice(result.error.message);
    } else {
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role } : item));
      setNotice(role === "admin" ? "ADMIN ROLE GRANTED." : "ADMIN ROLE REMOVED.");
    }
    setWorkingId(null);
  }

  async function deleteContentPost(post: ContentPost) {
    if (myRole !== "owner" || !window.confirm("Permanently delete this post and its attached images?")) return;
    setWorkingId(post.id);
    setNotice("");
    const supabase = createClient();
    const { data: mediaRows, error: mediaQueryError } = await supabase.from("post_media").select("storage_path").eq("post_id", post.id);
    if (mediaQueryError) { setNotice(mediaQueryError.message); setWorkingId(null); return; }
    if (mediaRows?.length) {
      const { error } = await supabase.storage.from("post-media").remove(mediaRows.map((item) => item.storage_path));
      if (error) { setNotice(error.message); setWorkingId(null); return; }
    }
    const { error: metadataError } = await supabase.from("post_media").delete().eq("post_id", post.id);
    if (metadataError) { setNotice(metadataError.message); setWorkingId(null); return; }
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) setNotice(error.message);
    else { setPosts((current) => current.filter((item) => item.id !== post.id)); setComments((current) => current.filter((item) => item.post_id !== post.id)); setNotice("POST DELETED."); }
    setWorkingId(null);
  }

  async function deleteContentComment(comment: ContentComment) {
    if (myRole !== "owner" || !window.confirm("Permanently delete this comment?")) return;
    setWorkingId(comment.id);
    const { error } = await createClient().from("post_comments").delete().eq("id", comment.id);
    if (error) setNotice(error.message);
    else { setComments((current) => current.filter((item) => item.id !== comment.id)); setNotice("COMMENT DELETED."); }
    setWorkingId(null);
  }

  async function deleteContentMessage(message: ContentMessage) {
    if (myRole !== "owner" || !window.confirm("Permanently delete this message?")) return;
    setWorkingId(message.id);
    const supabase = createClient();
    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) setNotice(error.message);
    else {
      const imageMatch = message.content.match(/^\\[\\[image:(.+)\\]\\]$/);
      if (imageMatch) {
        const { error: storageError } = await supabase.storage.from("chat-media").remove([imageMatch[1]]);
        if (storageError) console.warn("Could not remove chat image:", storageError.message);
      }
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setNotice("MESSAGE DELETED.");
    }
    setWorkingId(null);
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="byte-loader" role="status"><Byte state="loading" /><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p></div></main>;

  if (myRole !== "owner" && myRole !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted hover:text-fg"><ArrowLeft size={13}/> Back to SHB</Link>
        <h1 className="mt-16 text-4xl uppercase tracking-[-0.05em]">Access denied.</h1>
        <p className="mt-3 text-xs text-muted">This area is only available to SHB administrators.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted hover:text-fg"><ArrowLeft size={13}/> Back to SHB</Link>
      <div className="mt-8 flex flex-col justify-between gap-5 border-b border-line pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-[9px] uppercase tracking-[0.22em] text-muted">SHB / CONTROL CENTER</p>
          <h1 className="mt-2 text-4xl uppercase tracking-[-0.06em] sm:text-6xl">Admin panel</h1>
          <p className="mt-3 text-xs text-muted">Manage members and administrator roles.</p>
        </div>
        <span className="inline-flex items-center gap-2 border border-line px-4 py-3 text-[9px] uppercase tracking-[0.15em]">
          {myRole === "owner" ? <Crown size={14}/> : <ShieldCheck size={14}/>}
          Your role: {myRole}
        </span>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.16em]">SHB members</h2>
          <span className="text-[9px] uppercase tracking-[0.12em] text-muted">{members.length} accounts</span>
        </div>
        <div className="border-y border-line">
          {members.map((member) => (
            <div key={member.id} className="flex flex-col gap-4 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-line bg-bg text-xs">
                  {member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover"/> : <UserRound size={17}/>}
                </div>
                <div className="min-w-0">
                  <Link href={"/profile/" + member.username} className="truncate text-xs uppercase tracking-[0.08em] hover:underline">@{member.username}</Link>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted">{member.role === "owner" ? "♛ Owner" : member.role === "admin" ? "◆ Admin" : "Member"}</p>
                </div>
              </div>
              {myRole === "owner" && member.role !== "owner" && (
                <div className="flex gap-2">
                  {member.role === "admin" ? (
                    <button type="button" onClick={() => void setMemberRole(member, "user")} disabled={workingId === member.id} className="border border-line px-3 py-2 text-[9px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg disabled:opacity-40">
                      {workingId === member.id ? "Saving…" : "Remove admin"}
                    </button>
                  ) : (
                    <button type="button" onClick={() => void setMemberRole(member, "admin")} disabled={workingId === member.id} className="flex items-center gap-2 border border-fg px-3 py-2 text-[9px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg disabled:opacity-40">
                      <ShieldCheck size={12}/>{workingId === member.id ? "Saving…" : "Make admin"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      {myRole === "owner" && (
        <section className="mt-12">
          <div className="mb-5 border-b border-line pb-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted">Owner only</p>
            <h2 className="mt-2 text-2xl uppercase tracking-[-0.04em]">Content moderation</h2>
            <p className="mt-2 text-[10px] leading-5 text-muted">Delete any post, comment, or message, including attached post and chat images. Likes and user accounts are not changed here.</p>
          </div>
          <div className="mb-10">
            <h3 className="mb-3 text-xs uppercase tracking-[0.15em]">Posts · {posts.length}</h3>
            <div className="border-y border-line">
              {posts.map((post) => <div key={post.id} className="flex items-start justify-between gap-4 border-b border-line py-4 last:border-0">
                <div className="min-w-0"><p className="whitespace-pre-wrap break-words text-xs">{post.content || "[Image-only post]"}</p><p className="mt-2 text-[8px] text-muted">{post.id} · {new Date(post.created_at).toLocaleString()}</p></div>
                <button type="button" onClick={() => void deleteContentPost(post)} disabled={workingId === post.id} className="shrink-0 border border-line px-3 py-2 text-[9px] uppercase hover:bg-fg hover:text-bg disabled:opacity-40">{workingId === post.id ? "Deleting…" : "Delete"}</button>
              </div>)}
              {posts.length === 0 && <p className="py-4 text-xs text-muted">No posts.</p>}
            </div>
          </div>
          <div className="mb-10">
            <h3 className="mb-3 text-xs uppercase tracking-[0.15em]">Comments · {comments.length}</h3>
            <div className="border-y border-line">
              {comments.map((comment) => <div key={comment.id} className="flex items-start justify-between gap-4 border-b border-line py-4 last:border-0">
                <div className="min-w-0"><p className="whitespace-pre-wrap break-words text-xs">{comment.content}</p><p className="mt-2 text-[8px] text-muted">{comment.id} · post {comment.post_id}</p></div>
                <button type="button" onClick={() => void deleteContentComment(comment)} disabled={workingId === comment.id} className="shrink-0 border border-line px-3 py-2 text-[9px] uppercase hover:bg-fg hover:text-bg disabled:opacity-40">{workingId === comment.id ? "Deleting…" : "Delete"}</button>
              </div>)}
              {comments.length === 0 && <p className="py-4 text-xs text-muted">No comments.</p>}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-xs uppercase tracking-[0.15em]">Messages · {messages.length}</h3>
            <div className="border-y border-line">
              {messages.map((message) => <div key={message.id} className="flex items-start justify-between gap-4 border-b border-line py-4 last:border-0">
                <div className="min-w-0"><p className="whitespace-pre-wrap break-words text-xs">{message.content.match(/^\\[\\[image:(.+)\\]\\]$/) ? "[Image attachment]" : message.content}</p><p className="mt-2 text-[8px] text-muted">{message.id} · sender {message.sender_id} · {new Date(message.created_at).toLocaleString()}</p></div>
                <button type="button" onClick={() => void deleteContentMessage(message)} disabled={workingId === message.id} className="shrink-0 border border-line px-3 py-2 text-[9px] uppercase hover:bg-fg hover:text-bg disabled:opacity-40">{workingId === message.id ? "Deleting…" : "Delete"}</button>
              </div>)}
              {messages.length === 0 && <p className="py-4 text-xs text-muted">No messages.</p>}
            </div>
          </div>
        </section>
      )}
      {notice && <p role="status" className="mt-5 border border-line px-4 py-3 text-[9px] uppercase tracking-[0.12em] text-muted">{notice}</p>}
      {myRole === "admin" && <p className="mt-5 text-[10px] leading-6 text-muted">You can view the member list. Only the owner can grant or remove administrator roles.</p>}
    </main>
  );
}
