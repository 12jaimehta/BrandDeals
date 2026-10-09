export type InvoiceItem = { label: string; amount: number };

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "void";

export type Invoice = {
  id: string;
  conversationId: string | null;
  number: string;
  brand: string;
  billToName: string;
  billToEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  advancePercent: number;
  issuedOn: string;
  dueOn: string;
  status: InvoiceStatus;
  paidAmount: number;
  remindersSent: number;
  lastReminderAt: string | null;
  notes: string;
  createdAt: string;
};

export type ReminderStage = "before_due" | "due_today" | "overdue_7" | "overdue_14";

export const STAGES: { stage: ReminderStage; offset: number; tone: string }[];
export function istToday(now?: Date): string;
export function dayDiff(fromIso: string, toIso: string): number;
export function addDaysIso(iso: string, days: number): string;
export function invoiceNumber(year: number, sequence: number): string;
export function computeInvoice(items: InvoiceItem[], gstRate?: number): {
  items: InvoiceItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
};
export function amountInWords(amount: number): string;
export function balanceOf(invoice: Pick<Invoice, "total" | "paidAmount">): number;
export function displayStatus(invoice: Pick<Invoice, "status" | "dueOn">, now?: Date): InvoiceStatus | "overdue";
export function planReminder(
  invoice: Pick<Invoice, "status" | "dueOn" | "billToEmail" | "total" | "paidAmount" | "remindersSent" | "lastReminderAt">,
  now?: Date,
): { stage: ReminderStage; offset: number; tone: string; index: number } | null;
export function reminderMessage(
  invoice: Pick<Invoice, "number" | "brand" | "billToName" | "dueOn" | "total" | "paidAmount">,
  stage: ReminderStage,
  creatorName?: string,
): { subject: string; text: string };
