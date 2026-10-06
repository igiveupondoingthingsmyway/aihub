import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, ExternalLink } from "lucide-react";
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
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8">
      <Link href="/#tools" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-fg"><ArrowLeft size={14} />Back to all tools</Link>
      <section className="mt-10 border-y border-line py-8 sm:py-10">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5"><ToolLogo tool={tool} size="lg" /><div><div className="mb-3 flex flex-wrap gap-2">{tool.categories.slice(0, 2).map((category) => <span key={category} className="border border-line px-2.5 py-1 text-[9px] uppercase tracking-[0.1em] text-muted">{category}</span>)}</div><h1 className="text-4xl font-medium tracking-[-0.05em] sm:text-6xl">{tool.name}</h1><p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted">{tool.company}</p></div></div>
          <a href={tool.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 border border-fg px-5 py-3 text-[10px] uppercase tracking-[0.1em] text-fg transition-colors hover:bg-fg hover:text-bg">Visit {tool.name}<ArrowUpRight size={14} /></a>
        </div>
      </section>
      <div className="mt-8 grid gap-px border border-line bg-line lg:grid-cols-[1fr_340px]">
        <div className="bg-bg">
          <section className="border-b border-line p-6 sm:p-8"><p className="max-w-3xl text-base leading-7 text-fg/90 sm:text-lg">{tool.description}</p></section>
          <section className="p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4 border-b border-line pb-3"><div><p className="text-[9px] uppercase tracking-[0.16em] text-muted">What it does</p><h2 className="mt-2 text-xl font-medium tracking-tight">Main features</h2></div><span className="text-[9px] uppercase tracking-[0.12em] text-muted">{tool.features.length} features</span></div>
            <ul className="mt-0 grid gap-px border-b border-line bg-line sm:grid-cols-2">{tool.features.map((feature) => <li key={feature} className="flex gap-3 bg-surface p-5 text-xs leading-6 transition-colors hover:bg-raised"><Check size={14} className="mt-1 shrink-0 text-fg" /><span>{feature}</span></li>)}</ul>
          </section>
        </div>
        <aside className="h-fit bg-surface p-6 lg:sticky lg:top-16">
          <section><div className="flex items-center justify-between border-b border-line pb-3"><h2 className="text-xs uppercase tracking-[0.14em]">Pricing</h2><PricingBadge pricing={tool.pricing} /></div>
            <dl className="divide-y divide-line text-xs">{tool.plans.map((plan) => <div key={plan.name} className="flex justify-between gap-4 py-4"><dt className="text-muted">{plan.name}</dt><dd className="text-right text-fg">{plan.price}</dd></div>)}</dl>
            <a href={tool.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 border border-line px-5 py-3 text-[10px] uppercase tracking-[0.1em] text-fg transition-colors hover:bg-fg hover:text-bg">Official website<ExternalLink size={14} /></a>
            <p className="mt-4 text-[9px] leading-5 text-muted">Prices are placeholder data. Check the official website for current plans and pricing.</p>
          </section>
          <section className="mt-8 border-t border-line pt-6"><p className="text-[9px] uppercase tracking-[0.16em] text-muted">Categories</p><div className="mt-4 flex flex-wrap gap-2">{tool.categories.map((category) => <span key={category} className="border border-line px-2.5 py-1.5 text-[9px] uppercase tracking-[0.1em] text-muted">{category}</span>)}</div></section>
        </aside>
      </div>
    </main>
  );
}
