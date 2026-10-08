"use client";

import { ReactNode, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileShell } from "@/components/MobileShell";

export function ResponsiveShell({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (mobile) return <MobileShell>{children}</MobileShell>;

  return (
    <div className="desktop-shell">
      <Navbar />
      {children}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-[11px] uppercase tracking-[0.12em] text-muted sm:flex-row sm:justify-between sm:px-8">
          <span>SHB / 2026</span>
          <span>Pricing data may change. Check official sites.</span>
        </div>
      </footer>
    </div>
  );
}
