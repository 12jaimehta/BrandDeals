import type { SupabaseClient } from "@supabase/supabase-js";

export type CreatorProfile = {
  handle: string;
  displayName: string;
  bio: string;
  niches: string[];
  startingPrice: number | null;
  accepting: boolean;
  legalName: string;
  gstin: string;
  pan: string;
  upiId: string;
  address: string;
};

export const EMPTY_PROFILE: CreatorProfile = {
  handle: "",
  displayName: "",
  bio: "",
  niches: [],
  startingPrice: null,
  accepting: true,
  legalName: "",
  gstin: "",
  pan: "",
  upiId: "",
  address: "",
};

type ProfileRow = {
  handle: string;
  display_name: string | null;
  bio: string | null;
  niches: string[] | null;
  starting_price: number | null;
  accepting: boolean | null;
  legal_name: string | null;
  gstin: string | null;
  pan: string | null;
  upi_id: string | null;
  address: string | null;
};

export function normalizeHandle(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_.]/g, "");
}

export function validHandle(handle: string) {
  return /^[a-z0-9_.]{3,30}$/.test(handle);
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function cleanProfile(input: unknown): CreatorProfile {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const price = Number(raw.startingPrice);
  return {
    handle: normalizeHandle(text(raw.handle, 40)),
    displayName: text(raw.displayName, 80),
    bio: text(raw.bio, 400),
    niches: Array.isArray(raw.niches)
      ? raw.niches.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 30)).filter(Boolean).slice(0, 6)
      : [],
    startingPrice: raw.startingPrice == null || raw.startingPrice === "" || !Number.isFinite(price) || price < 0 ? null : Math.round(price),
    accepting: raw.accepting !== false,
    legalName: text(raw.legalName, 120),
    gstin: text(raw.gstin, 20).toUpperCase(),
    pan: text(raw.pan, 12).toUpperCase(),
    upiId: text(raw.upiId, 80),
    address: text(raw.address, 300),
  };
}

function fromRow(row: ProfileRow): CreatorProfile {
  return {
    handle: row.handle,
    displayName: row.display_name ?? "",
    bio: row.bio ?? "",
    niches: row.niches ?? [],
    startingPrice: row.starting_price,
    accepting: row.accepting !== false,
    legalName: row.legal_name ?? "",
    gstin: row.gstin ?? "",
    pan: row.pan ?? "",
    upiId: row.upi_id ?? "",
    address: row.address ?? "",
  };
}

export async function loadProfile(client: SupabaseClient, userId: string): Promise<CreatorProfile | null> {
  const { data, error } = await client.from("creator_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as ProfileRow);
}

export async function loadProfileByHandle(client: SupabaseClient, handle: string): Promise<(CreatorProfile & { userId: string }) | null> {
  const clean = normalizeHandle(handle);
  if (!validHandle(clean)) return null;
  const { data, error } = await client.from("creator_profiles").select("*").eq("handle", clean).maybeSingle();
  if (error || !data) return null;
  return { ...fromRow(data as ProfileRow), userId: (data as { user_id: string }).user_id };
}

export async function saveProfile(client: SupabaseClient, userId: string, profile: CreatorProfile) {
  if (!validHandle(profile.handle)) throw new Error("Pick a handle of 3 to 30 letters, numbers, dots, or underscores.");
  const { error } = await client.from("creator_profiles").upsert({
    user_id: userId,
    handle: profile.handle,
    display_name: profile.displayName,
    bio: profile.bio,
    niches: profile.niches,
    starting_price: profile.startingPrice,
    accepting: profile.accepting,
    legal_name: profile.legalName,
    gstin: profile.gstin,
    pan: profile.pan,
    upi_id: profile.upiId,
    address: profile.address,
    updated_at: new Date().toISOString(),
  });
  if (error?.code === "23505") throw new Error("That handle is taken. Try another.");
  if (error) {
    throw new Error(/relation|schema cache|could not find/i.test(error.message)
      ? "Run supabase/migrations/0004_deal_desk.sql in the Supabase SQL editor first."
      : "Your profile was not saved.");
  }
}

export function creatorName(profile: CreatorProfile | null, email: string | null) {
  return profile?.displayName || profile?.legalName || (email ? email.split("@")[0] : "");
}
