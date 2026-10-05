"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { categories } from "@/data/categories";
import { tools } from "@/data/tools";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ToolCard } from "./ToolCard";

export function Directory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || category !== "All";

  const results = useMemo(
    () =>
      tools.filter(
        (t) =>
          (category === "All" || t.categories.includes(category)) &&
          (q === "" || [t.name, t.company, t.description, ...t.categories].some((s) => s.toLowerCase().includes(q)))
      ),
    [q, category]
  );

  const chip = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-200",
      active ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-white/30 hover:text-fg"
    );

  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 sm:px-8">
      <div className="relative">
        <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools, companies or use cases"
          aria-label="Search AI tools"
          className="h-16 w-full rounded-2xl border border-line bg-surface pl-14 pr-12 text-base text-fg placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none sm:text-lg"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:text-fg">
            <X size={18} />
          </button>
        )}
      </div>

      <div id="categories" className="no-scrollbar -mx-5 mt-6 flex scroll-mt-24 gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        <button onClick={() => setCategory("All")} className={chip(category === "All")}>All</button>
        {categories.map(({ name, icon: Icon }) => (
          <button key={name} onClick={() => setCategory(name)} className={chip(category === name)}>
            <Icon size={15} />
            {name}
          </button>
        ))}
      </div>

      {!filtering && (
        <section className="mt-20">
          <h2 className="text-xl font-medium tracking-tight">Featured</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {tools.filter((t) => t.featured).map((t) => (
              <ToolCard key={t.slug} tool={t} featured />
            ))}
          </div>
        </section>
      )}

      <section id="tools" className="mt-20 scroll-mt-24">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-medium tracking-tight">
            {filtering ? (category === "All" ? "Results" : category) : "All tools"}
          </h2>
          <span className="text-sm text-muted">{results.length} {results.length === 1 ? "tool" : "tools"}</span>
        </div>

        {results.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((t) => <ToolCard key={t.slug} tool={t} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
            <p className="text-fg">No tools match your search.</p>
            <p className="mt-1 text-sm text-muted">Try a different keyword or clear the filters.</p>
            <button
              onClick={() => { setQuery(""); setCategory("All"); }}
              className="mt-6 rounded-full border border-line px-4 py-2 text-sm hover:border-fg"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
