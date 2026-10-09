import assert from "node:assert/strict";
import { buildAgreement, scanContract } from "../lib/contract.mjs";

const agreement = buildAgreement({
  creator: { name: "Riya Mehta", pan: "ABCDE1234F" },
  brand: { name: "Samsung", contactName: "Ananya Shah", email: "ananya@samsung.example" },
  deal: { campaign: "Galaxy AI", deliverables: ["2 Reels", "3 Stories"], fee: 105000, advancePercent: 50, usageDays: 90, exclusivityDays: 30, deadline: "2026-10-18" },
  date: "2026-10-06",
});
assert.ok(agreement.includes("Riya Mehta"));
assert.ok(agreement.includes("₹1,05,000"));
assert.ok(agreement.includes("for 90 days from the go-live date"));
assert.ok(agreement.includes("50% is payable as an advance"));
assert.ok(agreement.includes("18 October 2026"));
assert.ok(agreement.includes("Have a lawyer review it"));
assert.ok(buildAgreement({}).includes("There is no exclusivity"));

const harsh = `The Creator hereby assigns all right, title and interest in the Content to the Brand.
The Brand may use the Content in perpetuity across all media.
Payment will be made within 90 days of invoice, upon receipt of payment from the Client.
The Brand may terminate this agreement at any time without cause.
The Creator agrees to unlimited revisions.
The Creator shall indemnify and hold harmless the Brand.
The Creator will not promote competing products for 6 months of exclusivity.`;
const flags = scanContract(harsh, { maxExclusivityDays: 30 });
const ids = flags.map((flag) => flag.id);
for (const id of ["ownership", "perpetual", "pay-when-paid", "terminate-anytime", "unlimited-revisions", "indemnity", "slow-payment", "long-exclusivity"]) {
  assert.ok(ids.includes(id), `missing ${id}`);
}
assert.strictEqual(flags[0].severity, "high");
assert.ok(flags.find((flag) => flag.id === "perpetual").quote.includes("perpetuity"));
assert.strictEqual(flags.find((flag) => flag.id === "slow-payment").title, "Payment after 90 days");

const fair = `Fee is ₹50,000 with 50% advance. Balance payable within 15 days of going live.
Each party will indemnify the other for its own breach.
Either party may terminate at any time; a kill fee of 50% applies after production starts.
The Brand may run the content as paid partnership ads for 30 days.`;
assert.deepStrictEqual(scanContract(fair).map((flag) => flag.id), []);

console.log("contract ok");
