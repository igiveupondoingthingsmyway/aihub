import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SHB: GO IN. GO TIME.", template: "%s | SHB" },
  description: "SHB is a social hub for discovering people, conversations and useful AI tools.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plexMono.variable}>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[500px]" style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(255,255,255,0.045), transparent)" }} />
        <Navbar />
        {children}
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-[11px] uppercase tracking-[0.12em] text-muted sm:flex-row sm:justify-between sm:px-8">
            <span>SHB / 2026</span>
            <span>Pricing data may change. Check official sites.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}