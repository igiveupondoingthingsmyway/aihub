"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Check, Heart, MessageCircle, MessageSquare, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PushSetup } from "@/components/PushSetup";

const BYTE_NOTIFICATION_ICON = "/ic_stat_byte_96.png.png";
const BYTE_NOTIFICATION_IMAGE = "/byte-icon-512.png.png";

type NotificationItem = {
  id: string;
  kind: string;
  username?: string;
  created_at?: string;
};

function timeLabel(value?: string) {
  if (!value) return "";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H`;
  const days = Math.floor(hours / 24);
  return `${days}D`;
}

export function MobileNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: requests } = await supabase
      .from("friend_requests")
      .select("id,sender_id,created_at")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const { data: notifications } = await supabase
      .from("notifications")
      .select("id,type,sender_id,created_at")
      .eq("user_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    const ids = [
      ...(requests ?? []).map((item) => item.sender_id),
      ...(notifications ?? []).map((item) => item.sender_id),
    ];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id,username,avatar_url").in("id", ids)
      : { data: [] };

    setItems([
      ...(requests ?? []).map((item) => ({
        id: "f" + item.id,
        kind: "friend",
        username: profiles?.find((profile) => profile.id === item.sender_id)?.username,
        created_at: item.created_at,
      })),
      ...(notifications ?? []).map((item) => ({
        id: item.id,
        kind: item.type,
        username: profiles?.find((profile) => profile.id === item.sender_id)?.username,
        created_at: item.created_at,
      })),
    ]);
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, []);

  async function read(id: string) {
    await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    void load();
  }

  function icon(kind: string) {
    if (kind === "post_like") return <Heart size={15} strokeWidth={1.5} />;
    if (kind === "post_comment") return <MessageCircle size={15} strokeWidth={1.5} />;
    if (kind === "friend_accepted") return <Check size={15} strokeWidth={1.5} />;
    if (kind === "message") return <MessageSquare size={15} strokeWidth={1.5} />;
    return <UserPlus size={15} strokeWidth={1.5} />;
  }

  function description(kind: string) {
    if (kind === "friend") return "SENT YOU A FRIEND REQUEST";
    if (kind === "post_like") return "LIKED YOUR POST";
    if (kind === "post_comment") return "LEFT A COMMENT ON YOUR POST";
    if (kind === "friend_accepted") return "ACCEPTED YOUR FRIEND REQUEST";
    return "SENT YOU A MESSAGE";
  }

  return (
    <>
      <button
        className="mobile-notification-button"
        data-notification-icon={BYTE_NOTIFICATION_ICON}
        data-notification-image={BYTE_NOTIFICATION_IMAGE}
        onClick={() => setOpen(true)}
        aria-label="Notifications"
        type="button"
      >
        <Bell size={17} strokeWidth={1.25} />
        {items.length > 0 && <span>{items.length > 9 ? "9+" : items.length}</span>}
      </button>

      {open && (
        <section className="mobile-notification-overlay sheet" role="dialog" aria-modal="true" aria-labelledby="notifTitle">
          <header className="sheet-bar">
            <button className="sheet-close" type="button" onClick={() => setOpen(false)} aria-label="Close notifications">
              <X size={19} strokeWidth={1.25} />
            </button>
            <h2 id="notifTitle">NOTIFICATIONS</h2>
            <span className="sheet-spacer" aria-hidden="true" />
          </header>

          <div className="sheet-body">
            <div className="push-banner">
              <PushSetup />
            </div>

            {items.length ? (
              <ul className="notif-list">
                {items.map((item) => (
                  <li className="notif" key={item.id}>
                    <span className="notif-icon" aria-hidden="true">{icon(item.kind)}</span>
                    <Link
                      href={item.kind === "message" ? "/messages/" + item.username : item.kind === "post_like" || item.kind === "post_comment" ? "/" : "/profile/" + item.username}
                      onClick={() => item.kind !== "friend" && void read(item.id)}
                      className="notif-text"
                    >
                      <b>@{item.username || "USER"}</b>
                      <span>{description(item.kind)}</span>
                    </Link>
                    <time className="notif-time" dateTime={item.created_at || undefined}>
                      {timeLabel(item.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mobile-empty">NOTHING NEW.</div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
