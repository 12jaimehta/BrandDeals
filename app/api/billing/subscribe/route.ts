import { NextResponse } from "next/server";
import { loadBilling } from "@/lib/billing";
import { secretKey } from "@/lib/config";
import { createSubscription, razorpayConfig } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const config = razorpayConfig();
  if (!secretKey() || !config.configured || !config.agencyPlanId) return NextResponse.json({ error: "The agency plan isn't open for sign-up yet." }, { status: 503 });
  const admin = createAdminClient();
  const billing = await loadBilling(admin, viewer.id);
  if (billing.plan === "agency") return NextResponse.json({ error: "You're already on the agency plan." }, { status: 400 });

  try {
    const subscription = await createSubscription({ planId: config.agencyPlanId, notes: { user_id: viewer.id } });
    await admin.from("billing_accounts").upsert({
      user_id: viewer.id,
      plan: "agency",
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ url: subscription.short_url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't start the subscription." }, { status: 502 });
  }
}
