import { Directory } from "@/components/Directory";

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-36">
        <div className="mb-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted"><span className="h-px w-8 bg-line" />Independent AI directory</div>
        <h1 className="max-w-5xl text-5xl font-medium leading-[0.98] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
          Discover the<br /><span className="text-muted">AI world.</span>
        </h1>
        <div className="mt-9 flex max-w-2xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-xl text-sm leading-7 text-muted sm:text-base">A curated directory of AI tools for chat, images, video, coding, research, audio and more.</p>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] text-muted">Scroll to explore ↓</span>
        </div>
      </section>
      <Directory />
    </main>
  );
}
