"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
};

type Post = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: Profile;
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

export default function Home() {
  const supabase = createClient();
  const [userId, setUserId] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");

  const loadFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth/login";
        return;
      }
      setUserId(user.id);

      const { data: rows, error: postsError } = await supabase
        .from("posts")
        .select("id, author_id, content, created_at, profiles!posts_author_id_fkey(id, username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      const postRows = rows ?? [];
      const ids = postRows.map((row: any) => row.id);

      const [{ data: likes }, { data: comments }] = await Promise.all([
        ids.length
          ? supabase.from("post_likes").select("post_id, user_id").in("post_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("post_comments").select("post_id").in("post_id", ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      setPosts(postRows.map((row: any) => {
        const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          author_id: row.author_id,
          content: row.content,
          created_at: row.created_at,
          author,
          likeCount: (likes ?? []).filter((like: any) => like.post_id === row.id).length,
          commentCount: (comments ?? []).filter((comment: any) => comment.post_id === row.id).length,
          liked: (likes ?? []).some((like: any) => like.post_id === row.id && like.user_id === user.id),
        };
      }).filter((post) => post.author));
    } catch (e: any) {
      setError(e?.message ?? "Could not load feed.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadFeed();
    const timer = window.setInterval(loadFeed, 10000);
    return () => window.clearInterval(timer);
  }, [loadFeed]);

  async function createPost() {
    const content = text.trim();
    if (!content || posting) return;
    setPosting(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    const { error: insertError } = await supabase.from("posts").insert({
      author_id: user.id,
      content,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setText("");
      await loadFeed();
    }

    setPosting(false);
  }

  async function deletePost(post: Post) {
    if (deleting) return;
    if (!window.confirm("Delete this post?")) return;

    setDeleting(post.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("author_id", userId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setPosts((current) => current.filter((item) => item.id !== post.id));
    }

    setDeleting("");
  }

  async function toggleLike(post: Post) {
    const nextLiked = !post.liked;
    setPosts((current) => current.map((item) => item.id === post.id
      ? { ...item, liked: nextLiked, likeCount: item.likeCount + (nextLiked ? 1 : -1) }
      : item
    ));

    if (nextLiked) {
      const { error: likeError } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId });
      if (likeError && likeError.code !== "23505") {
        setError(likeError.message);
        await loadFeed();
      }
    } else {
      const { error: unlikeError } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", userId);
      if (unlikeError) {
        setError(unlikeError.message);
        await loadFeed();
      }
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <div className="mb-10 flex items-end justify-between border-b border-line pb-5">
        <div>
          <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-muted">Social / 001</p>
          <h1 className="text-4xl font-normal tracking-[-0.07em] sm:text-6xl">FEED</h1>
        </div>
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted">SHB</span>
      </div>

      <section className="mb-10 border border-line">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 5000))}
          placeholder="WRITE SOMETHING..."
          maxLength={5000}
          rows={4}
          className="block w-full resize-none bg-transparent px-5 py-5 text-sm leading-7 outline-none placeholder:text-muted"
        />
        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="text-[9px] uppercase tracking-[0.14em] text-muted">{text.length} / 5000</span>
          <button
            type="button"
            onClick={createPost}
            disabled={!text.trim() || posting}
            className="flex items-center gap-2 border border-fg px-4 py-2 text-[9px] uppercase tracking-[0.16em] transition-colors hover:bg-fg hover:text-bg disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send size={12} strokeWidth={1.4} />
            {posting ? "Posting" : "Post"}
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-6 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.1em] text-muted">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-[10px] uppercase tracking-[0.18em] text-muted">Loading feed...</div>
      ) : posts.length === 0 ? (
        <div className="border-y border-line py-20 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">No posts yet.</p>
          <p className="mt-3 text-xs text-muted">Be the first one.</p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {posts.map((post) => (
            <article key={post.id} className="py-7 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/profile/${post.author.username}`} className="flex min-w-0 items-center gap-3">
                  {post.author.avatar_url ? (
                    <img src={post.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center border border-line text-[10px]">{post.author.username.slice(0, 1).toUpperCase()}</div>
                  )}
                  <span className="text-xs uppercase tracking-[0.06em]">@{post.author.username}</span>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-muted">/ {formatTime(post.created_at)}</span>
                </Link>

                {post.author_id === userId && (
                  <button
                    type="button"
                    onClick={() => deletePost(post)}
                    disabled={deleting === post.id}
                    aria-label="Delete post"
                    title="Delete post"
                    className="text-muted transition-colors hover:text-fg disabled:opacity-30"
                  >
                    <Trash2 size={15} strokeWidth={1.25} />
                  </button>
                )}
              </div>

              <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7">{post.content}</p>

              <div className="mt-5 flex items-center gap-5">
                <button type="button" onClick={() => toggleLike(post)} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg">
                  <Heart size={15} strokeWidth={1.25} fill={post.liked ? "currentColor" : "none"} />
                  {post.likeCount}
                </button>
                <Link href={`/messages/${post.author.username}`} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg">
                  <MessageCircle size={15} strokeWidth={1.25} />
                  {post.commentCount}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
