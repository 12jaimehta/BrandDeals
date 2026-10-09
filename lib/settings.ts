import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIES, DEFAULT_AUTOPILOT, type Autopilot, type Guardrails } from "@/lib/agent.mjs";
import { DEFAULT_RULES } from "@/lib/read-deal.mjs";

export type Settings = { rules: Guardrails; autopilot: Autopilot };

export const DEFAULT_SETTINGS: Settings = {
  rules: { ...DEFAULT_RULES, maxUsageDays: null, maxExclusivityDays: null, blockedCategories: [] },
  autopilot: { ...DEFAULT_AUTOPILOT },
};

type RulesRow = {
  usage_included_days?: number | null;
  usage_uplift_per_30_days?: number | null;
  exclusivity_uplift_per_30_days?: number | null;
  minimum_offer?: number | null;
  max_usage_days?: number | null;
  max_exclusivity_days?: number | null;
  blocked_categories?: string[] | null;
  autopilot?: Partial<Autopilot> | null;
};

const known = new Set(CATEGORIES.map((category) => category.id));

function wholeNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

function optionalNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

export function cleanSettings(input: unknown): Settings {
  const raw = (input && typeof input === "object" ? input : {}) as { rules?: Record<string, unknown>; autopilot?: Record<string, unknown> };
  const rules = raw.rules ?? {};
  const pilot = raw.autopilot ?? {};
  const base = DEFAULT_SETTINGS;
  return {
    rules: {
      usageIncludedDays: wholeNumber(rules.usageIncludedDays, base.rules.usageIncludedDays),
      usageUpliftPer30Days: wholeNumber(rules.usageUpliftPer30Days, base.rules.usageUpliftPer30Days),
      exclusivityUpliftPer30Days: wholeNumber(rules.exclusivityUpliftPer30Days, base.rules.exclusivityUpliftPer30Days),
      minimumOffer: wholeNumber(rules.minimumOffer, base.rules.minimumOffer),
      maxUsageDays: optionalNumber(rules.maxUsageDays),
      maxExclusivityDays: optionalNumber(rules.maxExclusivityDays),
      blockedCategories: Array.isArray(rules.blockedCategories)
        ? [...new Set(rules.blockedCategories.filter((id): id is string => typeof id === "string" && known.has(id)))]
        : [],
    },
    autopilot: Object.fromEntries(
      Object.keys(DEFAULT_AUTOPILOT).map((key) => [key, typeof pilot[key] === "boolean" ? pilot[key] : DEFAULT_AUTOPILOT[key as keyof Autopilot]]),
    ) as Autopilot,
  };
}

function fromRow(row: RulesRow | null): Settings {
  if (!row) return DEFAULT_SETTINGS;
  return cleanSettings({
    rules: {
      usageIncludedDays: row.usage_included_days,
      usageUpliftPer30Days: row.usage_uplift_per_30_days,
      exclusivityUpliftPer30Days: row.exclusivity_uplift_per_30_days,
      minimumOffer: row.minimum_offer,
      maxUsageDays: row.max_usage_days,
      maxExclusivityDays: row.max_exclusivity_days,
      blockedCategories: row.blocked_categories ?? [],
    },
    autopilot: row.autopilot ?? {},
  });
}

export async function loadSettings(client: SupabaseClient, userId: string): Promise<Settings> {
  const { data, error } = await client.from("rate_rules").select("*").eq("user_id", userId).maybeSingle();
  if (error) return DEFAULT_SETTINGS;
  return fromRow(data as RulesRow | null);
}

export async function saveSettings(client: SupabaseClient, userId: string, settings: Settings) {
  const { error } = await client.from("rate_rules").upsert({
    user_id: userId,
    usage_included_days: settings.rules.usageIncludedDays,
    usage_uplift_per_30_days: settings.rules.usageUpliftPer30Days,
    exclusivity_uplift_per_30_days: settings.rules.exclusivityUpliftPer30Days,
    minimum_offer: settings.rules.minimumOffer,
    max_usage_days: settings.rules.maxUsageDays,
    max_exclusivity_days: settings.rules.maxExclusivityDays,
    blocked_categories: settings.rules.blockedCategories,
    autopilot: settings.autopilot,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(/column|schema cache/i.test(error.message)
      ? "Run supabase/migrations/0004_deal_desk.sql in the Supabase SQL editor first."
      : "Your settings were not saved.");
  }
}
