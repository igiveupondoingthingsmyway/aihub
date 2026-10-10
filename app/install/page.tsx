"use client";

import Link from "next/link";
import { ArrowUpFromLine, Check, Download, Smartphone } from "lucide-react";

export default function InstallPage() {
  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-xl flex-col justify-center px-5 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white">
          {/* Reuse the SHB app icon already in the project. */}
          <img src="/byte-icon-512.png.png" alt="SHB" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">SHB / iOS</p>
          <h1 className="text-2xl font-semibold tracking-tight">Get SHB on your iPhone</h1>
        </div>
      </div>

      <p className="mb-8 max-w-md text-sm leading-6 text-white/65">
        Add SHB to your Home Screen to open it like an app, without the browser address bar.
        You can share this page with friends so they can install it too.
      </p>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-5 flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-white/80" />
          <h2 className="text-base font-medium">Install on iPhone</h2>
        </div>
        <ol className="space-y-5">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm">1</span>
            <div>
              <p className="font-medium">Open this page in Safari</p>
              <p className="mt-1 text-sm leading-5 text-white/55">Use Safari on your iPhone, not an in-app browser.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm">2</span>
            <div>
              <p className="font-medium flex items-center gap-2">Tap Share <ArrowUpFromLine className="h-4 w-4" /></p>
              <p className="mt-1 text-sm leading-5 text-white/55">The Share icon is in Safari’s toolbar.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm">3</span>
            <div>
              <p className="font-medium">Choose “Add to Home Screen”</p>
              <p className="mt-1 text-sm leading-5 text-white/55">If offered, enable “Open as Web App”, then tap Add.</p>
            </div>
          </li>
        </ol>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 p-4 text-sm leading-5 text-white/60">
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Push notifications on iPhone require iOS 16.4 or later and SHB must be added to the Home Screen first. Notifications are enabled separately inside SHB.</p>
      </div>

      <Link href="/login" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
        <Download className="h-4 w-4" />
        Open SHB
      </Link>
      <p className="mt-5 text-center text-xs text-white/35">No App Store download required.</p>
    </main>
  );
}
