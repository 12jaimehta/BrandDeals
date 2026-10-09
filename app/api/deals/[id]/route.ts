import { NextResponse } from "next/server";
import { metaFrom, type DealRow } from "@/lib/deal-rows";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

type Patch = {
  dismissed?: boolean;
  followUpOn?: string | null;
  followedUp?: boolean;
  status?: "open" | "won" | "lost";
  agreedFee?: number | null;
  contactEmail?: string | null;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Patch | null;
  if (!body) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.dismissed === "boolean") update.dismissed = body.dismissed;
  if (typeof body.followedUp === "boolean") update.followed_up = body.followedUp;
  if (body.followUpOn === null || (typeof body.followUpOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.followUpOn))) {
    update.follow_up_on = body.followUpOn;
  }
  if (body.contactEmail === null || (typeof body.contactEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contactEmail.trim()))) {
    update.contact_email = body.contactEmail?.trim() ?? null;
  }
  if (body.status === "open" || body.status === "won" || body.status === "lost") {
    update.status = body.status;
    update.closed_at = body.status === "open" ? null : new Date().toISOString();
    if (body.status === "won") {
      const fee = Number(body.agreedFee);
      if (!Number.isFinite(fee) || fee <= 0) return NextResponse.json({ error: "Enter the fee you agreed." }, { status: 400 });
      update.agreed_fee = Math.round(fee);
    }
    if (body.status === "open") update.agreed_fee = null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .update(update)
    .eq("conversation_id", id)
    .eq("user_id", viewer.id)
    .select("*")
    .maybeSingle();
  if (error) {
    const migration = /column|schema cache/i.test(error.message);
    return NextResponse.json({ error: migration ? "Run supabase/migrations/0004_deal_desk.sql in the Supabase SQL editor first." : "That change was not saved." }, { status: 400 });
  }
  if (!data) return NextResponse.json({ error: "Couldn't find that deal." }, { status: 404 });
  return NextResponse.json({ meta: metaFrom(data as DealRow) });
}
