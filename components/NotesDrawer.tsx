"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pin, Plus, Search, X, Trash2, Send, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Note = { id: string; title: string; content: string; pinned: boolean; created_at: string; updated_at: string };

export function NotesDrawer() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState("Notes are private. Only you see them.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedNote = notes.find(note => note.id === selected) || null;

  const loadNotes = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) { setNotes([]); setStatus("Sign in to keep your notes private."); return; }
    const { data, error: loadError } = await supabase.from("notes").select("id,title,content,pinned,created_at,updated_at").order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    if (loadError) { setError(loadError.message); setStatus("Couldn't load notes."); return; }
    setNotes((data || []) as Note[]);
    setError("");
    setStatus((data || []).length ? "Notes are private. Only you see them." : "Your list is empty. Make your first note.");
  }, []);

  useEffect(() => { if (open) void loadNotes(); }, [open, loadNotes]);

  const close = useCallback(() => { setOpen(false); setSelected(null); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (!typing && event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); setOpen(value => !value); }
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    document.body.classList.toggle("notes-open", open);
    return () => document.body.classList.remove("notes-open");
  }, [open]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  async function saveNow(id: string, nextTitle: string, nextContent: string, nextPinned?: boolean) {
    if (!userId) { setStatus("Sign in to save notes."); return; }
    setBusy(true);
    const patch: Record<string, unknown> = { title: nextTitle, content: nextContent, updated_at: new Date().toISOString() };
    if (typeof nextPinned === "boolean") patch.pinned = nextPinned;
    const { error: saveError } = await createClient().from("notes").update(patch).eq("id", id).eq("user_id", userId);
    setBusy(false);
    if (saveError) { setError(saveError.message); setStatus("Couldn't save."); }
    else { setError(""); setStatus("Saved."); setNotes(items => items.map(item => item.id === id ? { ...item, ...patch } as Note : item).sort((a,b) => Number(b.pinned)-Number(a.pinned) || Date.parse(b.updated_at)-Date.parse(a.updated_at))); }
  }

  function scheduleSave(id: string, nextTitle: string, nextContent: string) {
    setStatus("Typing...");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveNow(id, nextTitle, nextContent); }, 650);
  }

  async function createNote() {
    if (!userId) { setError("Please sign in first."); return; }
    const { data, error: createError } = await createClient().from("notes").insert({ user_id: userId, title: "", content: "" }).select("id,title,content,pinned,created_at,updated_at").single();
    if (createError || !data) { setError(createError?.message || "Couldn't create note."); return; }
    setNotes(items => [data as Note, ...items]);
    setSelected(data.id); setTitle(""); setContent(""); setStatus("Typing...");
  }

  function openNote(note: Note) { setSelected(note.id); setTitle(note.title); setContent(note.content); setStatus("Notes are private. Only you see them."); }
  function backToList() {
    if (selected && (title !== selectedNote?.title || content !== selectedNote?.content)) scheduleSave(selected, title, content);
    setSelected(null);
  }

  async function togglePin() {
    if (!selectedNote) return;
    const next = !selectedNote.pinned;
    await saveNow(selectedNote.id, title, content, next);
    setStatus(next ? "Pinned." : "Unpinned.");
  }

  async function deleteNote() {
    if (!selectedNote || !userId) return;
    const { error: deleteError } = await createClient().from("notes").delete().eq("id", selectedNote.id).eq("user_id", userId);
    if (deleteError) { setError(deleteError.message); return; }
    setNotes(items => items.filter(item => item.id !== selectedNote.id)); setSelected(null); setTitle(""); setContent(""); setStatus("Note deleted.");
  }

  async function makePost() {
    if (!userId || !content.trim()) { setError(!userId ? "Please sign in first." : "Write something before posting."); return; }
    const postContent = [title.trim(), content.trim()].filter(Boolean).join("\n\n");
    const { error: postError } = await createClient().from("posts").insert({ author_id: userId, content: postContent });
    if (postError) { setError(postError.message); return; }
    setStatus("Post created."); setError("");
  }

  const filtered = useMemo(() => notes.filter(note => (note.title + " " + note.content).toLowerCase().includes(query.toLowerCase())), [notes, query]);
  const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return <>
    <button type="button" className="notes-toggle" aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(value => !value)}>NOTES <kbd>N</kbd></button>
    {open && <button type="button" className="notes-scrim" aria-label="Close notes" onClick={close} />}
    <aside className={`notes-drawer ${open ? "is-open" : ""}`} id="drawer" aria-label="Notes" aria-hidden={!open}>
      <div className="notes-head">
        <h2>NOTES</h2>
        <div className="notes-head-actions">
          {selected && <button className="notes-btn" type="button" onClick={backToList}><ArrowLeft size={13}/> All</button>}
          <button className="notes-btn notes-primary" type="button" onClick={() => void createNote()}><Plus size={13}/> New</button>
          <button className="notes-btn notes-close" type="button" aria-label="Close notes" onClick={close}><X size={17}/></button>
        </div>
      </div>
      <div className="notes-body">
        <div className="notes-list-view" hidden={!!selected}>
          <label className="notes-search"><Search size={14}/><input value={query} onChange={e => setQuery(e.target.value)} type="search" placeholder="Search notes..." aria-label="Search notes"/></label>
          <div className="notes-list">
            {filtered.map(note => <button type="button" key={note.id} className={`notes-card ${selected === note.id ? "active" : ""}`} onClick={() => openNote(note)}>
              <span className="notes-card-title">{note.title.trim() || "Untitled note"} {note.pinned && <Pin size={12}/>}</span>
              <span className="notes-card-preview">{note.content.trim() || "Empty note"}</span>
              <span className="notes-card-date">{dateLabel(note.updated_at)}</span>
            </button>)}
            {!filtered.length && <div className="notes-empty">{query ? "No notes match your search." : "No notes yet. Create your first one."}</div>}
          </div>
        </div>
        <div className="notes-editor" hidden={!selected}>
          <label className="notes-field-label">Title<input className="notes-title-input" value={title} maxLength={80} onChange={e => { setTitle(e.target.value); if (selected) { setNotes(items => items.map(item => item.id === selected ? {...item,title:e.target.value} : item)); scheduleSave(selected,e.target.value,content); } }} placeholder="Title"/></label>
          <label className="notes-field-label">Note<textarea className="notes-textarea" value={content} maxLength={20000} onChange={e => { setContent(e.target.value); if (selected) { setNotes(items => items.map(item => item.id === selected ? {...item,content:e.target.value} : item)); scheduleSave(selected,title,e.target.value); } }} placeholder="Write something. Only you can see this."/></label>
          <div className="notes-actions">
            <button className="notes-btn" type="button" onClick={() => void togglePin()}><Pin size={13}/>{selectedNote?.pinned ? "Unpin" : "Pin"}</button>
            <button className="notes-btn notes-primary" type="button" onClick={() => void makePost()}><Send size={13}/> Make a post</button>
            <button className="notes-btn notes-delete" type="button" onClick={() => void deleteNote()}><Trash2 size={13}/> Delete</button>
          </div>
        </div>
      </div>
      <div className="notes-byte" aria-live="polite">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 5h38v28H20l-9 8v-8H5z" fill="#101010" stroke="#ececec" strokeWidth="2"/><rect x="14" y="13" width="5" height="5" fill="#ececec"/><rect x="29" y="13" width="5" height="5" fill="#ececec"/><rect x="19" y="24" width="10" height="3" fill="#ececec"/><g className={status === "Typing..." ? "notes-dots is-typing" : "notes-dots"} fill="#ececec"><circle cx="18" cy="25.5" r="1.8"/><circle cx="24" cy="25.5" r="1.8"/><circle cx="30" cy="25.5" r="1.8"/></g></svg>
        <div><strong>Byte</strong><p>{error || status}</p>{error && <button type="button" onClick={() => setError("")}>Dismiss</button>}</div>
      </div>
    </aside>
  </>;
}
