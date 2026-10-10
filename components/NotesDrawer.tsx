"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pin, Plus, Search, X, Trash2, Save } from "lucide-react";

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

const STORAGE_KEY = "shb-local-notes-v1";

export function NotesDrawer() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Private notes. Saved only in this browser.");
  const [error, setError] = useState("");

  const selectedNote = notes.find(note => note.id === selected) || null;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setNotes(parsed as Note[]);
      }
    } catch {
      setError("Couldn't read local notes from this browser.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setStatus("Saved locally · only this browser");
      setError("");
    } catch {
      setError("Couldn't save locally. Check browser storage space/settings.");
    }
  }, [notes, loaded]);

  const close = useCallback(() => {
    setOpen(false);
    setSelected(null);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (!typing && event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setOpen(value => !value);
      }
      if (event.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  useEffect(() => {
    document.body.classList.toggle("notes-open", open);
    return () => document.body.classList.remove("notes-open");
  }, [open]);

  function createNote() {
    const now = new Date().toISOString();
    const note: Note = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
      title: "",
      content: "",
      pinned: false,
      created_at: now,
      updated_at: now,
    };
    setNotes(items => [note, ...items]);
    setSelected(note.id);
    setError("");
  }

  function updateSelected(patch: Partial<Pick<Note, "title" | "content" | "pinned">>) {
    if (!selected) return;
    const now = new Date().toISOString();
    setNotes(items => items.map(note => note.id === selected ? { ...note, ...patch, updated_at: now } : note)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updated_at) - Date.parse(a.updated_at)));
  }

  function saveNote() {
    if (!selectedNote || !loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setStatus("Note saved locally · only this browser");
      setError("");
    } catch {
      setError("Couldn't save locally. Check browser storage space/settings.");
    }
  }

  function deleteNote() {
    if (!selected) return;
    setNotes(items => items.filter(note => note.id !== selected));
    setSelected(null);
    setError("");
  }

  const filtered = useMemo(
    () => notes.filter(note => (note.title + " " + note.content).toLowerCase().includes(query.toLowerCase())),
    [notes, query],
  );

  const dateLabel = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return <>
    <button type="button" className="notes-toggle" aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(value => !value)}>NOTES <kbd>N</kbd></button>
    {open && <button type="button" className="notes-scrim" aria-label="Close notes" onClick={close} />}
    <aside className={`notes-drawer ${open ? "is-open" : ""}`} id="drawer" aria-label="Local notes" aria-hidden={!open}>
      <div className="notes-head">
        <h2>NOTES</h2>
        <div className="notes-head-actions">
          {selected && <button className="notes-btn" type="button" onClick={() => setSelected(null)}><ArrowLeft size={13}/> All</button>}
          <button className="notes-btn notes-primary" type="button" onClick={createNote}><Plus size={13}/> New</button>
          <button className="notes-btn notes-close" type="button" aria-label="Close notes" onClick={close}><X size={17}/></button>
        </div>
      </div>
      <div className="notes-body">
        <div className="notes-list-view" hidden={!!selected}>
          <label className="notes-search"><Search size={14}/><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search notes..." aria-label="Search local notes"/></label>
          <div className="notes-list">
            {filtered.map(note => <button type="button" key={note.id} className="notes-card" onClick={() => setSelected(note.id)}>
              <span className="notes-card-title">{note.title.trim() || "Untitled note"} {note.pinned && <Pin size={12}/>}</span>
              <span className="notes-card-preview">{note.content.trim() || "Empty note"}</span>
              <span className="notes-card-date">{dateLabel(note.updated_at)}</span>
            </button>)}
            {!filtered.length && <div className="notes-empty">{query ? "No notes match your search." : "No notes yet. Create your first one."}</div>}
          </div>
        </div>
        <div className="notes-editor" hidden={!selected}>
          <label className="notes-field-label">Title<input className="notes-title-input" value={selectedNote?.title ?? ""} maxLength={80} onChange={event => updateSelected({ title: event.target.value })} placeholder="Title"/></label>
          <label className="notes-field-label">Note<textarea className="notes-textarea" value={selectedNote?.content ?? ""} maxLength={20000} onChange={event => updateSelected({ content: event.target.value })} placeholder="Write something. Only you can see this."/></label>
          <div className="notes-actions">
            <button className="notes-btn notes-primary" type="button" onClick={saveNote} disabled={!selectedNote || !loaded}><Save size={13}/> Save note</button>
            <button className="notes-btn" type="button" onClick={() => selectedNote && updateSelected({ pinned: !selectedNote.pinned })}><Pin size={13}/>{selectedNote?.pinned ? "Unpin" : "Pin"}</button>
            <button className="notes-btn notes-delete" type="button" onClick={deleteNote}><Trash2 size={13}/> Delete</button>
          </div>
        </div>
      </div>
      <div className="notes-byte" aria-live="polite">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 5h38v28H20l-9 8v-8H5z" fill="#101010" stroke="#ececec" strokeWidth="2"/><rect x="14" y="13" width="5" height="5" fill="#ececec"/><rect x="29" y="13" width="5" height="5" fill="#ececec"/><rect x="19" y="24" width="10" height="3" fill="#ececec"/><g className="notes-dots" fill="#ececec"><circle cx="18" cy="25.5" r="1.8"/><circle cx="24" cy="25.5" r="1.8"/><circle cx="30" cy="25.5" r="1.8"/></g></svg>
        <div><strong>Byte</strong><p>{error || status}</p></div>
      </div>
    </aside>
  </>;
}
