"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ImagePlus, MessageCircle, Send, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: Profile;
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
  mediaUrls: string[];
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
  const [isOwner, setIsOwner] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [commenting, setCommenting] = useState("");
  const [deleting, setDeleting] = useState("");
  const [deletingComment, setDeletingComment] = useState("");
  const [error, setError] = useState("");
  const [postImages, setPostImages] = useState<File[]>([]);

  const loadFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserId(user.id);
      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      setIsOwner(roleRow?.role === "owner");

      const { data: rows, error: postsError } = await supabase
        .from("posts")
        .select("id, author_id, content, created_at, profiles!posts_author_id_fkey(id, username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      const postRows = rows ?? [];
      const ids = postRows.map((row: any) => row.id);

      const [{ data: likes }, { data: commentRows }, { data: mediaRows }] = await Promise.all([
        ids.length
          ? supabase.from("post_likes").select("post_id, user_id").in("post_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("post_comments").select("id, post_id, author_id, content, created_at, profiles!post_comments_author_id_fkey(id, username, avatar_url)").in("post_id", ids).order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("post_media").select("post_id, storage_path, position").in("post_id", ids).order("position", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const grouped: Record<string, Comment[]> = {};
      for (const row of commentRows ?? []) {
        const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        if (!author) continue;
        if (!grouped[row.post_id]) grouped[row.post_id] = [];
        grouped[row.post_id].push({
          id: row.id,
          post_id: row.post_id,
          author_id: row.author_id,
          content: row.content,
          created_at: row.created_at,
          author,
        });
      }
      setComments(grouped);

      setPosts(postRows.map((row: any) => {
        const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          author_id: row.author_id,
          content: row.content,
          created_at: row.created_at,
          author,
          likeCount: (likes ?? []).filter((like: any) => like.post_id === row.id).length,
          commentCount: (commentRows ?? []).filter((comment: any) => comment.post_id === row.id).length,
          liked: (likes ?? []).some((like: any) => like.post_id === row.id && like.user_id === user.id),
          mediaUrls: (mediaRows ?? [])
            .filter((media: any) => media.post_id === row.id)
            .map((media: any) => supabase.storage.from("post-media").getPublicUrl(media.storage_path).data.publicUrl),
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
    const content = commentText["__post__"]?.trim() ?? "";
    if ((!content && postImages.length === 0) || posting) return;
    if (postImages.some((file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) {
      setError("Choose image files up to 5 MB each.");
      return;
    }
    if (postImages.length > 4) {
      setError("You can attach up to 4 images per post.");
      return;
    }
    setPosting(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: createdPost, error: insertError } = await supabase
      .from("posts")
      .insert({ author_id: user.id, content: content || " " })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (createdPost) {
      let uploadError = "";
      for (let position = 0; position < postImages.length; position++) {
        const file = postImages[position];
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = user.id + "/" + createdPost.id + "/" + crypto.randomUUID() + "-" + safeName;
        const { error: storageError } = await supabase.storage.from("post-media").upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });
        if (storageError) {
          uploadError = storageError.message;
          break;
        }
        const { error: mediaError } = await supabase.from("post_media").insert({
          post_id: createdPost.id,
          storage_path: storagePath,
          media_type: "image",
          position,
        });
        if (mediaError) {
          await supabase.storage.from("post-media").remove([storagePath]);
          uploadError = mediaError.message;
          break;
        }
      }
      setCommentText((current) => ({ ...current, __post__: "" }));
      setPostImages([]);
      if (uploadError) setError("Post published, but an image could not be uploaded: " + uploadError);
      await loadFeed();
    }

    setPosting(false);
  }

  async function addComment(postId: string) {
    const content = commentText[postId]?.trim() ?? "";
    if (!content || commenting) return;

    setCommenting(postId);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error: insertError } = await supabase.from("post_comments").insert({
      post_id: postId,
      author_id: user.id,
      content,
    });

    if (insertError) setError(insertError.message);
    else {
      setCommentText((current) => ({ ...current, [postId]: "" }));
      const targetUserId = posts.find((post) => post.id === postId)?.author_id;
      if (targetUserId && targetUserId !== user.id) {
        void fetch("/api/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId, kind: "post_comment", url: "/" }) }).catch(() => {});
      }
      await loadFeed();
    }

    setCommenting("");
  }

  async function deleteComment(comment: Comment) {
    if (deletingComment) return;
    if (!window.confirm("Delete this comment?")) return;

    setDeletingComment(comment.id);
    setError("");

    let deleteQuery = supabase.from("post_comments").delete().eq("id", comment.id);
    if (!isOwner) deleteQuery = deleteQuery.eq("author_id", userId);
    const { error: deleteError } = await deleteQuery;

    if (deleteError) setError(deleteError.message);
    else {
      setComments((current) => ({
        ...current,
        [comment.post_id]: (current[comment.post_id] ?? []).filter((item) => item.id !== comment.id),
      }));
      setPosts((current) => current.map((post) => post.id === comment.post_id
        ? { ...post, commentCount: Math.max(0, post.commentCount - 1) }
        : post
      ));
    }

    setDeletingComment("");
  }

  async function deletePost(post: Post) {
    if (deleting) return;
    if (!window.confirm("Delete this post?")) return;

    setDeleting(post.id);
    setError("");

    const { data: mediaRows, error: mediaQueryError } = await supabase
      .from("post_media").select("storage_path").eq("post_id", post.id);
    if (mediaQueryError) {
      setError(mediaQueryError.message);
      setDeleting("");
      return;
    }
    if (mediaRows?.length) {
      const { error: storageError } = await supabase.storage.from("post-media").remove(mediaRows.map((item) => item.storage_path));
      if (storageError) {
        setError(storageError.message);
        setDeleting("");
        return;
      }
    }
    let deleteQuery = supabase.from("posts").delete().eq("id", post.id);
    if (!isOwner) deleteQuery = deleteQuery.eq("author_id", userId);
    const { error: deleteError } = await deleteQuery;

    if (deleteError) setError(deleteError.message);
    else {
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setComments((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
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
      } else if (!likeError && post.author_id !== userId) {
        void fetch("/api/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: post.author_id, kind: "post_like", url: "/" }) }).catch(() => {});
      }
    } else {
      const { error: unlikeError } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", userId);
      if (unlikeError) {
        setError(unlikeError.message);
        await loadFeed();
      }
    }
  }

  function toggleComments(postId: string) {
    setOpenComments((current) => ({ ...current, [postId]: !current[postId] }));
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
          value={commentText["__post__"] ?? ""}
          onChange={(e) => setCommentText((current) => ({ ...current, __post__: e.target.value.slice(0, 5000) }))}
          placeholder="WRITE SOMETHING..."
          maxLength={5000}
          rows={4}
          className="block w-full resize-none bg-transparent px-5 py-5 text-sm leading-7 outline-none placeholder:text-muted"
        />
        {postImages.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
            {postImages.map((file, index) => (
              <div key={file.name + file.size + index} className="flex items-center gap-2 border border-line px-2 py-1 text-[9px]">
                <span className="max-w-40 truncate">{file.name}</span>
                <button type="button" onClick={() => setPostImages((current) => current.filter((_, i) => i !== index))} aria-label={"Remove " + file.name}><X size={12}/></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-muted hover:text-fg">
              <ImagePlus size={14} strokeWidth={1.3} />
              Add images
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple className="sr-only" onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                setPostImages((current) => [...current, ...picked].slice(0, 4));
                e.currentTarget.value = "";
              }} />
            </label>
            <span className="text-[9px] uppercase tracking-[0.14em] text-muted">{(commentText["__post__"] ?? "").length} / 5000</span>
          </div>
          <button type="button" onClick={createPost} disabled={(!(commentText["__post__"] ?? "").trim() && postImages.length === 0) || posting} className="flex items-center gap-2 border border-fg px-4 py-2 text-[9px] uppercase tracking-[0.16em] transition-colors hover:bg-fg hover:text-bg disabled:cursor-not-allowed disabled:opacity-30">
            <Send size={12} strokeWidth={1.4} />
            {posting ? "Posting" : "Post"}
          </button>
        </div>
      </section>

      {error && <div className="mb-6 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.1em] text-muted">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-[10px] uppercase tracking-[0.18em] text-muted">Loading feed...</div>
      ) : posts.length === 0 ? (
        <div className="border-y border-line py-20 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">No posts yet.</p>
          <p className="mt-3 text-xs text-muted">Be the first one.</p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {posts.map((post) => {
            const postComments = comments[post.id] ?? [];
            const isCommentsOpen = openComments[post.id];

            return (
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

                  {(post.author_id === userId || isOwner) && (
                    <button type="button" onClick={() => deletePost(post)} disabled={deleting === post.id} aria-label="Delete post" title="Delete post" className="text-muted transition-colors hover:text-fg disabled:opacity-30">
                      <Trash2 size={15} strokeWidth={1.25} />
                    </button>
                  )}
                </div>

                {post.content.trim() && <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7">{post.content}</p>}
                {post.mediaUrls.length > 0 && (
                  <div className={"mt-5 grid gap-2 " + (post.mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                    {post.mediaUrls.map((url, index) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden border border-line bg-fg/5">
                        <img src={url} alt={"Post image " + (index + 1)} loading="lazy" className="max-h-[560px] w-full object-contain" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex items-center gap-5">
                  <button type="button" onClick={() => toggleLike(post)} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg">
                    <Heart size={15} strokeWidth={1.25} fill={post.liked ? "currentColor" : "none"} />
                    {post.likeCount}
                  </button>
                  <button type="button" onClick={() => toggleComments(post.id)} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg">
                    <MessageCircle size={15} strokeWidth={1.25} />
                    {post.commentCount}
                  </button>
                </div>

                {isCommentsOpen && (
                  <div className="mt-6 ml-3 border-l-2 border-line pl-5 sm:ml-6 sm:pl-6">
                    <div className="mb-4 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted">
                      <MessageCircle size={12} strokeWidth={1.25} />
                      <span>Comments</span>
                    </div>
                    <div className="space-y-5">
                      {postComments.length === 0 ? (
                        <p className="text-[9px] uppercase tracking-[0.14em] text-muted">No comments yet.</p>
                      ) : (
                        postComments.map((comment) => (
                          <div key={comment.id} className="relative flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <Link
                                href={`/profile/${comment.author.username}`}
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg text-[9px] transition-opacity hover:opacity-70"
                                aria-label={`Open @${comment.author.username} profile`}
                              >
                                {comment.author.avatar_url ? (
                                  <img src={comment.author.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  comment.author.username.slice(0, 1).toUpperCase()
                                )}
                              </Link>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link href={`/profile/${comment.author.username}`} className="text-[10px] uppercase tracking-[0.06em] hover:underline">
                                    @{comment.author.username}
                                  </Link>
                                  <span className="text-[8px] uppercase tracking-[0.1em] text-muted">/ {formatTime(comment.created_at)}</span>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-fg/90">{comment.content}</p>
                              </div>
                            </div>

                            {(comment.author_id === userId || isOwner) && (
                              <button
                                type="button"
                                onClick={() => deleteComment(comment)}
                                disabled={deletingComment === comment.id}
                                aria-label="Delete comment"
                                title="Delete comment"
                                className="shrink-0 text-muted transition-colors hover:text-fg disabled:opacity-30"
                              >
                                <Trash2 size={13} strokeWidth={1.25} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-6 flex gap-2 border-t border-line pt-4">
                      <input
                        value={commentText[post.id] ?? ""}
                        onChange={(e) => setCommentText((current) => ({ ...current, [post.id]: e.target.value.slice(0, 2000) }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void addComment(post.id);
                          }
                        }}
                        placeholder="WRITE A COMMENT..."
                        maxLength={2000}
                        className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted"
                      />
                      <button type="button" onClick={() => addComment(post.id)} disabled={!(commentText[post.id] ?? "").trim() || commenting === post.id} className="flex shrink-0 items-center gap-2 border border-fg px-3 py-2 text-[9px] uppercase tracking-[0.14em] transition-colors hover:bg-fg hover:text-bg disabled:cursor-not-allowed disabled:opacity-30">
                        <Send size={11} strokeWidth={1.4} />
                        {commenting === post.id ? "Sending" : "Send"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
