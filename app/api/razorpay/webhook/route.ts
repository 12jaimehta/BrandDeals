import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadBilling } from "@/lib/billing";
import { logAction } from "@/lib/channels";
import { invoiceFee, routeTransfer } from "@/lib/commercial.mjs";
import { secretKey } from "@/lib/config";
import type { InvoiceRow } from "@/lib/invoices";
import { createTransfer, ROUTE_ACCOUNT, verifyWebhook } from "@/lib/razorpay";
import { formatINR } from "@/lib/read-deal.mjs";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Notes = Record<string, string | undefined>;
type LinkEntity = { id: string; notes?: Notes | []; amount_paid?: number };
type PaymentEntity = { id: string; amount: number; fee?: number | null };
type SubscriptionEntity = { id: string; status: string; current_end?: number | null; notes?: Notes | [] };
type RazorpayEvent = {
  event: string;
  created_at?: number;
  payload: {
    payment_link?: { entity: LinkEntity };
    payment?: { entity: PaymentEntity };
    subscription?: { entity: SubscriptionEntity };
  };
};

const notesOf = (value: Notes | [] | undefined): Notes => (value && !Array.isArray(value) ? value : {});

async function invoicePaid(admin: SupabaseClient, link: LinkEntity, payment: PaymentEntity) {
  const notes = notesOf(link.notes);
  const { data } = await admin.from("invoices").select("*").eq("id", notes.invoice_id ?? "").maybeSingle();
  if (!data) throw new Error(`Invoice ${notes.invoice_id} not found for payment ${payment.id}.`);
  const row = data as InvoiceRow & { user_id: string };
  if (row.razorpay_payment_id === payment.id) return;

  const received = payment.amount / 100;
  const paid = Math.min(row.total, row.paid_amount + received);
  const billing = await loadBilling(admin, row.user_id);
  const fee = (row.fee_status ?? "none") === "none" ? invoiceFee({ subtotal: row.subtotal, conversationId: row.conversation_id, plan: billing.plan }) : 0;
  const split = routeTransfer({ amountPaise: payment.amount, gatewayFeePaise: payment.fee ?? 0, counterFeeRupees: fee });

  const { data: profile } = await admin.from("creator_profiles").select("razorpay_account_id").eq("user_id", row.user_id).maybeSingle();
  const account = [profile?.razorpay_account_id, notes.account].find((value): value is string => typeof value === "string" && ROUTE_ACCOUNT.test(value));

  let transferId: string | null = null;
  let transferError: string | null = null;
  if (!account) transferError = "No payout account on file.";
  else if (split.transferPaise > 0) {
    try {
      transferId = await createTransfer(payment.id, { account, amountPaise: split.transferPaise, notes: { invoice_id: row.id, number: row.number } });
    } catch (error) {
      transferError = error instanceof Error ? error.message : "Transfer failed.";
    }
  }

  const feeStatus = transferError ? "transfer_failed" : split.counterPaise > 0 ? "deducted" : row.fee_status && row.fee_status !== "none" ? row.fee_status : "waived";
  await admin
    .from("invoices")
    .update({
      paid_amount: paid,
      status: paid >= row.total ? "paid" : "partially_paid",
      paid_via: "razorpay",
      razorpay_payment_id: payment.id,
      transfer_id: transferId,
      transfer_paise: split.transferPaise,
      fee_amount: fee ? split.counterPaise / 100 : row.fee_amount ?? 0,
      fee_status: feeStatus,
      payment_link_id: null,
      payment_link_url: null,
      payment_link_amount: null,
    })
    .eq("id", row.id);

  await logAction(admin, {
    userId: row.user_id,
    conversationId: row.conversation_id,
    invoiceId: row.id,
    kind: "invoice_paid_online",
    status: transferError ? "failed" : "sent",
    channel: "razorpay",
    text: `${row.brand || "The brand"} paid ${formatINR(received)} on invoice ${row.number}. ${formatINR(split.transferPaise / 100)} is on its way to your account.`,
    reason: transferError ?? `Razorpay fee ${formatINR(split.gatewayPaise / 100)}, Counter fee ${formatINR(split.counterPaise / 100)}.`,
  });
}

async function feesPaid(admin: SupabaseClient, link: LinkEntity, payment: PaymentEntity) {
  const chargeId = notesOf(link.notes).charge_id ?? "";
  await admin.from("fee_charges").update({ status: "paid", paid_at: new Date().toISOString(), razorpay_payment_id: payment.id }).eq("id", chargeId);
  await admin.from("invoices").update({ fee_status: "paid" }).eq("fee_charge_id", chargeId).eq("fee_status", "billed");
}

async function feesLapsed(admin: SupabaseClient, link: LinkEntity) {
  const chargeId = notesOf(link.notes).charge_id ?? "";
  await admin.from("fee_charges").update({ status: "cancelled" }).eq("id", chargeId).eq("status", "created");
  await admin.from("invoices").update({ fee_status: "due", fee_charge_id: null }).eq("fee_charge_id", chargeId).eq("fee_status", "billed");
}

async function subscriptionChanged(admin: SupabaseClient, subscription: SubscriptionEntity) {
  const userId = notesOf(subscription.notes).user_id;
  if (!userId) return;
  const { data: current } = await admin.from("billing_accounts").select("subscription_id, subscription_status").eq("user_id", userId).maybeSingle();
  const newerIsLive = current?.subscription_id && current.subscription_id !== subscription.id && ["authenticated", "active", "pending"].includes(current.subscription_status ?? "");
  if (newerIsLive) return;
  await admin.from("billing_accounts").upsert({
    user_id: userId,
    plan: "agency",
    subscription_id: subscription.id,
    subscription_status: subscription.status,
    current_end: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

async function handle(admin: SupabaseClient, event: RazorpayEvent) {
  const link = event.payload.payment_link?.entity;
  const payment = event.payload.payment?.entity;
  const kind = notesOf(link?.notes).kind;
  if (event.event === "payment_link.paid" && link && payment) {
    if (kind === "invoice") await invoicePaid(admin, link, payment);
    if (kind === "fees") await feesPaid(admin, link, payment);
    return;
  }
  if ((event.event === "payment_link.cancelled" || event.event === "payment_link.expired") && link && kind === "fees") {
    await feesLapsed(admin, link);
    return;
  }
  if (event.event.startsWith("subscription.") && event.payload.subscription) {
    await subscriptionChanged(admin, event.payload.subscription.entity);
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }
  if (!secretKey()) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is missing." }, { status: 500 });

  const event = JSON.parse(raw) as RazorpayEvent;
  const entityId = event.payload.payment?.entity.id ?? event.payload.payment_link?.entity.id ?? event.payload.subscription?.entity.id ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") || `${event.event}:${entityId}:${event.created_at ?? ""}`;

  const admin = createAdminClient();
  const { error: seen } = await admin.from("razorpay_events").insert({ id: eventId, event: event.event });
  if (seen?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  if (seen) return NextResponse.json({ error: "Could not record the event." }, { status: 500 });

  try {
    await handle(admin, event);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await admin.from("razorpay_events").delete().eq("id", eventId);
    console.error("razorpay webhook", event.event, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Not processed." }, { status: 500 });
  }
}
