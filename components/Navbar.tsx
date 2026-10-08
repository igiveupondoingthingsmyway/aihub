"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Heart, Menu, MessageCircle, MessageSquare, Network, Orbit, UserPlus, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FriendNotification = {
  id: string;
  sender_id: string;
  created_at: string;
  sender?: { username: string; avatar_url: string };
};

type Notification = {
  id: string;
  type: "message" | "friend_accepted" | "post_like" | "post_comment";
  sender_id: string;
  message_id: string | null;
  post_id: string | null;
  created_at: string;
  sender?: { username: string; avatar_url: string };
};

const links = [
  { href: "/ai-tools", label: "AI tools" },
  { href: "/network", label: "Network" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [friendNotifications, setFriendNotifications] = useState<FriendNotification[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationCount = friendNotifications.length + notifications.length;

  useEffect(() => {
    const supabase = createClient();
    let channel: any = null;

    async function loadNotifications(userId: string) {
      const { data: friendRows } = await supabase
        .from("friend_requests")
        .select("id,sender_id,created_at")
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!friendRows?.length) {
        setFriendNotifications([]);
      } else {
        const { data: senders } = await supabase
          .from("profiles")
          .select("id,username,avatar_url")
          .in("id", friendRows.map(row => row.sender_id));
        setFriendNotifications(friendRows.map(row => ({
          ...row,
          sender: senders?.find(profile => profile.id === row.sender_id),
        })));
      }

      const { data: rows, error } = await supabase
        .from("notifications")
        .select("id,type,sender_id,message_id,post_id,created_at")
        .eq("user_id", userId)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[SHB notifications]", error);
        setNotifications([]);
        return;
      }

      if (!rows?.length) {
        setNotifications([]);
        return;
      }

      const { data: senders } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .in("id", rows.map(row => row.sender_id));

      setNotifications(rows.map(row => ({
        ...row,
        sender: senders?.find(profile => profile.id === row.sender_id),
      })));
    }

    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setSignedIn(!!user);
      if (!user) return;

      await loadNotifications(user.id);

      channel = supabase
        .channel("navbar-notifications")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: "receiver_id=eq." + user.id,
        }, () => loadNotifications(user.id))
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + user.id,
        }, () => loadNotifications(user.id))
        .subscribe();
    }

    void load();

    const poll = window.setInterval(async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) await loadNotifications(authData.user.id);
    }, 5000);

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      if (session?.user) void loadNotifications(session.user.id);
      else {
        setFriendNotifications([]);
        setNotifications([]);
      }
    });

    return () => {
      data.subscription.unsubscribe();
      window.clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications(items => items.filter(item => item.id !== id));
  }

  function notificationText(notification: Notification) {
    switch (notification.type) {
      case "post_like":
        return "Liked your post";
      case "post_comment":
        return "Commented on your post";
      case "friend_accepted":
        return "Accepted your friend request";
      default:
        return "Sent you a message";
    }
  }

  function notificationIcon(type: Notification["type"]) {
    if (type === "post_like") return <Heart size={13} strokeWidth={1.25} />;
    if (type === "post_comment") return <MessageCircle size={13} strokeWidth={1.25} />;
    if (type === "friend_accepted") return <Check size={13} strokeWidth={1.4} />;
    return <MessageSquare size={13} strokeWidth={1.25} />;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="/" className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.08em]">
          <span className="flex h-7 w-7 items-center justify-center border border-line"><Orbit size={14} strokeWidth={1.5} /></span>
          SHB
        </a>

        <nav className="hidden items-center gap-7 text-[11px] uppercase tracking-[0.1em] text-muted md:flex">
          {links.map(link => <a key={link.href} href={link.href} className="transition-colors hover:text-fg">{link.label}</a>)}

          {signedIn && (
            <>
              <a href="/messages" className="flex items-center gap-2 text-fg transition-colors hover:text-muted">
                <MessageSquare size={13} /> Messages
              </a>

              <div className="relative">
                <button
                  onClick={() => setNotificationOpen(value => !value)}
                  aria-label="Notifications"
                  aria-expanded={notificationOpen}
                  className="relative flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-fg"
                >
                  <Bell size={15} strokeWidth={1.25} />
                  {notificationCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-fg px-1 text-[7px] font-medium text-bg">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-11 w-80 border border-line bg-bg shadow-2xl">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <span className="text-[9px] uppercase tracking-[0.16em]">Notifications</span>
                      <span className="text-[9px] uppercase tracking-[0.1em] text-muted">{notificationCount} new</span>
                    </div>

                    {notificationCount === 0 ? (
                      <div className="px-4 py-8 text-center text-[9px] uppercase tracking-[0.1em] text-muted">
                        Nothing new.
                      </div>
                    ) : (
                      <div className="max-h-[70vh] overflow-y-auto">
                        {friendNotifications.slice(0, 6).map(notification => (
                          <a
                            key={"friend-" + notification.id}
                            href={"/profile/" + notification.sender?.username}
                            onClick={() => setNotificationOpen(false)}
                            className="flex gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-fg hover:text-bg"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line">
                              {notification.sender?.avatar_url
                                ? <img src={notification.sender.avatar_url} alt="" className="h-full w-full object-cover" />
                                : <UserPlus size={13} strokeWidth={1.25} />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.06em]">@{notification.sender?.username || "user"}</p>
                              <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-muted">Sent you a friend request</p>
                            </div>
                          </a>
                        ))}

                        {notifications.map(notification => {
                          const username = notification.sender?.username || "user";
                          const target = notification.type === "message"
                            ? "/messages/" + username
                            : notification.type === "post_like" || notification.type === "post_comment"
                              ? "/"
                              : "/profile/" + username;

                          return (
                            <a
                              key={notification.id}
                              href={target}
                              onClick={() => {
                                setNotificationOpen(false);
                                void markRead(notification.id);
                              }}
                              className="flex gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-fg hover:text-bg"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line">
                                {notification.sender?.avatar_url
                                  ? <img src={notification.sender.avatar_url} alt="" className="h-full w-full object-cover" />
                                  : notificationIcon(notification.type)}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] uppercase tracking-[0.06em]">@{username}</p>
                                  <span className="text-muted">{notificationIcon(notification.type)}</span>
                                </div>
                                <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-muted">{notificationText(notification)}</p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    <a
                      href="/messages"
                      onClick={() => setNotificationOpen(false)}
                      className="flex items-center justify-center gap-2 border-t border-line px-4 py-3 text-[9px] uppercase tracking-[0.12em] transition-colors hover:bg-fg hover:text-bg"
                    >
                      <MessageSquare size={12}/> Open messages
                    </a>
                  </div>
                )}
              </div>

              <a href="/profile" className="flex items-center gap-2 border border-line px-4 py-2 text-fg transition-colors hover:bg-fg hover:text-bg">
                <UserRound size={13} /> Profile
              </a>
            </>
          )}

          {!signedIn && <a href="/profile" className="flex items-center gap-2 border border-line px-4 py-2 text-fg transition-colors hover:bg-fg hover:text-bg"><UserRound size={13}/>Account</a>}
        </nav>

        <button className="p-2 text-muted hover:text-fg md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(value => !value)}>
          {open ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line px-5 py-4 md:hidden">
          {links.map(link => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="block py-3 text-xs uppercase tracking-[0.1em] text-muted hover:text-fg">{link.label}</a>)}
          {signedIn && (
            <>
              <a href="/network" onClick={() => setOpen(false)} className="flex items-center gap-2 py-3 text-xs uppercase tracking-[0.1em] text-muted hover:text-fg"><Network size={13}/>Network</a>
              <a href="/messages" onClick={() => setOpen(false)} className="flex items-center gap-2 py-3 text-xs uppercase tracking-[0.1em] text-muted hover:text-fg"><MessageSquare size={13}/>Messages</a>
              <a href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 border border-line py-3 text-xs uppercase tracking-[0.1em] text-fg"><UserRound size={13}/>Profile</a>
            </>
          )}
          {!signedIn && <a href="/profile" onClick={() => setOpen(false)} className="mt-2 flex items-center justify-center gap-2 border border-line py-3 text-xs uppercase tracking-[0.1em] text-fg"><UserRound size={13}/>Account</a>}
        </nav>
      )}
    </header>
  );
}
