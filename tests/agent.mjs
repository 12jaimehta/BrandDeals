import assert from "node:assert/strict";
import { CONVERSATIONS, DEFAULT_RULES, extractDeal } from "../lib/read-deal.mjs";
import { DEFAULT_AUTOPILOT, canAutoSend, detectCategories, planDeal } from "../lib/agent.mjs";

const NOW = new Date("2026-10-06T12:00:00+05:30");
const rules = { ...DEFAULT_RULES, maxUsageDays: null, maxExclusivityDays: null, blockedCategories: [] };
const pilotOn = { ...DEFAULT_AUTOPILOT, enabled: true };

function byId(id) {
  const conversation = CONVERSATIONS.find((item) => item.id === id);
  assert.ok(conversation, id);
  return conversation;
}

function plan(conversation, overrides = {}) {
  return planDeal({ conversation, extraction: extractDeal(conversation), rules: { ...rules, ...overrides }, now: NOW, creatorName: "Riya" });
}

// Samsung asks for 90 days of usage on ₹80,000: counter at ₹1,05,000.
const samsung = byId("samsung-galaxy-ai");
const counter = plan(samsung);
assert.strictEqual(counter.kind, "counter");
assert.strictEqual(counter.amount, 105000);
assert.ok(counter.text.includes("₹1,05,000"));
assert.ok(counter.text.includes("Hi Ananya,"));
assert.ok(counter.text.endsWith("Riya"));

// Counters only go out on autopilot when the creator allows it.
assert.strictEqual(canAutoSend(counter, pilotOn, { source: "gmail", minimumOffer: 0, now: NOW }).ok, false);
assert.strictEqual(canAutoSend(counter, { ...pilotOn, counter: true }, { source: "gmail", minimumOffer: 0, now: NOW }).ok, true);
assert.strictEqual(canAutoSend(counter, { ...pilotOn, counter: true }, { source: "gmail", minimumOffer: 200000, now: NOW }).ok, false);

// Usage cap: the counter offers the capped window instead.
const capped = plan(samsung, { maxUsageDays: 60 });
assert.strictEqual(capped.kind, "counter");
assert.strictEqual(capped.amount, 92500);
assert.ok(capped.text.includes("up to 60 days"));

// Minimum: an offer under the floor is countered at the floor.
const brightline = byId("brightline-winter-drop");
const floor = plan(brightline, { minimumOffer: 25000 });
assert.strictEqual(floor.kind, "counter");
assert.strictEqual(floor.amount, 25000);

// No fee stated: ask for the budget and name the minimum.
const nykaa = byId("nykaa-pink-friday");
const budget = plan(nykaa, { minimumOffer: 40000 });
assert.strictEqual(budget.kind, "ask_budget");
assert.ok(budget.text.includes("₹40,000"));
assert.ok(budget.text.includes("Hi there,"));
assert.strictEqual(canAutoSend(budget, pilotOn, { source: "instagram", lastThemAt: "2026-10-06T08:00:00+05:30", now: NOW }).ok, true);
assert.match(canAutoSend(budget, pilotOn, { source: "instagram", lastThemAt: "2026-10-04T08:00:00+05:30", now: NOW }).reason, /24 hours/);
assert.strictEqual(canAutoSend(budget, DEFAULT_AUTOPILOT, { source: "gmail", now: NOW }).ok, false);

// Every term stated and at rate: ready for the creator's yes, never automatic.
const complete = {
  ...brightline,
  messages: [{ from: "them", at: "2026-10-05T10:00:00+05:30", text: "1 Reel. The fee is ₹15,000. We need usage rights for 30 days. No exclusivity. 100% advance. Please post on or before 2 November." }],
};
const ready = plan(complete);
assert.strictEqual(ready.kind, "ready_for_yes");
assert.strictEqual(ready.needsYou, true);
const everything = Object.fromEntries(Object.keys(DEFAULT_AUTOPILOT).map((key) => [key, true]));
assert.strictEqual(canAutoSend(ready, everything, { source: "gmail", now: NOW }).ok, false);
assert.match(canAutoSend(ready, everything, { source: "gmail", now: NOW }).reason, /Only you can accept/);

// Anything that reads like an acceptance is blocked, whatever its kind.
assert.strictEqual(canAutoSend({ ...counter, text: "Agreed, let's do it." }, everything, { source: "gmail", now: NOW }).ok, false);

// Missing terms with a fee at rate: ask for them.
const missing = {
  ...brightline,
  messages: [{ from: "them", at: "2026-10-05T10:00:00+05:30", text: "Paid collab: 1 Reel, the fee is ₹15,000." }],
};
const terms = plan(missing);
assert.strictEqual(terms.kind, "ask_terms");
assert.ok(terms.text.includes("usage rights"));

// Blocked category: decline.
assert.deepStrictEqual(detectCategories("Launch of our new fantasy cricket app"), ["betting"]);
assert.deepStrictEqual(detectCategories("Ginger tea and rummy nights"), ["betting"]);
assert.deepStrictEqual(detectCategories("A token of thanks from our skincare team"), []);
const betting = {
  ...brightline,
  messages: [{ from: "them", at: "2026-10-05T10:00:00+05:30", text: "Paid collab for our fantasy cricket app. 1 Reel, fee ₹50,000." }],
};
const decline = plan(betting, { blockedCategories: ["betting"] });
assert.strictEqual(decline.kind, "decline_blocked");
assert.strictEqual(canAutoSend(decline, pilotOn, { source: "gmail", now: NOW }).ok, true);

// Follow-ups: one nudge after 2 quiet days, then the agent stops.
const repliedLongAgo = { ...samsung, messages: [...samsung.messages, { from: "you", at: "2026-10-03T10:00:00+05:30", text: "My fee would be ₹1,05,000." }] };
assert.strictEqual(plan(repliedLongAgo).kind, "follow_up");
const repliedToday = { ...samsung, messages: [...samsung.messages, { from: "you", at: "2026-10-06T10:00:00+05:30", text: "My fee would be ₹1,05,000." }] };
assert.strictEqual(plan(repliedToday).kind, "waiting");
const nudged = { ...repliedLongAgo, messages: [...repliedLongAgo.messages, { from: "you", at: "2026-10-04T10:00:00+05:30", text: "Just checking in." }] };
assert.strictEqual(plan(nudged).kind, "waiting");

// Closed deals and non-deals.
assert.strictEqual(planDeal({ conversation: samsung, extraction: extractDeal(samsung), rules, status: "won", now: NOW }).kind, "closed");
assert.strictEqual(plan(byId("newsletter-budgets")), null);

console.log("agent ok");
