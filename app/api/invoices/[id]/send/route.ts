import { NextResponse } from "next/server";
import { ensurePayLink } from "@/lib/billing";
import { secretKey } from "@/lib/config";
import { logAction, sendEmail } from "@/lib/channels";
import { amountInWords } from "@/lib/invoice.mjs";
import { invoiceFrom, type InvoiceRow } from "@/lib/invoices";
import { creatorName, loadProfile } from "@/lib/profile";
import { formatINR } from "@/lib/read-deal.mjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey()) return NextResponse.json({ error: "Add SUPABASE_SECRET_KEY so Gmail can be used." }, { status: 400 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("invoices").select("*").eq("id", id).eq("user_id", viewer.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Couldn't find that invoice." }, { status: 404 });
  const invoice = invoiceFrom(data as InvoiceRow);
  if (!invoice.billToEmail) return NextResponse.json({ error: "Add the brand's billing email first." }, { status: 400 });
  if (invoice.status === "void" || invoice.status === "paid") return NextResponse.json({ error: "This invoice is closed." }, { status: 400 });

  const profile = await loadProfile(admin, viewer.id);
  const name = creatorName(profile, viewer.email);
  let payUrl: string | null = null;
  try {
    payUrl = await ensurePayLink(admin, data as InvoiceRow & { user_id: string });
  } catch (error) {
    return NextResponse.json({ error: `The online payment link failed: ${error instanceof Error ? error.message : "Razorpay error."} Remove your payout account in Settings to send without it.` }, { status: 502 });
  }
  const lines = [
    `Hi ${invoice.billToName ? invoice.billToName.split(/\s+/)[0] : "there"},`,
    "",
    `Please find invoice ${invoice.number}${invoice.brand ? ` for ${invoice.brand}` : ""} below.`,
    "",
    ...invoice.items.map((item) => `${item.label}: ${formatINR(item.amount)}`),
    invoice.gstRate ? `GST at ${invoice.gstRate}%: ${formatINR(invoice.gstAmount)}` : "",
    `Total: ${formatINR(invoice.total)} (${amountInWords(invoice.total)})`,
    invoice.advancePercent ? `Advance due now: ${formatINR(Math.round((invoice.total * invoice.advancePercent) / 100))} (${invoice.advancePercent}%)` : "",
    `Due on: ${invoice.dueOn}`,
    "",
    payUrl ? `Pay online by UPI, card, or netbanking: ${payUrl}\n` : "",
    payUrl ? "Or pay directly" : "Payment details",
    profile?.legalName ? `Name: ${profile.legalName}` : "",
    profile?.upiId ? `UPI: ${profile.upiId}` : "",
    profile?.pan ? `PAN: ${profile.pan}` : "",
    profile?.gstin ? `GSTIN: ${profile.gstin}` : "",
    invoice.notes ? `\n${invoice.notes}` : "",
    "",
    `Thanks,\n${name}`,
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "");

  try {
    await sendEmail(admin, viewer.id, { to: invoice.billToEmail, subject: `Invoice ${invoice.number}${invoice.brand ? ` — ${invoice.brand}` : ""}`, body: lines.join("\n") });
    const { data: updated } = await admin
      .from("invoices")
      .update({ status: invoice.status === "draft" ? "sent" : invoice.status })
      .eq("id", id)
      .select("*")
      .single();
    await logAction(admin, { userId: viewer.id, conversationId: invoice.conversationId, invoiceId: invoice.id, kind: "invoice_sent", status: "sent", channel: "gmail", text: lines.join("\n"), reason: `Invoice ${invoice.number}` }).catch(() => undefined);
    return NextResponse.json({ invoice: updated ? invoiceFrom(updated as InvoiceRow) : invoice });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The invoice was not sent." }, { status: 502 });
  }
}
