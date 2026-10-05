import Link from "next/link";
import type { AITool } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PricingBadge } from "./PricingBadge";
import { ToolLogo } from "./ToolLogo";

export function ToolCard({ tool, featured = false }: { tool: AITool; featured?: boolean }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={cn(
        "group flex flex-col rounded-2xl border border-line transition-colors duration-200 hover:border-white/25 hover:bg-raised",
        featured ? "bg-surface p-7" : "bg-surface/60 p-6"
      )}
    >
      <div className="flex items-start justify-between">
        <ToolLogo tool={tool} size={featured ? "lg" : "md"} />
        <PricingBadge pricing={tool.pricing} />
      </div>
      <div className="mt-5">
        <h3 className="text-lg font-medium text-fg">{tool.name}</h3>
        <p className="text-sm text-muted">{tool.company}</p>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{tool.description}</p>
      <div className="mt-auto flex items-center justify-between pt-6">
        <span className="text-sm text-muted">{tool.categories[0]}</span>
        <span className="rounded-full border border-line px-4 py-1.5 text-sm text-fg transition-colors duration-200 group-hover:border-fg group-hover:bg-fg group-hover:text-bg">
          Open
        </span>
      </div>
    </Link>
  );
}
