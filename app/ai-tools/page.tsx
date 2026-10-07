import { Directory } from "@/components/Directory";

export default function AIToolsPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-24 sm:px-8 sm:pt-36">
        <div className="mb-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted">
          <span className="h-px w-8 bg-line" />
          AI tools
        </div>
        <h1 className="max-w-5xl text-5xl font-normal leading-[0.84] tracking-[-0.075em] sm:text-7xl lg:text-[7.5rem]">
          FIND THE<br />
          <span className="text-muted">RIGHT TOOL</span>
        </h1>
        <p className="mt-9 max-w-xl text-sm leading-7 text-muted sm:text-base">
          Explore AI tools by category, search by use case, and find what fits.
        </p>
      </section>
      <Directory />
    </main>
  );
}
