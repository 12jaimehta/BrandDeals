import { NextResponse } from "next/server";
import { loadBilling } from "@/lib/billing";
import { secretKey } from "@/lib/config";
import { cancelSubscription } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

// Cancels at the end of the paid month. The webhook moves the account back to the deal share.
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey()) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is missing." }, { status: 500 });
  const admin = createAdminClient();
  const billing = await loadBilling(admin, viewer.id);
  if (!billing.subscriptionId || billing.plan !== "agency") return NextResponse.json({ error: "There's no active agency plan." }, { status: 400 });
  try {
    await cancelSubscription(billing.subscriptionId, true);
    return NextResponse.json({ ok: true, until: billing.currentEnd });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't cancel." }, { status: 502 });
  }
}
