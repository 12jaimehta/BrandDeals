import { NextResponse } from "next/server";
import { secretKey } from "@/lib/config";
import { invoiceFrom, type InvoiceRow } from "@/lib/invoices";
import { createTransfer, ROUTE_ACCOUNT } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

// Retries the transfer to the creator when the webhook couldn't make it.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey()) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is missing." }, { status: 500 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("invoices").select("*").eq("id", id).eq("user_id", viewer.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Couldn't find that invoice." }, { status: 404 });
  const row = data as InvoiceRow;
  if (row.fee_status !== "transfer_failed" || !row.razorpay_payment_id || !row.transfer_paise) {
    return NextResponse.json({ error: "There's no failed payout on this invoice." }, { status: 400 });
  }
  const { data: profile } = await admin.from("creator_profiles").select("razorpay_account_id").eq("user_id", viewer.id).maybeSingle();
  const account = profile?.razorpay_account_id as string | undefined;
  if (!account || !ROUTE_ACCOUNT.test(account)) return NextResponse.json({ error: "Add your payout account in Settings first." }, { status: 400 });

  try {
    const transferId = await createTransfer(row.razorpay_payment_id, { account, amountPaise: row.transfer_paise, notes: { invoice_id: row.id, number: row.number, retry: "1" } });
    const { data: updated } = await admin
      .from("invoices")
      .update({ transfer_id: transferId, fee_status: (row.fee_amount ?? 0) > 0 ? "deducted" : "waived" })
      .eq("id", row.id)
      .select("*")
      .single();
    return NextResponse.json({ invoice: invoiceFrom((updated ?? row) as InvoiceRow) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The payout failed again." }, { status: 502 });
  }
}
