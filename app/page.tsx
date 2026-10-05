import { Directory } from "@/components/Directory";

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-20 sm:px-8 sm:pb-16 sm:pt-32">
        <h1 className="max-w-4xl font-display text-6xl leading-[0.98] tracking-tight sm:text-8xl">
          Discover the AI world.
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
          AI Hub is a directory for discovering AI tools. Browse by category, compare pricing
          and find the right tool for the job.
        </p>
      </section>
      <Directory />
    </main>
  );
}
