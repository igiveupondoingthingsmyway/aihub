"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, Save, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string;
  bio: string;
  avatar_url: string;
  online: boolean;
};

const emptyProfile: Profile = { username: "", bio: "", avatar_url: "", online: true };

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      setEmail(user.email ?? "");
      const metadata = user.user_metadata ?? {};
      setProfile({
        username: metadata.username ?? "",
        bio: metadata.bio ?? "",
        avatar_url: metadata.avatar_url ?? "",
        online: true,
      });
      setLoading(false);
    }

    load();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      data: {
        username: profile.username.trim(),
        bio: profile.bio.trim(),
        avatar_url: profile.avatar_url.trim(),
      },
    });

    if (error) setMessage(error.message);
    else setMessage("Profile saved.");
    setSaving(false);
  }

  async function logout() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-24 text-xs uppercase tracking-[0.12em] text-muted sm:px-8">Loading...</main>;

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="border-y border-line py-3 text-[10px] uppercase tracking-[0.18em] text-muted">Account / Profile</div>

      <div className="mt-12 flex flex-col justify-between gap-10 border-b border-line pb-12 sm:flex-row sm:items-end">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-line">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound size={28} strokeWidth={1.25} />}
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em]">
              <span className="h-2 w-2 rounded-full bg-fg" /> Online
            </div>
            <h1 className="mt-3 text-4xl tracking-[-0.05em] sm:text-6xl">{profile.username || "YOUR PROFILE."}</h1>
            <p className="mt-2 text-sm text-muted">{email}</p>
          </div>
        </div>
        <button onClick={logout} className="flex w-fit items-center gap-2 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg"><LogOut size={14} /> Log out</button>
      </div>

      <section className="mt-12 max-w-2xl">
        <div className="border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Profile details</div>
        <div className="mt-8 space-y-6">
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Username</span>
            <input maxLength={24} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.replace(/\s/g, "").slice(0, 24) })} placeholder="yourusername" className="h-12 w-full border border-line bg-transparent px-4 text-sm focus:border-fg focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Avatar URL</span>
            <input type="url" value={profile.avatar_url} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} placeholder="https://..." className="h-12 w-full border border-line bg-transparent px-4 text-sm focus:border-fg focus:outline-none" />
            <span className="mt-2 block text-[10px] text-muted">Paste a direct image link. File uploads come next with Supabase Storage.</span>
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Bio</span>
            <textarea maxLength={160} rows={4} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value.slice(0, 160) })} placeholder="Tell people a little about yourself..." className="w-full resize-none border border-line bg-transparent px-4 py-3 text-sm focus:border-fg focus:outline-none" />
            <span className="mt-2 block text-right text-[10px] text-muted">{profile.bio.length}/160</span>
          </label>
          <div className="flex items-center justify-between border-y border-line py-4">
            <div><p className="text-[10px] uppercase tracking-[0.12em]">Network status</p><p className="mt-1 text-xs text-muted">Shown while you are active in SHB.</p></div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em]"><span className="h-2 w-2 rounded-full bg-fg" /> Online</div>
          </div>
          {message && <p className="text-xs text-muted">{message}</p>}
          <button onClick={saveProfile} disabled={saving} className="flex h-12 items-center gap-3 bg-fg px-5 text-[11px] uppercase tracking-[0.12em] text-bg disabled:opacity-50"><Save size={14} /> {saving ? "Saving..." : "Save profile"}</button>
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-8">
        <div className="flex items-baseline justify-between border-b border-line pb-3"><h2 className="text-xs uppercase tracking-[0.16em]">Saved tools</h2><Link href="/#tools" className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-fg">Browse tools →</Link></div>
        <div className="py-14 text-xs text-muted">Your saved AI tools will appear here.</div>
      </section>
    </main>
  );
}
