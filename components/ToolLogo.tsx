import type { AITool } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ToolLogo({
  tool,
  size = "md",
}: {
  tool: Pick<AITool, "name" | "color" | "url">;
  size?: "md" | "lg";
}) {
  const domain = new URL(tool.url).hostname.replace(/^www\./, "");

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border bg-white/5",
        size === "lg" ? "h-16 w-16 rounded-2xl" : "h-11 w-11 rounded-xl"
      )}
      style={{ borderColor: `${tool.color}30` }}
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
        alt=""
        width={size === "lg" ? 40 : 28}
        height={size === "lg" ? 40 : 28}
        className="h-auto w-auto rounded-lg"
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const fallback = event.currentTarget.nextElementSibling;
          if (fallback) fallback.classList.remove("hidden");
        }}
      />
      <span
        className={cn(
          "hidden font-sans font-semibold",
          size === "lg" ? "text-2xl" : "text-lg"
        )}
        style={{ color: tool.color }}
      >
        {tool.name[0]}
      </span>
    </div>
  );
}
