import assert from "node:assert/strict";
import {
  CONVERSATIONS,
  DEFAULT_RULES,
  extractDeal,
  buildAdvice,
  belowMinimum,
  suggestedMinimum,
  recommendedWaitDays,
  suggestedReply,
  formatINR,
  daysUntil,
} from "../lib/read-deal.mjs";

function byId(id) {
  const conversation = CONVERSATIONS.find((item) => item.id === id);
  assert.ok(conversation, id);
  return conversation;
}

const samsungConversation = byId("samsung-galaxy-ai");
const samsung = extractDeal(samsungConversation);
assert.strictEqual(samsung.isBrandOpportunity, true);
assert.strictEqual(samsung.brand, "Samsung");
assert.strictEqual(samsung.campaign, "Galaxy AI");
assert.strictEqual(samsung.offerAmount, 80000);
assert.strictEqual(samsung.offerApproximate, false);
assert.deepStrictEqual(samsung.deliverables, ["2 Reels", "3 Stories"]);
assert.strictEqual(samsung.deadline, "2026-10-18");
assert.strictEqual(samsung.usageRightsDays, 90);
assert.strictEqual(samsung.exclusivityDays, 30);
assert.strictEqual(samsung.payment, "50% advance");
assert.strictEqual(samsung.gaps.length, 0);

const samsungAdvice = buildAdvice(samsung, DEFAULT_RULES);
assert.strictEqual(samsungAdvice.extraDays, 60);
assert.strictEqual(samsungAdvice.blocks, 2);
assert.strictEqual(samsungAdvice.usageAmount, 25000);
assert.strictEqual(samsungAdvice.suggestedOffer, 105000);
assert.strictEqual(recommendedWaitDays(samsungConversation), 2);
assert.ok(suggestedReply(samsungConversation, samsung, samsungAdvice).includes("₹1,05,000"));
assert.strictEqual(formatINR(80000), "₹80,000");
assert.strictEqual(formatINR(25000), "₹25,000");

const withExclusivityFee = buildAdvice(samsung, {
  ...DEFAULT_RULES,
  exclusivityUpliftPer30Days: 20000,
});
assert.strictEqual(withExclusivityFee.exclusivityAmount, 20000);
assert.strictEqual(withExclusivityFee.suggestedOffer, 125000);

const boat = extractDeal(byId("boat-airdopes"));
assert.strictEqual(boat.isBrandOpportunity, true);
assert.strictEqual(boat.brand, "boAt");
assert.strictEqual(boat.campaign, "Airdopes");
assert.strictEqual(boat.offerAmount, 40000);
assert.strictEqual(boat.offerApproximate, true);
assert.deepStrictEqual(boat.deliverables, ["1 Reel"]);
assert.strictEqual(boat.deadline, "2026-10-10");
assert.strictEqual(boat.usageRightsDays, 60);
assert.strictEqual(boat.usageVia, "whitelisting");
assert.strictEqual(boat.exclusivityDays, 0);
assert.strictEqual(boat.payment, "Net 30 after going live");
assert.strictEqual(buildAdvice(boat, DEFAULT_RULES).usageAmount, 12500);

const nykaaConversation = byId("nykaa-pink-friday");
const nykaa = extractDeal(nykaaConversation);
assert.strictEqual(nykaa.isBrandOpportunity, true);
assert.strictEqual(nykaa.brand, "Nykaa");
assert.strictEqual(nykaa.campaign, "Pink Friday");
assert.strictEqual(nykaa.offerAmount, null);
assert.deepStrictEqual(nykaa.deliverables, ["1 Reel", "2 Stories"]);
assert.strictEqual(nykaa.usageRightsDays, 180);
assert.ok(nykaa.notes.some((note) => note.includes("180 days")));
assert.strictEqual(buildAdvice(nykaa, DEFAULT_RULES).usageAmount, 62500);
assert.strictEqual(buildAdvice(nykaa, DEFAULT_RULES).suggestedOffer, null);
assert.strictEqual(recommendedWaitDays(nykaaConversation), 1);
assert.ok(nykaa.gaps.includes("Offer"));
assert.ok(nykaa.gaps.includes("Payment"));
assert.strictEqual(belowMinimum(nykaa, 80000), false);
const unpriced = suggestedReply(nykaaConversation, nykaa, buildAdvice(nykaa, DEFAULT_RULES), {
  ...DEFAULT_RULES,
  minimumOffer: 80000,
});
assert.match(unpriced, /₹80,000/);
assert.match(unpriced, /budget/i);
assert.strictEqual(belowMinimum(samsung, 80000), false);
assert.strictEqual(suggestedMinimum(20000000), null);

const brightline = extractDeal(byId("brightline-winter-drop"));
assert.strictEqual(brightline.isBrandOpportunity, true);
assert.strictEqual(brightline.brand, null);
assert.strictEqual(brightline.campaign, "Winter Drop");
assert.strictEqual(brightline.offerAmount, 15000);
assert.strictEqual(brightline.usageRightsDays, 30);
assert.strictEqual(buildAdvice(brightline, DEFAULT_RULES).usageAmount, 0);
assert.ok(brightline.gaps.includes("Brand"));
assert.ok(brightline.gaps.includes("Payment"));
assert.strictEqual(belowMinimum(brightline, 80000), true);
assert.strictEqual(belowMinimum(brightline, 0), false);

const rahul = extractDeal(byId("rahul-personal"));
assert.strictEqual(rahul.isBrandOpportunity, false);
assert.match(rahul.detectionReason, /personal/i);

const newsletter = extractDeal(byId("newsletter-budgets"));
assert.strictEqual(newsletter.isBrandOpportunity, false);
assert.match(newsletter.detectionReason, /newsletter/i);

const todayInIndia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
if (todayInIndia === "2026-10-06") {
  assert.strictEqual(daysUntil("2026-10-18"), 12);
}

console.log("read-deals: all checks passed");
