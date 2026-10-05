"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, Orbit, X } from "lucide-react";

const links = [
  { href: "/#categories", label: "Categories" },
  { href: "/#tools", label: "All tools" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-medium tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-accent">
            <Orbit size={17} />
          </span>
          AI Hub
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-fg">{l.label}</Link>
          ))}
          <Link href="#" className="rounded-full border border-line px-4 py-2 text-fg transition-colors hover:border-fg">
            Submit a tool
          </Link>
        </nav>

        <button
          className="rounded-lg p-2 text-muted hover:text-fg md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line/70 px-5 py-4 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-muted hover:text-fg">
              {l.label}
            </Link>
          ))}
          <Link href="#" className="mt-2 block rounded-full border border-line py-3 text-center text-fg">Submit a tool</Link>
        </nav>
      )}
    </header>
  );
}
