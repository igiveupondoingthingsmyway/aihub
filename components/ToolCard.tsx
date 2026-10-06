import Link from "next/link";
import type { AITool } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PricingBadge } from "./PricingBadge";
import { ToolLogo } from "./ToolLogo";

export function ToolCard({ tool, featured = false }: { tool: AITool; featured?: boolean }) {
  return (
    <Link href={`/tools/${tool.slug}`} className={cn("group flex min-h-[340px] flex-col bg-surface p-6 transition-colors duration-200 hover:bg-raised", featured ? "min-h-[390px] p-7" : "")}>
      <div className="flex items-start justify-between"><ToolLogo tool={tool} size={featured ? "lg" : "md"} /><PricingBadge pricing={tool.pricing} /></div>
      <div className="mt-auto">
        <div className="mb-2 flex items-baseline justify-between gap-4"><h3 className="text-base font-medium tracking-tight text-fg">{tool.name}</h3><span className="text-[9px] uppercase tracking-[0.12em] text-muted opacity-0 transition-opacity group-hover:opacity-100">View →</span></div>
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{tool.company}</p>
        <p className="mt-4 line-clamp-3 text-xs leading-6 text-muted">{tool.description}</p>
        <div className="mt-6 flex items-center justify-between border-t border-line pt-4"><span className="text-[9px] uppercase tracking-[0.12em] text-muted">{tool.categories[0]}</span><span className="text-[9px] uppercase tracking-[0.12em] text-fg">Open ↗</span></div>
      </div>
    </Link>
  );
}
