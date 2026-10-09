import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SHB", template: "%s" },
  description: "SHB is a social hub for discovering people, conversations and useful AI tools.",
  icons: {
    icon: "/byte-icon-512.png.png",
    shortcut: "/byte-icon-512.png.png",
    apple: "/byte-icon-512.png.png",
  },
  appleWebApp: { capable: true, title: "SHB", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plexMono.variable}>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[500px]" style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(255,255,255,0.045), transparent)" }} />
        <ResponsiveShell>{children}</ResponsiveShell>
      </body>
    </html>
  );
}
