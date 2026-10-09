import { buildAdvice, formatINR, listGaps } from "./read-deal.mjs";

const DEFAULT_AUTOPILOT = {
  enabled: false,
  askBudget: true,
  askTerms: true,
  followUps: true,
  declineBlocked: true,
  counter: false,
  paymentReminders: true,
};

const DEFAULT_GUARDRAILS = {
  maxUsageDays: null,
  maxExclusivityDays: null,
  blockedCategories: [],
};

const CATEGORIES = [
  { id: "betting", label: "Betting and real-money gaming", words: ["betting", "sportsbook", "casino", "fantasy sports", "fantasy cricket", "rummy", "poker", "teen patti", "real money gaming", "real-money gaming", "satta", "1xbet", "parimatch", "dafabet"] },
  { id: "crypto", label: "Crypto and trading apps", words: ["crypto", "bitcoin", "nft", "web3", "forex", "trading app", "options trading", "binary options"] },
  { id: "alcohol", label: "Alcohol", words: ["whisky", "whiskey", "vodka", "beer", "wine", "rum", "liquor", "alcohol", "gin", "brewery"] },
  { id: "tobacco", label: "Tobacco and vapes", words: ["cigarette", "tobacco", "vape", "e-cigarette", "hookah", "pan masala", "gutka"] },
  { id: "fairness", label: "Skin-lightening and fairness", words: ["fairness cream", "skin whitening", "whitening cream", "skin lightening", "lightening cream", "fair skin"] },
  { id: "loans", label: "Instant loans and credit apps", words: ["instant loan", "loan app", "personal loan app", "quick cash", "buy now pay later", "bnpl"] },
  { id: "weightloss", label: "Weight-loss pills", words: ["weight loss pill", "weight-loss pill", "fat burner", "slimming pill", "detox tea", "appetite suppressant"] },
  { id: "political", label: "Political campaigns", words: ["political party", "election campaign", "vote for", "political campaign"] },
];

const ESSENTIAL_GAPS = ["Deliverables", "Usage rights", "Deadline", "Payment"];
const ACCEPTANCE = /\b(i accept|we accept|accepted|we have a deal|it'?s a deal|deal is on|confirmed|i confirm|locking it in|agreed|i agree)\b/i;
const INSTAGRAM_WINDOW_HOURS = 24;
const FOLLOW_UP_HOURS = 48;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectCategories(text) {
  const haystack = String(text || "").toLowerCase();
  return CATEGORIES.filter((category) =>
    category.words.some((word) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(word)}([^a-z0-9]|$)`, "i").test(haystack)),
  ).map((category) => category.id);
}

function categoryLabel(id) {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

function blobOf(conversation) {
  return `${conversation.subject || ""}\n${conversation.messages.map((message) => message.text).join("\n")}`;
}

function joinList(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function greeting(conversation) {
  const handle = conversation.fromHandle || "";
  if (conversation.source === "instagram" && /\.creators$/i.test(handle)) return "Hi there,";
  const first = (conversation.fromName || "").trim().split(/\s+/)[0];
  if (!first || first.includes("@") || /^(team|hello|hi|info|partnerships?)$/i.test(first)) return "Hi there,";
  return `Hi ${first},`;
}

function signOff(creatorName) {
  return creatorName ? `\n\nThanks,\n${creatorName}` : "\n\nThanks!";
}

function trailingMine(conversation) {
  let count = 0;
  for (let i = conversation.messages.length - 1; i >= 0; i -= 1) {
    if (conversation.messages[i].from !== "you") break;
    count += 1;
  }
  return count;
}

function hoursSince(iso, now) {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return Infinity;
  return (now.getTime() - at) / 3600000;
}

function lastFromThem(conversation) {
  return [...conversation.messages].reverse().find((message) => message.from === "them") ?? null;
}

function scopeOf(extraction) {
  return extraction.deliverables.join(" + ") || "this";
}

function askFor(gaps) {
  return gaps.map((gap) => (gap === "Payment" ? "payment terms" : gap.toLowerCase()));
}

function guardrailsOf(rules) {
  return { ...DEFAULT_GUARDRAILS, ...rules };
}

// Works out what the counter should be: the usage uplift from the rate rules,
// usage and exclusivity capped at the creator's limits, and never below the minimum.
function counterFor(extraction, rules) {
  const guard = guardrailsOf(rules);
  const usageCapped = guard.maxUsageDays != null && extraction.usageRightsDays != null && extraction.usageRightsDays > guard.maxUsageDays;
  const exclusivityCapped = guard.maxExclusivityDays != null && extraction.exclusivityDays != null && extraction.exclusivityDays > guard.maxExclusivityDays;
  const terms = {
    ...extraction,
    usageRightsDays: usageCapped ? guard.maxUsageDays : extraction.usageRightsDays,
    exclusivityDays: exclusivityCapped ? guard.maxExclusivityDays : extraction.exclusivityDays,
  };
  const advice = buildAdvice(terms, guard);
  const minimum = Number(guard.minimumOffer) || 0;
  const priced = advice.suggestedOffer ?? 0;
  const target = extraction.offerAmount == null ? null : Math.max(minimum, priced);
  return {
    target,
    usageDays: terms.usageRightsDays,
    exclusivityDays: terms.exclusivityDays,
    usageCapped,
    exclusivityCapped,
    belowMinimum: extraction.offerAmount != null && minimum > 0 && priced < minimum,
    advice,
  };
}

function action(kind, fields) {
  return {
    kind,
    title: "",
    reason: "",
    text: null,
    amount: null,
    autopilotKey: null,
    needsYou: false,
    ...fields,
  };
}

function planDeal({ conversation, extraction, rules, category = null, status = "open", creatorName = "", now = new Date() }) {
  if (!extraction?.isBrandOpportunity) return null;
  if (status === "won" || status === "lost") {
    return action("closed", { title: status === "won" ? "Won" : "Closed", reason: status === "won" ? "You marked this deal won." : "You marked this deal lost." });
  }

  const guard = guardrailsOf(rules);
  const hello = greeting(conversation);
  const bye = signOff(creatorName);
  const categories = category ? [category] : detectCategories(blobOf(conversation));
  const blocked = categories.find((id) => guard.blockedCategories.includes(id));

  if (blocked) {
    const label = categoryLabel(blocked);
    return action("decline_blocked", {
      title: "Decline: blocked category",
      reason: `${label} is on your blocked list.`,
      text: `${hello}\n\nThank you for thinking of me. I don't take on ${label.toLowerCase()} partnerships, so I'll pass on this one. Wishing the campaign all the best.${bye}`,
      autopilotKey: "declineBlocked",
    });
  }

  const last = conversation.messages[conversation.messages.length - 1];
  if (last?.from === "you") {
    const quietFor = hoursSince(last.at, now);
    if (trailingMine(conversation) >= 2) {
      return action("waiting", { title: "Gone quiet", reason: "You already followed up once. The agent stops nudging here.", needsYou: false });
    }
    if (quietFor >= FOLLOW_UP_HOURS) {
      const about = extraction.campaign || extraction.brand || "the collaboration";
      return action("follow_up", {
        title: "Follow up",
        reason: `No reply for ${Math.floor(quietFor / 24)} days.`,
        text: `${hello}\n\nJust checking in on my last note about ${about}. Happy to answer anything that helps you move ahead.${bye}`,
        autopilotKey: "followUps",
      });
    }
    return action("waiting", { title: "Waiting on them", reason: "You replied last. A follow-up is drafted after 2 days of silence." });
  }

  const gaps = listGaps(extraction).filter((gap) => ESSENTIAL_GAPS.includes(gap));
  const scope = scopeOf(extraction);
  const minimum = Number(guard.minimumOffer) || 0;

  if (extraction.offerAmount == null) {
    const lines = [hello, "", `Thanks for reaching out about ${extraction.campaign || extraction.brand || "this"}. Could you share the budget for ${scope}?`];
    if (minimum > 0) lines.push(`For reference, my fee for this kind of work starts at ${formatINR(minimum)}.`);
    const rest = askFor(gaps);
    if (rest.length) lines.push(`It would also help to know the ${joinList(rest)}.`);
    return action("ask_budget", {
      title: "Ask for the budget",
      reason: "No fee was stated.",
      text: `${lines.join("\n")}${bye}`,
      autopilotKey: "askBudget",
    });
  }

  const counter = counterFor(extraction, guard);
  if (counter.target != null && (counter.target > extraction.offerAmount || counter.usageCapped || counter.exclusivityCapped)) {
    const usageClause = counter.usageDays != null ? ` with ${counter.usageDays}-day usage rights` : "";
    const lines = [hello, "", `Thanks for sending this over. For ${scope}${usageClause}, my fee would be ${formatINR(counter.target)}.`];
    if (counter.usageCapped) lines.push(`I license usage for up to ${counter.usageDays} days. A longer window can be priced separately.`);
    if (counter.exclusivityCapped) lines.push(`I can offer category exclusivity for up to ${counter.exclusivityDays} days.`);
    if (gaps.length) lines.push(`Could you also confirm the ${joinList(askFor(gaps))}?`);
    lines.push("", "Happy to move ahead once this works on your side.");
    const why = [];
    if (counter.advice.usageAmount > 0) why.push(`usage adds ${formatINR(counter.advice.usageAmount)}`);
    if (counter.advice.exclusivityAmount > 0) why.push(`exclusivity adds ${formatINR(counter.advice.exclusivityAmount)}`);
    if (counter.belowMinimum) why.push(`your minimum is ${formatINR(minimum)}`);
    if (counter.usageCapped) why.push(`usage capped at ${counter.usageDays} days`);
    if (counter.exclusivityCapped) why.push(`exclusivity capped at ${counter.exclusivityDays} days`);
    return action("counter", {
      title: `Counter at ${formatINR(counter.target)}`,
      reason: why.length ? `${formatINR(extraction.offerAmount)} offered; ${joinList(why)}.` : `${formatINR(extraction.offerAmount)} offered.`,
      text: `${lines.join("\n")}${bye}`,
      amount: counter.target,
      autopilotKey: "counter",
    });
  }

  if (gaps.length) {
    return action("ask_terms", {
      title: "Ask for missing terms",
      reason: `The brief does not state the ${joinList(askFor(gaps))}.`,
      text: `${hello}\n\nThanks for the details. Before I confirm, could you share the ${joinList(askFor(gaps))}?${bye}`,
      amount: extraction.offerAmount,
      autopilotKey: "askTerms",
    });
  }

  const usage = extraction.usageRightsDays != null ? `, ${extraction.usageRightsDays}-day usage` : "";
  const payment = extraction.payment ? `, ${extraction.payment}` : "";
  return action("ready_for_yes", {
    title: "Ready for your yes",
    reason: "The offer meets your rate and every term is stated. Only you can accept.",
    text: `${hello}\n\nThis works for me: ${scope} at ${formatINR(extraction.offerAmount)}${usage}${payment}. Please send the agreement and I'll review it.${bye}`,
    amount: extraction.offerAmount,
    needsYou: true,
  });
}

// The hard rules. Nothing here can be switched off from settings.
function canAutoSend(planned, autopilot, context = {}) {
  const pilot = { ...DEFAULT_AUTOPILOT, ...autopilot };
  const now = context.now ?? new Date();
  if (!planned || !planned.text) return { ok: false, reason: "Nothing to send." };
  if (planned.kind === "ready_for_yes" || planned.kind === "closed" || planned.kind === "waiting") {
    return { ok: false, reason: planned.kind === "ready_for_yes" ? "Only you can accept a deal." : "Nothing to send." };
  }
  if (ACCEPTANCE.test(planned.text)) return { ok: false, reason: "The message reads like an acceptance. Only you can accept." };
  if (!pilot.enabled) return { ok: false, reason: "Autopilot is off." };
  if (!planned.autopilotKey || !pilot[planned.autopilotKey]) return { ok: false, reason: "This kind of message needs your approval." };
  if (planned.kind === "counter") {
    const minimum = Number(context.minimumOffer) || 0;
    if (planned.amount == null || planned.amount < minimum) return { ok: false, reason: "A counter can never go below your minimum." };
  }
  if (context.source === "instagram") {
    const them = context.lastThemAt ? hoursSince(context.lastThemAt, now) : Infinity;
    if (them > INSTAGRAM_WINDOW_HOURS) return { ok: false, reason: "Instagram only allows replies within 24 hours of their last message." };
  }
  return { ok: true, reason: "" };
}

export {
  CATEGORIES,
  DEFAULT_AUTOPILOT,
  DEFAULT_GUARDRAILS,
  INSTAGRAM_WINDOW_HOURS,
  detectCategories,
  categoryLabel,
  counterFor,
  planDeal,
  canAutoSend,
  lastFromThem,
};
