import type { SupabaseClient } from "@supabase/supabase-js";
import { invoiceFee } from "@/lib/commercial.mjs";
import type { InvoiceRow } from "@/lib/invoices";
import { cancelPaymentLink, createPaymentLink, razorpayConfig, ROUTE_ACCOUNT } from "@/lib/razorpay";

export type Plan = "deal_share" | "agency";

export type Billing = {
  plan: Plan;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  currentEnd: string | null;
};

const LIVE_SUBSCRIPTION = new Set(["authenticated", "active", "pending"]);

export async function loadBilling(client: SupabaseClient, userId: string): Promise<Billing> {
  const { data } = await client
    .from("billing_accounts")
    .select("plan, subscription_id, subscription_status, current_end")
    .eq("user_id", userId)
    .maybeSingle();
  const status = (data?.subscription_status as string | null) ?? null;
  const agency = data?.plan === "agency" && status != null && LIVE_SUBSCRIPTION.has(status);
  return {
    plan: agency ? "agency" : "deal_share",
    subscriptionId: (data?.subscription_id as string | null) ?? null,
    subscriptionStatus: status,
    currentEnd: (data?.current_end as string | null) ?? null,
  };
}

async function payoutAccount(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("creator_profiles").select("razorpay_account_id").eq("user_id", userId).maybeSingle();
  const account = (data?.razorpay_account_id as string | null) ?? "";
  return ROUTE_ACCOUNT.test(account) ? account : null;
}

// A Razorpay link for the invoice balance, paid to Counter and split to the
// creator's payout account. Null when online payment isn't available.
export async function ensurePayLink(admin: SupabaseClient, row: InvoiceRow & { user_id: string }) {
  if (!razorpayConfig().configured) return null;
  if (row.status === "paid" || row.status === "void") return null;
  const balance = row.total - row.paid_amount;
  if (balance < 1) return null;
  const account = await payoutAccount(admin, row.user_id);
  if (!account) return null;
  if (row.payment_link_id && row.payment_link_url && row.payment_link_amount === balance) return row.payment_link_url;

  if (row.payment_link_id) await cancelPaymentLink(row.payment_link_id).catch(() => undefined);
  const link = await createPaymentLink({
    amountRupees: balance,
    description: `Invoice ${row.number}${row.brand ? ` for ${row.brand}` : ""}`,
    customer: { name: row.bill_to_name ?? undefined, email: row.bill_to_email ?? undefined },
    notes: { kind: "invoice", invoice_id: row.id, user_id: row.user_id, account },
  });
  await admin
    .from("invoices")
    .update({ payment_link_id: link.id, payment_link_url: link.short_url, payment_link_amount: balance })
    .eq("id", row.id);
  return link.short_url;
}

export async function dropPayLink(admin: SupabaseClient, row: Pick<InvoiceRow, "id" | "payment_link_id">) {
  if (!row.payment_link_id) return;
  await cancelPaymentLink(row.payment_link_id).catch(() => undefined);
  await admin.from("invoices").update({ payment_link_id: null, payment_link_url: null, payment_link_amount: null }).eq("id", row.id);
}

// Paid outside Counter: the fee becomes due and is collected with the next fee payment.
export async function settleManualPayment(admin: SupabaseClient, row: InvoiceRow & { user_id: string }) {
  await dropPayLink(admin, row);
  if (row.status !== "paid" || (row.fee_status ?? "none") !== "none") return;
  const billing = await loadBilling(admin, row.user_id);
  const fee = invoiceFee({ subtotal: row.subtotal, conversationId: row.conversation_id, plan: billing.plan });
  await admin
    .from("invoices")
    .update({ paid_via: "manual", fee_amount: fee, fee_status: fee > 0 ? "due" : "waived" })
    .eq("id", row.id);
}

export type FeeSummary = {
  due: number;
  dueInvoices: { id: string; number: string; brand: string; fee: number }[];
  openCharge: { id: string; amount: number; url: string | null } | null;
  deducted: number;
  paid: number;
};

export async function feeSummary(client: SupabaseClient, userId: string): Promise<FeeSummary> {
  const [{ data: rows }, { data: charge }] = await Promise.all([
    client.from("invoices").select("id, number, brand, fee_amount, fee_status").eq("user_id", userId).in("fee_status", ["due", "billed", "deducted", "paid"]),
    client.from("fee_charges").select("id, amount, payment_link_url").eq("user_id", userId).eq("status", "created").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const list = (rows ?? []) as { id: string; number: string; brand: string | null; fee_amount: number; fee_status: string }[];
  const sum = (status: string[]) => list.filter((row) => status.includes(row.fee_status)).reduce((total, row) => total + row.fee_amount, 0);
  return {
    due: sum(["due", "billed"]),
    dueInvoices: list.filter((row) => row.fee_status === "due" || row.fee_status === "billed").map((row) => ({ id: row.id, number: row.number, brand: row.brand ?? "", fee: row.fee_amount })),
    openCharge: charge ? { id: charge.id as string, amount: charge.amount as number, url: (charge.payment_link_url as string | null) ?? null } : null,
    deducted: sum(["deducted"]),
    paid: sum(["paid"]),
  };
}
