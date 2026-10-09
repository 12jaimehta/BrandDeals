import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.razorpay.com/v1";

export const ROUTE_ACCOUNT = /^acc_[A-Za-z0-9]{14}$/;

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    agencyPlanId: process.env.RAZORPAY_AGENCY_PLAN_ID ?? "",
    configured: Boolean(keyId && keySecret),
  };
}

async function call<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<T> {
  const { keyId, keySecret, configured } = razorpayConfig();
  if (!configured) throw new Error("Razorpay isn't set up. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as (T & { error?: { description?: string } }) | null;
  if (!response.ok || !json) throw new Error(json?.error?.description?.slice(0, 220) || `Razorpay returned ${response.status}.`);
  return json;
}

export type PaymentLink = { id: string; short_url: string; status: string; amount: number; amount_paid: number };

export async function createPaymentLink(input: {
  amountRupees: number;
  description: string;
  customer?: { name?: string; email?: string };
  notes: Record<string, string>;
  expireInDays?: number;
}) {
  const amount = Math.round(input.amountRupees * 100);
  if (amount < 100) throw new Error("Online payment needs at least ₹1.");
  return call<PaymentLink>("POST", "/payment_links", {
    amount,
    currency: "INR",
    accept_partial: false,
    description: input.description.slice(0, 2048),
    customer: input.customer?.email ? { name: input.customer.name || undefined, email: input.customer.email } : undefined,
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: input.notes,
    ...(input.expireInDays ? { expire_by: Math.floor(Date.now() / 1000) + input.expireInDays * 86400 } : {}),
  });
}

export async function cancelPaymentLink(id: string) {
  return call<PaymentLink>("POST", `/payment_links/${encodeURIComponent(id)}/cancel`);
}

export async function createTransfer(paymentId: string, input: { account: string; amountPaise: number; notes: Record<string, string> }) {
  const body = await call<{ items: { id: string }[] }>("POST", `/payments/${encodeURIComponent(paymentId)}/transfers`, {
    transfers: [{ account: input.account, amount: input.amountPaise, currency: "INR", notes: input.notes, on_hold: false }],
  });
  return body.items?.[0]?.id ?? null;
}

export type Subscription = { id: string; short_url: string; status: string; current_end: number | null };

export async function createSubscription(input: { planId: string; notes: Record<string, string>; totalCount?: number }) {
  return call<Subscription>("POST", "/subscriptions", {
    plan_id: input.planId,
    total_count: input.totalCount ?? 120,
    customer_notify: 1,
    notes: input.notes,
  });
}

export async function cancelSubscription(id: string, atCycleEnd = true) {
  return call<Subscription>("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, { cancel_at_cycle_end: atCycleEnd ? 1 : 0 });
}

export function verifyWebhook(rawBody: string, signature: string | null) {
  const { webhookSecret } = razorpayConfig();
  if (!webhookSecret || !signature) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
