"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ImagePlus, LogOut, Save, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Byte } from "@/components/Byte";
import { PushSetup } from "@/components/PushSetup";

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
        .select("username,bio,avatar_url,banner_url,show_online")
        .eq("id", user.id)
        .maybeSingle();

      const metadata = user.user_metadata ?? {};
      setProfile({
        username: dbProfile?.username ?? metadata.username ?? "",
        bio: dbProfile?.bio ?? metadata.bio ?? "",
        avatar_url: dbProfile?.avatar_url ?? metadata.avatar_url ?? "",
        banner_url: dbProfile?.banner_url ?? metadata.banner_url ?? "",
        online: dbProfile?.show_online ?? true,
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
      show_online: profile.online,
    });

    if (profileError) {
      setMessage(profileError.message);
      setSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { username, bio, avatar_url: profile.avatar_url, banner_url: profile.banner_url, show_online: profile.online },
    });

    setMessage(authError ? authError.message : "Profile saved.");
    setSaving(false);
  }

  async function logout() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="byte-loader" role="status" aria-live="polite"><Byte state="loading" /><p className="byte-label">Loading<i>.</i><i>.</i><i>.</i></p><div className="byte-bar" aria-hidden="true"><i></i></div></div></main>;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-10 flex items-center justify-between border-b border-line pb-5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.22em] text-muted">Account</p>
          <h1 className="mt-2 text-3xl uppercase tracking-[-0.04em] sm:text-5xl">Profile settings</h1>
        </div>
        <Link href={"/profile/" + profile.username} className="border border-line px-4 py-3 text-[9px] uppercase tracking-[0.14em] hover:bg-fg hover:text-bg">View profile ↗</Link>
      </div>

      <section className="border border-line">
        <div className="relative h-40 bg-white/[0.03] sm:h-56">
          {profile.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
          <label className="absolute right-4 top-4 flex cursor-pointer items-center gap-2 border border-line bg-bg px-4 py-3 text-[9px] uppercase tracking-[0.14em] hover:bg-fg hover:text-bg">
            <ImagePlus size={13} /> {uploading === "banner" ? "Uploading" : "Change banner"}
            <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { const file=e.target.files?.[0]; if(file) uploadMedia("banner",file); e.currentTarget.value=""; }} />
          </label>
        </div>
        <div className="flex flex-col gap-5 border-t border-line p-5 sm:flex-row sm:items-center sm:p-8">
          <label className="relative h-28 w-28 shrink-0 cursor-pointer overflow-hidden border border-line bg-bg sm:h-32 sm:w-32">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><UserRound size={34} strokeWidth={1} /></div>}
            <span className="absolute bottom-0 inset-x-0 bg-bg py-2 text-center text-[8px] uppercase tracking-[0.16em]">Change</span>
            <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { const file=e.target.files?.[0]; if(file) uploadMedia("avatar",file); e.currentTarget.value=""; }} />
          </label>
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted"><span className={"h-1.5 w-1.5 rounded-full " + (profile.online ? "bg-fg" : "bg-muted")} /> {profile.online ? "Online" : "Offline"}</div>
            <div className="text-4xl uppercase tracking-[-0.05em] sm:text-6xl">{profile.username || "USERNAME"}</div>
            <div className="mt-2 text-xs text-muted">{email}</div>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <section className="border-t border-line pt-6">
          <div className="mb-7 flex items-end justify-between">
            <h2 className="text-sm uppercase tracking-[0.16em]">Profile details</h2>
            <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Edit</span>
          </div>
          <div className="space-y-7">
            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.16em] text-muted">Username</span>
              <input maxLength={24} value={profile.username} onChange={(e)=>setProfile({...profile,username:e.target.value.replace(/\\s/g,"").slice(0,24)})} className="h-14 w-full border border-line bg-transparent px-4 text-sm uppercase tracking-[0.05em] outline-none focus:border-fg" />
            </label>
            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.16em] text-muted">Bio</span>
              <textarea maxLength={160} rows={5} value={profile.bio} onChange={(e)=>setProfile({...profile,bio:e.target.value.slice(0,160)})} placeholder="Tell people a little about yourself..." className="w-full resize-none border border-line bg-transparent px-4 py-4 text-sm outline-none focus:border-fg" />
              <div className="mt-2 text-right text-[9px] uppercase tracking-[0.12em] text-muted">{profile.bio.length}/160</div>
            </label>
            <div className="flex items-center justify-between border-y border-line py-5">
              <div><div className="text-[10px] uppercase tracking-[0.14em]">Network status</div><p className="mt-1 text-xs text-muted">Shown while you are active in SHB.</p></div>
              <label className="flex cursor-pointer items-center gap-3">
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">{profile.online ? "Online" : "Offline"}</span>
                <input type="checkbox" checked={profile.online} onChange={(e)=>setProfile({...profile,online:e.target.checked})} className="peer sr-only" />
                <span className="relative h-6 w-11 border border-line after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:bg-fg after:transition-all peer-checked:bg-fg peer-checked:after:left-6 peer-checked:after:bg-bg" />
              </label>
            </div>
            {message && <p className="text-xs text-muted">{message}</p>}
            <button onClick={saveProfile} disabled={saving || !!uploading} className="flex h-14 w-full items-center justify-center gap-3 bg-fg text-[10px] uppercase tracking-[0.16em] text-bg hover:opacity-90 disabled:opacity-50"><Save size={14} /> {saving ? "Saving..." : "Save profile"}</button>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="border border-line p-6">
            <div className="mb-5 text-[9px] uppercase tracking-[0.18em] text-muted">Account</div>
            <div className="border-b border-line pb-5 text-sm">{email}</div>
            <button onClick={logout} className="mt-5 flex h-12 w-full items-center justify-center gap-2 border border-line text-[9px] uppercase tracking-[0.14em] hover:bg-fg hover:text-bg"><LogOut size={13} /> Log out</button>
          </div>
          <div className="border border-line p-5">
            <div className="flex items-center gap-4">
              <Byte state="idle" className="!w-[70px] shrink-0" />
              <p className="text-[10px] uppercase leading-5 tracking-[0.08em] text-muted">{message || "Your profile settings live here."}</p>
            </div>
          </div>
          <div className="border border-line p-5">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted">Notifications</div>
            <p className="mt-2 text-[10px] uppercase leading-5 tracking-[0.08em] text-muted">Enable push alerts for messages and activity on this device.</p>
            <PushSetup />
          </div>
          <div className="border-t border-line pt-5">
            <div className="mb-3 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[0.16em]">Saved tools</span><Link href="/ai-tools" className="text-[9px] uppercase tracking-[0.12em] text-muted hover:text-fg">Browse ↗</Link></div>
            <div className="border border-line p-5 text-[10px] text-muted">Your saved AI tools will appear here.</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
