import { formatINR } from "./read-deal.mjs";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istToday(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function dayDiff(fromIso, toIso) {
  const from = Date.UTC(...fromIso.split("-").map((part, index) => (index === 1 ? Number(part) - 1 : Number(part))));
  const to = Date.UTC(...toIso.split("-").map((part, index) => (index === 1 ? Number(part) - 1 : Number(part))));
  return Math.round((to - from) / 86400000);
}

function addDaysIso(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function invoiceNumber(year, sequence) {
  return `INV-${year}-${String(sequence).padStart(4, "0")}`;
}

function computeInvoice(items, gstRate = 0) {
  const lines = (Array.isArray(items) ? items : [])
    .map((item) => ({ label: String(item?.label || "").trim(), amount: Math.round(Number(item?.amount) || 0) }))
    .filter((item) => item.label && item.amount > 0);
  const subtotal = lines.reduce((sum, item) => sum + item.amount, 0);
  const rate = Math.min(28, Math.max(0, Number(gstRate) || 0));
  const gstAmount = Math.round((subtotal * rate) / 100);
  return { items: lines, subtotal, gstRate: rate, gstAmount, total: subtotal + gstAmount };
}

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function belowHundred(n) {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`;
}

function belowThousand(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

// Indian numbering: crore, lakh, thousand.
function amountInWords(amount) {
  let n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return "Zero rupees";
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} thousand`);
  if (n) parts.push(belowThousand(n));
  const words = parts.join(" ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} rupees only`;
}

function balanceOf(invoice) {
  return Math.max(0, (Number(invoice.total) || 0) - (Number(invoice.paidAmount) || 0));
}

function displayStatus(invoice, now = new Date()) {
  if (invoice.status === "paid" || invoice.status === "void" || invoice.status === "draft") return invoice.status;
  if (invoice.dueOn && dayDiff(istToday(now), invoice.dueOn) < 0) return "overdue";
  return invoice.status;
}

// Reminder stages, by days relative to the due date. Each stage is sent once.
const STAGES = [
  { stage: "before_due", offset: -3, tone: "friendly" },
  { stage: "due_today", offset: 0, tone: "friendly" },
  { stage: "overdue_7", offset: 7, tone: "firm" },
  { stage: "overdue_14", offset: 14, tone: "final" },
];

function planReminder(invoice, now = new Date()) {
  if (invoice.status !== "sent" && invoice.status !== "partially_paid") return null;
  if (!invoice.dueOn || !invoice.billToEmail) return null;
  if (balanceOf(invoice) <= 0) return null;
  const today = istToday(now);
  const sent = Number(invoice.remindersSent) || 0;
  if (invoice.lastReminderAt) {
    const hours = (now.getTime() - new Date(invoice.lastReminderAt).getTime()) / 3600000;
    if (hours < 48) return null;
  }
  const relative = dayDiff(invoice.dueOn, today);
  let due = null;
  for (let index = STAGES.length - 1; index >= 0; index -= 1) {
    if (relative >= STAGES[index].offset) {
      due = { ...STAGES[index], index };
      break;
    }
  }
  if (!due || due.index < sent) return null;
  return due;
}

function reminderMessage(invoice, stage, creatorName = "", payUrl = null) {
  const balance = formatINR(balanceOf(invoice));
  const name = invoice.billToName ? invoice.billToName.split(/\s+/)[0] : "there";
  const ref = `${invoice.number}${invoice.brand ? ` for ${invoice.brand}` : ""}`;
  const due = invoice.dueOn;
  const bye = creatorName ? `\n\nThanks,\n${creatorName}` : "\n\nThanks!";
  const subjects = {
    before_due: `Invoice ${invoice.number} is due on ${due}`,
    due_today: `Invoice ${invoice.number} is due today`,
    overdue_7: `Invoice ${invoice.number} is overdue`,
    overdue_14: `Second reminder: invoice ${invoice.number} is overdue`,
  };
  const bodies = {
    before_due: `Hi ${name},\n\nA quick heads-up that invoice ${ref} (${balance}) is due on ${due}. Let me know if you need anything from my side to process it.`,
    due_today: `Hi ${name},\n\nInvoice ${ref} (${balance}) is due today. Could you confirm when the payment will be processed?`,
    overdue_7: `Hi ${name},\n\nInvoice ${ref} (${balance}) was due on ${due} and is now a week overdue. Could you share the expected payment date?`,
    overdue_14: `Hi ${name},\n\nInvoice ${ref} (${balance}) was due on ${due} and is now two weeks overdue. Please process it this week, or tell me who I should follow up with in your accounts team.`,
  };
  const pay = payUrl ? `\n\nYou can pay online by UPI, card, or netbanking here: ${payUrl}` : "";
  return { subject: subjects[stage], text: `${bodies[stage]}${pay}${bye}` };
}

export {
  STAGES,
  istToday,
  dayDiff,
  addDaysIso,
  invoiceNumber,
  computeInvoice,
  amountInWords,
  balanceOf,
  displayStatus,
  planReminder,
  reminderMessage,
};
