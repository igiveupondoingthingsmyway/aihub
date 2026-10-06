import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AI Hub: GO IN. GO TIME.", template: "%s | AI Hub" },
  description: "AI Hub is a directory for discovering AI tools across chat, image, video, coding, writing, research, audio and productivity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[500px]" style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(255,255,255,0.045), transparent)" }} />
        <Navbar />
        {children}
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-[11px] uppercase tracking-[0.12em] text-muted sm:flex-row sm:justify-between sm:px-8">
            <span>AI Hub / 2026</span>
            <span>Pricing data may change. Check official sites.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
