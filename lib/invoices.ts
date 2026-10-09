import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysIso, computeInvoice, invoiceNumber, istToday, type Invoice, type InvoiceItem, type InvoiceStatus } from "@/lib/invoice.mjs";

export type { Invoice };

export type InvoiceRow = {
  id: string;
  conversation_id: string | null;
  number: string;
  brand: string | null;
  bill_to_name: string | null;
  bill_to_email: string | null;
  items: unknown;
  subtotal: number;
  gst_rate: number | string;
  gst_amount: number;
  total: number;
  advance_percent: number;
  issued_on: string;
  due_on: string;
  status: InvoiceStatus;
  paid_amount: number;
  reminders_sent: number;
  last_reminder_at: string | null;
  notes: string | null;
  created_at: string;
};

function asItems(value: unknown): InvoiceItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { label, amount } = item as { label?: unknown; amount?: unknown };
    return typeof label === "string" && typeof amount === "number" ? [{ label, amount }] : [];
  });
}

export function invoiceFrom(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    number: row.number,
    brand: row.brand ?? "",
    billToName: row.bill_to_name ?? "",
    billToEmail: row.bill_to_email ?? "",
    items: asItems(row.items),
    subtotal: row.subtotal,
    gstRate: Number(row.gst_rate) || 0,
    gstAmount: row.gst_amount,
    total: row.total,
    advancePercent: row.advance_percent,
    issuedOn: row.issued_on,
    dueOn: row.due_on,
    status: row.status,
    paidAmount: row.paid_amount,
    remindersSent: row.reminders_sent,
    lastReminderAt: row.last_reminder_at,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

export async function listInvoices(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("invoices").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
  if (error || !data) return [];
  return (data as InvoiceRow[]).map(invoiceFrom);
}

export type NewInvoice = {
  conversationId?: string | null;
  brand: string;
  billToName: string;
  billToEmail: string;
  items: InvoiceItem[];
  gstRate: number;
  advancePercent: number;
  dueInDays: number;
  notes?: string;
};

export function cleanNewInvoice(input: unknown): NewInvoice {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  const due = Number(raw.dueInDays);
  const advance = Number(raw.advancePercent);
  return {
    conversationId: typeof raw.conversationId === "string" && raw.conversationId ? raw.conversationId : null,
    brand: text(raw.brand, 120),
    billToName: text(raw.billToName, 120),
    billToEmail: text(raw.billToEmail, 200),
    items: Array.isArray(raw.items) ? (raw.items as InvoiceItem[]).slice(0, 12) : [],
    gstRate: Number(raw.gstRate) || 0,
    advancePercent: Number.isFinite(advance) ? Math.min(100, Math.max(0, Math.round(advance))) : 0,
    dueInDays: Number.isFinite(due) ? Math.min(120, Math.max(0, Math.round(due))) : 15,
    notes: text(raw.notes, 600),
  };
}

export async function createInvoice(client: SupabaseClient, userId: string, input: NewInvoice) {
  const totals = computeInvoice(input.items, input.gstRate);
  if (!totals.items.length) throw new Error("Add at least one line with an amount.");
  if (input.billToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.billToEmail)) throw new Error("That billing email doesn't look right.");
  const today = istToday();
  const year = Number(today.slice(0, 4));
  const { count } = await client.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", userId);
  let sequence = (count ?? 0) + 1;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await client
      .from("invoices")
      .insert({
        user_id: userId,
        conversation_id: input.conversationId ?? null,
        number: invoiceNumber(year, sequence),
        brand: input.brand,
        bill_to_name: input.billToName,
        bill_to_email: input.billToEmail,
        items: totals.items,
        subtotal: totals.subtotal,
        gst_rate: totals.gstRate,
        gst_amount: totals.gstAmount,
        total: totals.total,
        advance_percent: input.advancePercent,
        issued_on: today,
        due_on: addDaysIso(today, input.dueInDays),
        notes: input.notes ?? "",
      })
      .select("*")
      .single();
    if (!error && data) return invoiceFrom(data as InvoiceRow);
    if (error?.code === "23505") {
      sequence += 1;
      continue;
    }
    throw new Error(/relation|schema cache|could not find/i.test(error?.message ?? "")
      ? "Run supabase/migrations/0004_deal_desk.sql in the Supabase SQL editor first."
      : "The invoice was not created.");
  }
  throw new Error("The invoice was not created.");
}
