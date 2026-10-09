"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { MobileShell } from "@/components/MobileShell";
import { PushAutoRestore } from "@/components/PushAutoRestore";

export function ResponsiveShell({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const segment = pathname.split("/").filter(Boolean).pop();
    const section = segment ? segment.replace(/-/g, " ").toLowerCase() : "";
    const title = section ? `SHB | ${section}` : "SHB";

    const applyTitle = () => {
      if (document.title !== title) document.title = title;
    };

    applyTitle();

    // Next.js may re-apply route metadata after hydration/navigation.
    // Keep the section title in place if that happens.
    const observer = new MutationObserver(applyTitle);
    observer.observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <>
      <PushAutoRestore />
      {mobile ? (
        <MobileShell>{children}</MobileShell>
      ) : (
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
      )}
    </>
  );
}
