import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { PricingBadge } from "@/components/PricingBadge";
import { ToolLogo } from "@/components/ToolLogo";
import { getTool, tools } from "@/data/tools";

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => tools.map((t) => ({ slug: t.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return tool ? { title: tool.name, description: tool.description } : {};
}

export default async function ToolPage({ params }: Props) {
  const tool = getTool((await params).slug);
  if (!tool) notFound();

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-10 sm:px-8">
      <Link href="/#tools" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft size={16} /> All tools
      </Link>

      <header className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
        <ToolLogo tool={tool} size="lg" />
        <div>
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">{tool.name}</h1>
          <p className="mt-1 text-muted">by {tool.company}</p>
        </div>
      </header>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="max-w-2xl text-lg leading-relaxed text-fg/90">{tool.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {tool.categories.map((c) => (
              <span key={c} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted">{c}</span>
            ))}
          </div>

          <h2 className="mt-16 text-xl font-medium tracking-tight">Main features</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {tool.features.map((f) => (
              <li key={f} className="flex gap-3 rounded-xl border border-line bg-surface/60 p-4 text-sm leading-relaxed">
                <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Pricing</h2>
            <PricingBadge pricing={tool.pricing} />
          </div>
          <dl className="mt-5 divide-y divide-line text-sm">
            {tool.plans.map((p) => (
              <div key={p.name} className="flex justify-between gap-4 py-3">
                <dt className="text-muted">{p.name}</dt>
                <dd className="text-right text-fg">{p.price}</dd>
              </div>
            ))}
          </dl>
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-fg px-5 py-3 font-medium text-bg transition-colors hover:bg-white"
          >
            Open official website <ArrowUpRight size={17} />
          </a>
          <p className="mt-4 text-xs leading-relaxed text-muted">Prices are placeholder data and may differ on the official site.</p>
        </aside>
      </div>
    </main>
  );
}
