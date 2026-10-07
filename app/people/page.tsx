"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Search, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string;
  bio: string;
  avatar_url: string;
  last_seen: string;
};

export default function PeoplePage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUser({ id: user.id });
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!user || !query.trim()) {
      setPeople([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await createClient()
        .from("profiles")
        .select("id,username,bio,avatar_url,last_seen")
        .ilike("username", "%" + query.trim().toLowerCase() + "%")
        .neq("id", user.id)
        .limit(20);

      setPeople(data ?? []);
    }, 180);

    return () => clearTimeout(timer);
  }, [query, user]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-24 text-xs uppercase tracking-[0.12em] text-muted sm:px-8">
        Loading...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="flex items-center justify-between border-y border-line py-3 text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>Social / People</span>
        <span className="flex items-center gap-2">
          <Users size={13} />
          Find people
        </span>
      </div>

      <section className="mt-16 max-w-4xl">
        <div className="mb-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted">
          <span className="h-px w-8 bg-line" />
          People
        </div>

        <h1 className="text-6xl tracking-[-0.07em] sm:text-8xl lg:text-[9rem]">
          FIND<br />
          <span className="text-muted">PEOPLE</span>
        </h1>

        <div className="relative mt-12 border-y border-line">
          <Search className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH USERNAME"
            aria-label="Search people by username"
            className="h-16 w-full bg-transparent pl-9 pr-4 text-sm uppercase tracking-[0.08em] text-fg placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="mt-8 border-t border-line">
          {!query.trim() ? (
            <div className="flex min-h-40 items-center justify-center border-b border-line text-center text-[10px] uppercase tracking-[0.12em] text-muted">
              Search for a username
            </div>
          ) : people.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center border-b border-line text-center text-[10px] uppercase tracking-[0.12em] text-muted">
              No people found
            </div>
          ) : (
            people.map((person) => (
              <div key={person.id} className="group flex items-center gap-5 border-b border-line py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line text-xs uppercase">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    person.username.slice(0, 1)
                  )}
                </div>

                <Link href={"/profile/" + person.username} className="min-w-0 flex-1">
                  <p className="text-sm">@{person.username}</p>
                  <p className="mt-1 truncate text-[10px] text-muted">
                    {person.bio || "SHB member"}
                  </p>
                </Link>

                <Link
                  href={"/messages/" + person.username}
                  aria-label={"Message @" + person.username}
                  className="hidden items-center gap-2 border border-line px-3 py-2 text-[9px] uppercase tracking-[0.1em] hover:bg-fg hover:text-bg sm:flex"
                >
                  Message
                </Link>

                <Link
                  href={"/profile/" + person.username}
                  className="flex items-center gap-2 text-muted transition-colors hover:text-fg"
                >
                  <UserPlus size={15} strokeWidth={1.25} />
                  <span className="hidden text-[9px] uppercase tracking-[0.1em] sm:inline">Profile</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
