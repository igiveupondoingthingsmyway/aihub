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
      <Link
        href="/#tools"
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-white/30 hover:text-fg"
      >
        <ArrowLeft size={15} />
        Back to all tools
      </Link>

      <section className="mt-10 overflow-hidden rounded-3xl border border-line bg-surface p-7 sm:p-10">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <ToolLogo tool={tool} size="lg" />
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {tool.categories.slice(0, 2).map((category) => (
                  <span key={category} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                    {category}
                  </span>
                ))}
              </div>
              <h1 className="font-sans text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                {tool.name}
              </h1>
              <p className="mt-1 text-muted">by {tool.company}</p>
            </div>
          </div>

          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-fg px-5 py-3 font-medium text-bg transition-transform hover:scale-[1.02]"
          >
            Visit {tool.name}
            <ArrowUpRight size={17} />
          </a>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section className="rounded-2xl border border-line bg-surface/60 p-6 sm:p-8">
            <p className="text-xl leading-relaxed text-fg/90 sm:text-2xl">
              {tool.description}
            </p>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">What it does</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Main features</h2>
              </div>
              <span className="text-sm text-muted">{tool.features.length} features</span>
            </div>

            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {tool.features.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-3 rounded-2xl border border-line bg-surface/60 p-5 text-sm leading-relaxed transition-colors hover:border-white/20 hover:bg-raised"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <Check size={14} className="text-accent" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Pricing</h2>
              <PricingBadge pricing={tool.pricing} />
            </div>

            <dl className="mt-5 divide-y divide-line text-sm">
              {tool.plans.map((plan) => (
                <div key={plan.name} className="flex justify-between gap-4 py-3">
                  <dt className="text-muted">{plan.name}</dt>
                  <dd className="text-right font-medium text-fg">{plan.price}</dd>
                </div>
              ))}
            </dl>

            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-medium text-fg transition-colors hover:border-white/30 hover:bg-raised"
            >
              Official website
              <ExternalLink size={15} />
            </a>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              Prices are placeholder data. Check the official website for current plans and pricing.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface/60 p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Categories</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tool.categories.map((category) => (
                <span key={category} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">
                  {category}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
