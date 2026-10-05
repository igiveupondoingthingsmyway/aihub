import type { AITool } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ToolLogo({ tool, size = "md" }: { tool: Pick<AITool, "name" | "color">; size?: "md" | "lg" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border font-display",
        size === "lg" ? "h-16 w-16 rounded-2xl text-3xl" : "h-11 w-11 rounded-xl text-xl"
      )}
      style={{ color: tool.color, backgroundColor: `${tool.color}14`, borderColor: `${tool.color}30` }}
    >
      {tool.name[0]}
    </div>
  );
}
