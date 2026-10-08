"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ImagePlus, LogOut, Save, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  online: boolean;
};

const emptyProfile: Profile = { username: "", bio: "", avatar_url: "", banner_url: "", online: true };
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("username,bio,avatar_url,banner_url")
        .eq("id", user.id)
        .maybeSingle();

      const metadata = user.user_metadata ?? {};
      setProfile({
        username: dbProfile?.username ?? metadata.username ?? "",
        bio: dbProfile?.bio ?? metadata.bio ?? "",
        avatar_url: dbProfile?.avatar_url ?? metadata.avatar_url ?? "",
        banner_url: dbProfile?.banner_url ?? metadata.banner_url ?? "",
        online: true,
      });
      setLoading(false);
    }

    load();
  }, []);

  async function uploadMedia(type: "avatar" | "banner", file: File) {
    if (!userId) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage("Image must be 5 MB or smaller.");
      return;
    }

    setUploading(type);
    setMessage("");
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = userId + "/" + type + "-" + Date.now() + "." + extension;

    const { error: uploadError } = await supabase.storage
      .from("profile-media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setMessage(uploadError.message);
      setUploading(null);
      return;
    }

    const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
    const url = data.publicUrl;

    setProfile((current) => ({ ...current, [type === "avatar" ? "avatar_url" : "banner_url"]: url }));
    setMessage(type === "avatar" ? "Avatar uploaded." : "Banner uploaded.");
    setUploading(null);
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const username = profile.username.trim().toLowerCase();
    const bio = profile.bio.trim();

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      username,
      bio,
      avatar_url: profile.avatar_url,
      banner_url: profile.banner_url,
    });

    if (profileError) {
      setMessage(profileError.message);
      setSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { username, bio, avatar_url: profile.avatar_url, banner_url: profile.banner_url },
    });

    setMessage(authError ? authError.message : "Profile saved.");
    setSaving(false);
  }

  async function logout() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="byte-loader" role="status" aria-live="polite"><svg className="byte-svg" viewBox="270 85 210 150" aria-hidden="true" focusable="false"><line className="byte-ground" x1="285" y1="224" x2="395" y2="224"/><g className="byte-bob"><rect className="byte-leg byte-leg-a" x="344" y="210" width="10" height="14"/><rect className="byte-leg byte-leg-b" x="372" y="210" width="10" height="14"/><line className="byte-antenna-line" x1="340" y1="120" x2="340" y2="102"/><rect className="byte-antenna" x="335" y="92" width="10" height="10"/><rect className="byte-body" x="290" y="120" width="100" height="90"/><path className="byte-body" d="M306 210 L306 232 L330 210"/><line className="byte-seam" x1="307" y1="210" x2="329" y2="210"/><g className="byte-eyes"><rect x="314" y="152" width="14" height="14"/><rect x="352" y="152" width="14" height="14"/></g><rect className="byte-cursor" x="328" y="186" width="24" height="4"/></g><rect className="byte-bubble" x="408" y="104" width="68" height="30"/><rect className="byte-dot" x="420" y="115" width="8" height="8"/><rect className="byte-dot byte-dot-2" x="438" y="115" width="8" height="8"/><rect className="byte-dot byte-dot-3" x="456" y="115" width="8" height="8"/></svg><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="border-y border-line py-3 text-[10px] uppercase tracking-[0.18em] text-muted">Account / Profile</div>

      <div className="mt-12 overflow-hidden border border-line">
        <div className="relative h-48 bg-white/[0.02] sm:h-64">
          {profile.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
          <label className="absolute right-4 top-4 flex cursor-pointer items-center gap-2 border border-line bg-bg/90 px-3 py-2 text-[9px] uppercase tracking-[0.1em] backdrop-blur-sm hover:bg-fg hover:text-bg">
            <ImagePlus size={13} />
            {uploading === "banner" ? "Uploading..." : "Banner"}
            <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadMedia("banner", file); e.currentTarget.value = ""; }} />
          </label>
        </div>

        <div className="flex flex-col gap-6 px-5 pb-8 sm:flex-row sm:items-end sm:px-8">
          <div className="-mt-14">
            <label className="relative block h-28 w-28 cursor-pointer overflow-hidden border border-line bg-bg">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><UserRound size={32} strokeWidth={1.1} /></div>}
              <span className="absolute inset-x-0 bottom-0 bg-bg/90 py-2 text-center text-[8px] uppercase tracking-[0.1em]">Change</span>
              <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadMedia("avatar", file); e.currentTarget.value = ""; }} />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em]">
              <span className="h-2 w-2 rounded-full bg-fg" /> Online
            </div>
            <h1 className="mt-3 text-4xl tracking-[-0.05em] sm:text-6xl">{profile.username || "YOUR PROFILE"}</h1>
            <p className="mt-2 text-sm text-muted">{email}</p>
          </div>
          <button onClick={logout} className="flex w-fit items-center gap-2 border border-line px-4 py-3 text-[10px] uppercase tracking-[0.12em] hover:bg-fg hover:text-bg"><LogOut size={14} /> Log out</button>
        </div>
      </div>

      <section className="mt-12 max-w-2xl">
        <div className="border-b border-line pb-3 text-xs uppercase tracking-[0.16em]">Profile details</div>
        <div className="mt-8 space-y-6">
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted">Username</span>
            <input maxLength={24} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.replace(/\s/g, "").slice(0, 24) })} placeholder="yourusername" className="h-12 w-full border border-line bg-transparent px-4 text-sm focus:border-fg focus:outline-none" />
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
          <button onClick={saveProfile} disabled={saving || !!uploading} className="flex h-12 items-center gap-3 bg-fg px-5 text-[11px] uppercase tracking-[0.12em] text-bg disabled:opacity-50"><Save size={14} /> {saving ? "Saving..." : "Save profile"}</button>
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-8">
        <div className="flex items-baseline justify-between border-b border-line pb-3"><h2 className="text-xs uppercase tracking-[0.16em]">Saved tools</h2><Link href="/ai-tools" className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-fg">Browse tools →</Link></div>
        <div className="py-14 text-xs text-muted">Your saved AI tools will appear here.</div>
      </section>
    </main>
  );
}
