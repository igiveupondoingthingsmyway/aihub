"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; avatar_url: string };
type Post = { id:string; author_id:string; content:string; created_at:string; author:Profile; likeCount:number; commentCount:number; liked:boolean };
type Comment = { id:string; post_id:string; author_id:string; content:string; created_at:string; author:Profile };

const time = (v:string) => { const m=Math.max(0,Math.floor((Date.now()-new Date(v).getTime())/60000)); return m<1?"NOW":m<60?m+"M":m<1440?Math.floor(m/60)+"H":Math.floor(m/1440)+"D"; };

export function MobileFeed() {
  const supabase = createClient();
  const [tab,setTab]=useState("All"), [userId,setUserId]=useState(""), [posts,setPosts]=useState<Post[]>([]);
  const [comments,setComments]=useState<Record<string,Comment[]>>({}), [open,setOpen]=useState<Record<string,boolean>>({});
  const [comment,setComment]=useState<Record<string,string>>({}), [loading,setLoading]=useState(true), [error,setError]=useState("");

  const load=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){ window.location.href="/auth/login"; return; }
    setUserId(user.id);
    const {data:rows,error:e}=await supabase.from("posts").select("id,author_id,content,created_at,profiles!posts_author_id_fkey(id,username,avatar_url)").order("created_at",{ascending:false}).limit(50);
    if(e){setError(e.message);setLoading(false);return;}
    const ids=(rows??[]).map((r:any)=>r.id);
    const [{data:likes},{data:cr}]=await Promise.all([
      ids.length?supabase.from("post_likes").select("post_id,user_id").in("post_id",ids):Promise.resolve({data:[] as any[]}),
      ids.length?supabase.from("post_comments").select("id,post_id,author_id,content,created_at,profiles!post_comments_author_id_fkey(id,username,avatar_url)").in("post_id",ids).order("created_at",{ascending:true}):Promise.resolve({data:[] as any[]})
    ]);
    const grouped:Record<string,Comment[]>={};
    (cr??[]).forEach((r:any)=>{const a=Array.isArray(r.profiles)?r.profiles[0]:r.profiles;if(a)(grouped[r.post_id]??=[]).push({...r,author:a});});
    setComments(grouped);
    setPosts((rows??[]).map((r:any)=>{const a=Array.isArray(r.profiles)?r.profiles[0]:r.profiles;return {id:r.id,author_id:r.author_id,content:r.content,created_at:r.created_at,author:a,likeCount:(likes??[]).filter((x:any)=>x.post_id===r.id).length,commentCount:(cr??[]).filter((x:any)=>x.post_id===r.id).length,liked:(likes??[]).some((x:any)=>x.post_id===r.id&&x.user_id===user.id)}}).filter((p:any)=>p.author));
    setLoading(false);
  },[supabase]);

  useEffect(()=>{void load();const t=window.setInterval(()=>void load(),10000);return()=>window.clearInterval(t)},[load]);

  async function like(p:Post){const next=!p.liked;setPosts(x=>x.map(i=>i.id===p.id?{...i,liked:next,likeCount:i.likeCount+(next?1:-1)}:i));const q=next?supabase.from("post_likes").insert({post_id:p.id,user_id:userId}):supabase.from("post_likes").delete().eq("post_id",p.id).eq("user_id",userId);const {error:e}=await q;if(e)void load();}
  async function addComment(id:string){const c=(comment[id]??"").trim();if(!c)return;const {error:e}=await supabase.from("post_comments").insert({post_id:id,author_id:userId,content:c});if(e)setError(e.message);else{setComment(x=>({...x,[id]:""}));void load();}}
  async function delPost(p:Post){if(!window.confirm("Delete this post?"))return;const {error:e}=await supabase.from("posts").delete().eq("id",p.id).eq("author_id",userId);if(e)setError(e.message);else setPosts(x=>x.filter(i=>i.id!==p.id));}

  if(loading)return <main className="mobile-page"><div className="mobile-page-title"><span>SOCIAL / 001</span><h1>FEED</h1></div><div className="mobile-loading">LOADING<span>•••</span></div></main>;
  return <main className="mobile-page">
    <div className="mobile-page-title"><span>SOCIAL / 001</span><h1>FEED</h1></div>
    <div className="mobile-tabs">{["All","Friends","Tools"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</button>)}</div>
    {error&&<div className="mobile-error">{error}</div>}
    {posts.length===0?<div className="mobile-empty">NO POSTS YET.<small>BE THE FIRST ONE.</small></div>:
      <div className="mobile-post-list">{posts.map(p=><article className="mobile-post" key={p.id}>
        <div className="mobile-post-head"><Link href={"/profile/"+p.author.username} className="mobile-user">{p.author.avatar_url?<img src={p.author.avatar_url} alt=""/>:<span>{p.author.username[0]?.toUpperCase()}</span>}<b>@{p.author.username}</b></Link><span>{time(p.created_at)}</span>{p.author_id===userId&&<button onClick={()=>void delPost(p)} aria-label="Delete post"><Trash2 size={13}/></button>}</div>
        <p className="mobile-post-text">{p.content}</p>
        <div className="mobile-post-actions"><button onClick={()=>void like(p)} className={p.liked?"liked":""}><Heart size={16} fill={p.liked?"currentColor":"none"}/>{p.likeCount}</button><button onClick={()=>setOpen(x=>({...x,[p.id]:!x[p.id]}))}><MessageCircle size={16}/>{p.commentCount}</button></div>
        {open[p.id]&&<div className="mobile-comments">{(comments[p.id]??[]).map(c=><div className="mobile-comment" key={c.id}><b>@{c.author.username}</b><span>{c.content}</span></div>)}<div className="mobile-comment-input"><input value={comment[p.id]??""} onChange={e=>setComment(x=>({...x,[p.id]:e.target.value.slice(0,2000)}))} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();void addComment(p.id)}}} placeholder="COMMENT..."/><button onClick={()=>void addComment(p.id)}><Send size={13}/></button></div></div>}
      </article>)}</div>}
  </main>;
}
