import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { secretKey } from "@/lib/config";
import { briefExtraction, briefText, cleanBrief } from "@/lib/brief";
import { loadProfileByHandle } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const PER_NETWORK = 6;
const PER_CREATOR = 40;

const hashed = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);

// Counted in Supabase so the limit holds across every server instance.
async function allowed(admin: SupabaseClient, key: string, limit: number) {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await admin.from("brief_hits").select("id", { count: "exact", head: true }).eq("key", key).gte("created_at", since);
  if (error) return true;
  if ((count ?? 0) >= limit) return false;
  await admin.from("brief_hits").insert({ key });
  return true;
}

export async function POST(request: Request) {
  if (!secretKey()) return NextResponse.json({ error: "This deal link isn't set up yet." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Fill in the brief first." }, { status: 400 });
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const admin = createAdminClient();
  if (!(await allowed(admin, `ip:${hashed(ip)}`, PER_NETWORK))) {
    return NextResponse.json({ error: "Too many briefs from this network. Try again in an hour." }, { status: 429 });
  }
  const profile = await loadProfileByHandle(admin, String(body.handle ?? ""));
  if (!profile) return NextResponse.json({ error: "That deal link doesn't exist." }, { status: 404 });
  if (!(await allowed(admin, `creator:${profile.userId}`, PER_CREATOR))) {
    return NextResponse.json({ error: "This creator has received a lot of briefs in the last hour. Try again later." }, { status: 429 });
  }
  if (!profile.accepting) return NextResponse.json({ error: `${profile.displayName || "This creator"} isn't taking new briefs right now.` }, { status: 403 });

  const { brief, error } = cleanBrief(body);
  if (!brief) return NextResponse.json({ error }, { status: 400 });

  const now = new Date().toISOString();
  const { data: conversation, error: saveError } = await admin
    .from("conversations")
    .insert({
      user_id: profile.userId,
      source: "link",
      external_id: crypto.randomUUID(),
      from_name: brief.contactName ? `${brief.contactName} · ${brief.brandName}` : brief.brandName,
      from_handle: brief.email,
      subject: brief.campaign ? `${brief.brandName} — ${brief.campaign}` : `${brief.brandName} collaboration`,
      received_at: now,
      messages: [{ from: "them", at: now, text: briefText(brief) }],
    })
    .select("id")
    .single();
  if (saveError || !conversation) {
    return NextResponse.json({ error: "The brief was not sent. Please try again." }, { status: 500 });
  }

  const { extraction, category } = briefExtraction(brief);
  const { error: dealError } = await admin.from("deals").insert({
    conversation_id: conversation.id,
    user_id: profile.userId,
    is_brand_opportunity: true,
    detection_reason: extraction.detectionReason,
    brand: extraction.brand,
    campaign: extraction.campaign,
    offer_amount: extraction.offerAmount,
    offer_approximate: false,
    deliverables: extraction.deliverables,
    deadline: extraction.deadline,
    usage_rights_days: extraction.usageRightsDays,
    usage_via: extraction.usageVia,
    exclusivity_days: extraction.exclusivityDays,
    payment: extraction.payment,
    notes: [],
    reader: "form",
    category,
    contact_email: brief.email,
  });
  if (dealError) {
    await admin.from("conversations").delete().eq("id", conversation.id);
    return NextResponse.json({ error: "The brief was not sent. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
