import assert from "node:assert/strict";
import {
  addDaysIso,
  amountInWords,
  computeInvoice,
  displayStatus,
  invoiceNumber,
  planReminder,
  reminderMessage,
} from "../lib/invoice.mjs";

assert.strictEqual(invoiceNumber(2026, 7), "INV-2026-0007");
assert.deepStrictEqual(computeInvoice([{ label: "2 Reels + 3 Stories", amount: 105000 }, { label: "", amount: 5 }], 18), {
  items: [{ label: "2 Reels + 3 Stories", amount: 105000 }],
  subtotal: 105000,
  gstRate: 18,
  gstAmount: 18900,
  total: 123900,
});
assert.strictEqual(amountInWords(123900), "One lakh twenty-three thousand nine hundred rupees only");
assert.strictEqual(amountInWords(25000000), "Two crore fifty lakh rupees only");
assert.strictEqual(amountInWords(0), "Zero rupees");
assert.strictEqual(addDaysIso("2026-10-30", 5), "2026-11-04");

const base = {
  number: "INV-2026-0001",
  brand: "Samsung",
  billToName: "Ananya Shah",
  billToEmail: "ananya@samsung.example",
  total: 105000,
  paidAmount: 0,
  status: "sent",
  dueOn: "2026-10-20",
  remindersSent: 0,
  lastReminderAt: null,
};
const at = (iso) => new Date(`${iso}T10:00:00+05:30`);

assert.strictEqual(planReminder(base, at("2026-10-10")), null);
assert.strictEqual(planReminder(base, at("2026-10-17")).stage, "before_due");
assert.strictEqual(planReminder({ ...base, remindersSent: 1 }, at("2026-10-18")), null);
assert.strictEqual(planReminder({ ...base, remindersSent: 1 }, at("2026-10-20")).stage, "due_today");
assert.strictEqual(planReminder({ ...base, remindersSent: 2 }, at("2026-10-28")).stage, "overdue_7");
assert.strictEqual(planReminder({ ...base, remindersSent: 3 }, at("2026-11-05")).stage, "overdue_14");
assert.strictEqual(planReminder({ ...base, remindersSent: 4 }, at("2026-11-20")), null);
assert.strictEqual(planReminder({ ...base, remindersSent: 0, lastReminderAt: "2026-10-27T10:00:00+05:30" }, at("2026-10-28")), null);
assert.strictEqual(planReminder({ ...base, status: "paid" }, at("2026-10-28")), null);
assert.strictEqual(planReminder({ ...base, paidAmount: 105000, status: "partially_paid" }, at("2026-10-28")), null);
assert.strictEqual(planReminder({ ...base, billToEmail: "" }, at("2026-10-28")), null);

assert.strictEqual(displayStatus(base, at("2026-10-21")), "overdue");
assert.strictEqual(displayStatus(base, at("2026-10-20")), "sent");
assert.strictEqual(displayStatus({ ...base, status: "paid" }, at("2026-12-01")), "paid");

const overdue = reminderMessage({ ...base, paidAmount: 52500 }, "overdue_7", "Riya");
assert.ok(overdue.subject.includes("overdue"));
assert.ok(overdue.text.includes("₹52,500"));
assert.ok(overdue.text.startsWith("Hi Ananya,"));
assert.ok(!overdue.text.includes("pay online"));
const withLink = reminderMessage(base, "due_today", "Riya", "https://rzp.io/i/abc");
assert.ok(withLink.text.includes("https://rzp.io/i/abc"));
assert.ok(withLink.text.trimEnd().endsWith("Riya"));

console.log("invoice ok");
