"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Menu, MessageSquare, Orbit, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  sender_id: string;
  created_at: string;
  sender?: { username: string; avatar_url: string };
};

const links = [
  { href: "/#categories", label: "Discover" },
  { href: "/ai-tools", label: "AI tools" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let channel: any = null;

    async function loadNotifications(userId: string) {
      const { data: rows } = await supabase
        .from("friend_requests")
        .select("id,sender_id,created_at")
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!rows?.length) {
        setNotifications([]);
        return;
      }

      const { data: senders } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .in("id", rows.map((row) => row.sender_id));

      setNotifications(
        rows.map((row) => ({
          ...row,
          sender: senders?.find((profile) => profile.id === row.sender_id),
        }))
      );
    }

    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setSignedIn(!!user);

      if (!user) return;

      await loadNotifications(user.id);

      channel = supabase
        .channel("navbar-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friend_requests",
            filter: "receiver_id=eq." + user.id,
          },
          () => loadNotifications(user.id)
        )
        .subscribe();
    }

    load();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      if (session?.user) {
        loadNotifications(session.user.id);
      } else {
        setNotifications([]);
      }
    });

    return () => {
      data.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.08em]"
        >
          <span className="flex h-7 w-7 items-center justify-center border border-line">
            <Orbit size={14} strokeWidth={1.5} />
          </span>
          SHB
        </Link>

        <nav className="hidden items-center gap-7 text-[11px] uppercase tracking-[0.1em] text-muted md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-fg"
            >
              {link.label}
            </Link>
          ))}

          {signedIn && (
            <>
              <div className="relative">
                <button
                  onClick={() => setNotificationOpen((value) => !value)}
                  aria-label="Notifications"
                  aria-expanded={notificationOpen}
                  className="relative flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-fg"
                >
                  <Bell size={15} strokeWidth={1.25} />
                  {notifications.length > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-fg px-1 text-[7px] font-medium text-bg">
                      {notifications.length > 9 ? "9+" : notifications.length}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-11 w-80 border border-line bg-bg shadow-2xl">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <span className="text-[9px] uppercase tracking-[0.16em]">
                        Notifications
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.1em] text-muted">
                        {notifications.length}
                      </span>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[9px] uppercase tracking-[0.1em] text-muted">
                        Nothing new.
                      </div>
                    ) : (
                      <div>
                        {notifications.slice(0, 6).map((notification) => (
                          <Link
                            key={notification.id}
                            href={"/profile/" + notification.sender?.username}
                            onClick={() => setNotificationOpen(false)}
                            className="flex gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-fg hover:text-bg"
                          >
                            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-line">
                              {notification.sender?.avatar_url ? (
                                <img
                                  src={notification.sender.avatar_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[8px] uppercase">
                                  {notification.sender?.username?.slice(0, 1) || "?"}
                                </span>
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.06em]">
                                @{notification.sender?.username || "user"}
                              </p>
                              <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-muted group-hover:text-bg">
                                Sent you a friend request
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    <Link
                      href="/messages"
                      onClick={() => setNotificationOpen(false)}
                      className="flex items-center justify-center gap-2 border-t border-line px-4 py-3 text-[9px] uppercase tracking-[0.12em] transition-colors hover:bg-fg hover:text-bg"
                    >
                      <MessageSquare size={12} />
                      Open network
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/messages"
                className="flex items-center gap-2 text-fg transition-colors hover:text-muted"
              >
                <MessageSquare size={13} />
                Messages
              </Link>
            </>
          )}

          <Link
            href="/profile"
            className="flex items-center gap-2 border border-line px-4 py-2 text-fg transition-colors hover:bg-fg hover:text-bg"
          >
            <UserRound size={13} />
            {signedIn ? "Profile" : "Account"}
          </Link>
        </nav>

        <button
          className="p-2 text-muted hover:text-fg md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line px-5 py-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-xs uppercase tracking-[0.1em] text-muted hover:text-fg"
            >
              {link.label}
            </Link>
          ))}

          {signedIn && (
            <>
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-3 text-xs uppercase tracking-[0.1em] text-muted hover:text-fg"
              >
                <MessageSquare size={13} />
                Messages
              </Link>
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-3 text-xs uppercase tracking-[0.1em] text-muted hover:text-fg"
              >
                <Bell size={13} />
                Notifications
                {notifications.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full border border-fg px-1 text-[8px]">
                    {notifications.length}
                  </span>
                )}
              </Link>
            </>
          )}

          <Link
            href="/profile"
            className="mt-2 flex items-center justify-center gap-2 border border-line py-3 text-xs uppercase tracking-[0.1em] text-fg"
          >
            <UserRound size={13} />
            {signedIn ? "Profile" : "Account"}
          </Link>
        </nav>
      )}
    </header>
  );
}
