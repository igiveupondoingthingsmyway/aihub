"use client";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { categories } from "@/data/categories";
import { tools } from "@/data/tools";
import type { AITool, Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ToolCard } from "./ToolCard";

export function Directory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [results, setResults] = useState<AITool[]>(tools);
  const q = query.trim().toLowerCase();
  const filtering = q !== "" || category !== "All";

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q, category });
    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.results) setResults(data.results); })
      .catch(() => {});
    return () => controller.abort();
  }, [q, category]);

  const chip = (active: boolean) => cn("flex shrink-0 items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.08em] transition-colors", active ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-white/50 hover:text-fg");

  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 sm:px-8">
      <div className="border-y border-line py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SEARCH TOOLS, COMPANIES, USE CASES" aria-label="Search AI tools" className="h-12 w-full bg-transparent pl-7 pr-10 text-xs uppercase tracking-[0.08em] text-fg placeholder:text-muted focus:outline-none" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-fg"><X size={16} /></button>}
        </div>
      </div>
      <div id="categories" className="no-scrollbar -mx-5 mt-5 flex scroll-mt-24 gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        <button onClick={() => setCategory("All")} className={chip(category === "All")}>All</button>
        {categories.map(({ name, icon: Icon }) => <button key={name} onClick={() => setCategory(name)} className={chip(category === name)}><Icon size={13} strokeWidth={1.5} />{name}</button>)}
      </div>
      {!filtering && <section className="mt-20">
        <div className="flex items-end justify-between border-b border-line pb-3"><h2 className="text-xs font-medium uppercase tracking-[0.16em]">Featured</h2><span className="text-[10px] uppercase tracking-[0.12em] text-muted">Selected tools</span></div>
        <div className="mt-0 grid gap-px border-b border-line bg-line md:grid-cols-3">{tools.filter((t) => t.featured).map((t) => <ToolCard key={t.slug} tool={t} featured />)}</div>
      </section>}
      <section id="tools" className="mt-20 scroll-mt-24">
        <div className="flex items-baseline justify-between border-b border-line pb-3"><h2 className="text-xs font-medium uppercase tracking-[0.16em]">{filtering ? (category === "All" ? "Results" : category) : "All tools"}</h2><span className="text-[10px] uppercase tracking-[0.12em] text-muted">{results.length} {results.length === 1 ? "tool" : "tools"}</span></div>
        {results.length > 0 ? <div className="mt-0 grid gap-px border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-3">{results.map((t) => <ToolCard key={t.slug} tool={t} />)}</div> : <div className="mt-px border border-dashed border-line px-6 py-16 text-center"><p className="text-sm text-fg">No tools match your search.</p><p className="mt-2 text-xs text-muted">Try another keyword or clear the filters.</p><button onClick={() => { setQuery(""); setCategory("All"); }} className="mt-6 border border-line px-4 py-2 text-[10px] uppercase tracking-[0.1em] hover:bg-fg hover:text-bg">Clear filters</button></div>}
      </section>
    </div>
  );
}
