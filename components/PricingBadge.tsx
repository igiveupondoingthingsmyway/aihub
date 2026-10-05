import type { Pricing } from "@/lib/types";

const styles: Record<Pricing, string> = {
  Free: "text-emerald-300 border-emerald-300/20 bg-emerald-300/5",
  Freemium: "text-accent border-accent/20 bg-accent/5",
  Paid: "text-amber-200 border-amber-200/20 bg-amber-200/5",
};

export function PricingBadge({ pricing }: { pricing: Pricing }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[pricing]}`}>
      {pricing}
    </span>
  );
}
