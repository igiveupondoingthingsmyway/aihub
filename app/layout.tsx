import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "AI Hub: Discover the AI world", template: "%s | AI Hub" },
  description: "AI Hub is a directory for discovering AI tools across chat, image, video, coding, writing, research, audio and productivity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px]"
          style={{ background: "radial-gradient(55% 60% at 50% 0%, rgba(169,187,255,0.07), transparent)" }}
        />
        <Navbar />
        {children}
        <footer className="border-t border-line/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-sm text-muted sm:flex-row sm:justify-between sm:px-8">
            <span>AI Hub</span>
            <span>Tool details are placeholder data. Check each official site for current pricing.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
