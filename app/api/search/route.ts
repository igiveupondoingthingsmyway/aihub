import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { tools } from "@/data/tools";
import type { Category } from "@/lib/types";

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);

const getResults = unstable_cache(
  async (q: string, category: string) => {
    return tools.filter(
      (t) =>
        (category === "All" || t.categories.includes(category as Category)) &&
        (q === "" ||
          [t.name, t.company, t.description, ...t.categories].some((s) =>
            s.toLowerCase().includes(q)
          ))
    );
  },
  ["ai-hub-search"],
  { revalidate: 3600 }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = normalize(searchParams.get("q") ?? "");
  const category = searchParams.get("category") ?? "All";
  const results = await getResults(q, category);

  return NextResponse.json(
    { results, cachedFor: "1h" },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
