import type { SupabaseClient } from "@supabase/supabase-js";
import { canAutoSend, lastFromThem, planDeal } from "@/lib/agent.mjs";
import { ensurePayLink } from "@/lib/billing";
import { appendSent, logAction, sendEmail, sendOnThread, type ThreadRow } from "@/lib/channels";
import { CONVERSATION_COLUMNS, deskConversationFrom, type ConversationRow } from "@/lib/deal-rows";
import { planReminder, reminderMessage } from "@/lib/invoice.mjs";
import { invoiceFrom, type InvoiceRow } from "@/lib/invoices";
import { creatorName, loadProfile } from "@/lib/profile";
import { loadSettings } from "@/lib/settings";

export type AutopilotResult = {
  ran: boolean;
  sent: { conversationId: string; kind: string; title: string }[];
  held: number;
  reminders: number;
  failures: string[];
  reason?: string;
};

const REPEAT_HOURS = 20;

export async function runAutopilot(admin: SupabaseClient, userId: string, email: string | null): Promise<AutopilotResult> {
  const settings = await loadSettings(admin, userId);
  const result: AutopilotResult = { ran: false, sent: [], held: 0, reminders: 0, failures: [] };
  if (!settings.autopilot.enabled) return { ...result, reason: "Autopilot is off." };
  result.ran = true;

  const profile = await loadProfile(admin, userId);
  const name = creatorName(profile, email);
  const now = new Date();

  const since = new Date(now.getTime() - REPEAT_HOURS * 3600000).toISOString();
  const { data: recent } = await admin
    .from("agent_actions")
    .select("conversation_id, kind")
    .eq("user_id", userId)
    .eq("status", "sent")
    .gte("created_at", since);
  const recentlySent = new Set((recent ?? []).map((row) => `${row.conversation_id}:${row.kind}`));

  const { data: rows } = await admin
    .from("conversations")
    .select(CONVERSATION_COLUMNS)
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(60);

  for (const row of (rows ?? []) as unknown as ConversationRow[]) {
    const conversation = deskConversationFrom(row);
    if (!conversation || !conversation.extraction.isBrandOpportunity) continue;
    if (conversation.meta.dismissed || conversation.meta.status !== "open") continue;

    const planned = planDeal({
      conversation,
      extraction: conversation.extraction,
      rules: settings.rules,
      category: conversation.meta.category,
      status: conversation.meta.status,
      creatorName: name,
      now,
    });
    if (!planned?.text) continue;

    const verdict = canAutoSend(planned, settings.autopilot, {
      source: conversation.source,
      lastThemAt: lastFromThem(conversation)?.at ?? null,
      minimumOffer: settings.rules.minimumOffer,
      now,
    });
    if (!verdict.ok) {
      if (planned.kind !== "waiting") result.held += 1;
      continue;
    }
    if (recentlySent.has(`${conversation.id}:${planned.kind}`)) continue;

    const thread: ThreadRow = {
      id: conversation.id,
      user_id: userId,
      source: conversation.source,
      external_id: row.external_id ?? "",
      from_handle: conversation.fromHandle,
      subject: conversation.subject,
      messages: conversation.messages,
      contact_email: conversation.meta.contactEmail,
    };
    try {
      const channel = await sendOnThread(admin, thread, planned.text);
      await appendSent(admin, thread, planned.text);
      await logAction(admin, { userId, conversationId: conversation.id, kind: planned.kind, status: "sent", channel, text: planned.text, reason: planned.reason });
      result.sent.push({ conversationId: conversation.id, kind: planned.kind, title: planned.title });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Send failed.";
      result.failures.push(message);
      await logAction(admin, { userId, conversationId: conversation.id, kind: planned.kind, status: "failed", text: planned.text, reason: message }).catch(() => undefined);
    }
  }

  if (settings.autopilot.paymentReminders) {
    const { data: invoices } = await admin
      .from("invoices")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["sent", "partially_paid"]);
    for (const row of (invoices ?? []) as InvoiceRow[]) {
      const invoice = invoiceFrom(row);
      const due = planReminder(invoice, now);
      if (!due) continue;
      const payUrl = await ensurePayLink(admin, row as InvoiceRow & { user_id: string }).catch(() => invoice.paymentLinkUrl);
      const message = reminderMessage(invoice, due.stage, name, payUrl);
      try {
        await sendEmail(admin, userId, { to: invoice.billToEmail, subject: message.subject, body: message.text });
        await admin
          .from("invoices")
          .update({ reminders_sent: due.index + 1, last_reminder_at: now.toISOString() })
          .eq("id", invoice.id);
        await logAction(admin, { userId, conversationId: invoice.conversationId, invoiceId: invoice.id, kind: `payment_${due.stage}`, status: "sent", channel: "gmail", text: message.text, reason: `Invoice ${invoice.number}` });
        result.reminders += 1;
      } catch (error) {
        result.failures.push(error instanceof Error ? error.message : "Reminder failed.");
      }
    }
  }

  return result;
}
