import { Award, Gem, Medal, Trophy } from "lucide-react";

export type Tier = "bronze" | "prata" | "ouro" | "diamante";

export const TIER_META: Record<
  Tier,
  { label: string; color: string; icon: typeof Award; range: string }
> = {
  bronze: { label: "Bronze", color: "bg-bronze", range: "R$ 7.000,01 - R$ 10.000", icon: Medal },
  prata: { label: "Prata", color: "bg-prata", range: "R$ 4.500,01 - R$ 7.000", icon: Award },
  ouro: { label: "Ouro", color: "bg-ouro", range: "R$ 2.000,01 - R$ 4.500", icon: Trophy },
  diamante: { label: "Diamante", color: "bg-diamante", range: "R$ 2.000", icon: Gem },
};

export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" | "lg" }) {
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  const sizing =
    size === "lg" ? "px-4 py-2 text-base" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium text-foreground ${meta.color} ${sizing}`}
    >
      <Icon className="h-4 w-4" />
      {meta.label}
    </span>
  );
}
