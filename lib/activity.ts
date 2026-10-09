export type Activity = {
  id: string;
  conversationId: string | null;
  invoiceId: string | null;
  kind: string;
  status: "sent" | "skipped" | "failed";
  channel: string | null;
  reason: string;
  text: string;
  createdAt: string;
};

export function activityLabel(kind: string) {
  const labels: Record<string, string> = {
    ask_budget: "asked for the budget",
    ask_terms: "asked for the missing terms",
    counter: "sent a counter",
    follow_up: "followed up",
    decline_blocked: "declined a blocked category",
    invoice_sent: "sent the invoice",
    payment_before_due: "sent a payment heads-up",
    payment_due_today: "sent a due-today reminder",
    payment_overdue_7: "sent an overdue reminder",
    payment_overdue_14: "sent a second overdue reminder",
  };
  if (labels[kind]) return labels[kind];
  if (kind.startsWith("approved_")) return "sent your approved reply";
  return kind.replace(/_/g, " ");
}
