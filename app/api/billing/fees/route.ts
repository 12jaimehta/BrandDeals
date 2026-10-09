import { NextResponse } from "next/server";
import { secretKey } from "@/lib/config";
import { createPaymentLink, razorpayConfig } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

// One payment link for every fee owed on deals that were paid outside Counter.
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey() || !razorpayConfig().configured) return NextResponse.json({ error: "Online payment isn't set up yet." }, { status: 503 });
  const admin = createAdminClient();

  const { data: open } = await admin.from("fee_charges").select("id, payment_link_url").eq("user_id", viewer.id).eq("status", "created").limit(1).maybeSingle();
  if (open?.payment_link_url) return NextResponse.json({ url: open.payment_link_url });

  const { data: due } = await admin.from("invoices").select("id, number, fee_amount").eq("user_id", viewer.id).eq("fee_status", "due");
  const rows = (due ?? []) as { id: string; number: string; fee_amount: number }[];
  const amount = rows.reduce((sum, row) => sum + row.fee_amount, 0);
  if (amount < 1) return NextResponse.json({ error: "Nothing is due." }, { status: 400 });

  const { data: charge, error } = await admin.from("fee_charges").insert({ user_id: viewer.id, amount }).select("id").single();
  if (error || !charge) return NextResponse.json({ error: "Couldn't start the payment." }, { status: 500 });

  try {
    const link = await createPaymentLink({
      amountRupees: amount,
      description: `Counter fees for ${rows.map((row) => row.number).join(", ")}`.slice(0, 250),
      customer: { email: viewer.email ?? undefined },
      notes: { kind: "fees", charge_id: charge.id, user_id: viewer.id },
      expireInDays: 14,
    });
    await admin.from("fee_charges").update({ payment_link_id: link.id, payment_link_url: link.short_url }).eq("id", charge.id);
    await admin.from("invoices").update({ fee_status: "billed", fee_charge_id: charge.id }).in("id", rows.map((row) => row.id)).eq("fee_status", "due");
    return NextResponse.json({ url: link.short_url });
  } catch (error) {
    await admin.from("fee_charges").delete().eq("id", charge.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't start the payment." }, { status: 502 });
  }
}
