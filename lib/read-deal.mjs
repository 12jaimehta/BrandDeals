"use strict";

const DEFAULT_RULES = {
  usageIncludedDays: 30,
  usageUpliftPer30Days: 12500,
  exclusivityUpliftPer30Days: 0,
  minimumOffer: 0,
};

const STORAGE_RULES = "brand-deal-inbox:rules";
const STORAGE_ACTIONS = "brand-deal-inbox:actions";

const CONVERSATIONS = [
  {
    id: "samsung-galaxy-ai",
    source: "gmail",
    fromName: "Ananya Shah",
    fromHandle: "ananya.shah@samsung.example",
    subject: "Galaxy AI | Creator partnership | Oct",
    receivedAt: "2026-10-05T11:00:00+05:30",
    messages: [
      {
        from: "them",
        at: "2026-10-05T11:00:00+05:30",
        text: "Hi,\n\nWe would love to have you on the Galaxy AI launch. The scope is 2 Reels and 3 Stories. The fee is ₹80,000, with 50% advance on signing and the rest when it goes live.\n\nWe need usage rights for 90 days across paid and organic channels, and category exclusivity for 30 days.\n\nThe live date needs to be on or before 18 October.\n\nAnanya\nSamsung Partnerships",
      },
    ],
  },
  {
    id: "nykaa-pink-friday",
    source: "instagram",
    fromName: "Nykaa Creators",
    fromHandle: "nykaa.creators",
    subject: "",
    receivedAt: "2026-10-05T08:10:00+05:30",
    messages: [
      {
        from: "them",
        at: "2026-10-05T08:10:00+05:30",
        text: "Hey! Would you be open to a Nykaa Pink Friday collab? We are thinking 1 Reel + 2 Stories.",
      },
      {
        from: "them",
        at: "2026-10-05T08:14:00+05:30",
        text: "We usually need 6 months usage. I will confirm the budget tomorrow.",
      },
    ],
  },
  {
    id: "brightline-winter-drop",
    source: "gmail",
    fromName: "Priya at Brightline",
    fromHandle: "priya@brightline.example",
    subject: "Winter Drop | Partnership",
    receivedAt: "2026-10-04T16:20:00+05:30",
    messages: [
      {
        from: "them",
        at: "2026-10-04T16:20:00+05:30",
        text: "Hi,\n\nOur client wants to launch Winter Drop with you. The scope is 1 Reel. The fee is ₹15,000.\n\nWe need usage rights for 30 days. Please post on or before 2 November.\n\nPriya\nBrightline",
      },
    ],
  },
  {
    id: "boat-airdopes",
    source: "gmail",
    fromName: "Rohan at Tribe",
    fromHandle: "rohan@tribe.example",
    subject: "Paid collab — boAt Airdopes campaign",
    receivedAt: "2026-10-03T13:05:00+05:30",
    messages: [
      {
        from: "them",
        at: "2026-10-03T13:05:00+05:30",
        text: "Hey,\n\nboAt wants 1 Reel for the new Airdopes. Budget is around 40k. We need it posted by 10 Oct.\n\nThey want whitelisting for 60 days. No exclusivity. Payment after the reel goes live, net 30.\n\nRohan\nTribe",
      },
    ],
  },
  {
    id: "newsletter-budgets",
    source: "gmail",
    fromName: "Creator Economy Weekly",
    fromHandle: "news@creatorweekly.example",
    subject: "5 brands increasing budgets this quarter",
    receivedAt: "2026-10-02T07:30:00+05:30",
    messages: [
      {
        from: "them",
        at: "2026-10-02T07:30:00+05:30",
        text: "This week in creator budgets: five brands said they will spend more before the festive season.\n\nYou are on the digest list. Unsubscribe anytime.",
      },
    ],
  },
  {
    id: "rahul-personal",
    source: "instagram",
    fromName: "Rahul",
    fromHandle: "rahul.clicks",
    subject: "",
    receivedAt: "2026-10-01T19:40:00+05:30",
    messages: [
      {
        from: "them",
        at: "2026-10-01T19:40:00+05:30",
        text: "Bro the samsung thing sounds sick, send me the brief if you take it",
      },
    ],
  },
];

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const STOP_BRANDS = new Set(["We", "They", "I", "Please", "The", "Our", "This", "Hey"]);

function blobOf(conversation) {
  return `${conversation.subject || ""}\n${conversation.messages.map((message) => message.text).join("\n")}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(token) {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function joinList(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function formatINR(amount) {
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
  return `₹${formatted}`;
}

const IST = "Asia/Kolkata";

function pad(value) {
  return String(value).padStart(2, "0");
}

function zonedParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function istMidnight(year, month, day) {
  return Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000;
}

function parseInstant(value) {
  const raw = String(value);
  if (raw.length === 10) {
    const [year, month, day] = raw.split("-").map(Number);
    return new Date(istMidnight(year, month, day) + 12 * 60 * 60 * 1000);
  }
  return new Date(raw);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: IST,
  }).format(parseInstant(value));
}

function formatWhen(value) {
  const date = parseInstant(value);
  const day = formatDate(value);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: IST,
  }).format(date);
  return `${day} · ${time}`;
}

function daysUntil(iso) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  const target = istMidnight(year, month, day);
  const todayParts = zonedParts(new Date());
  const today = istMidnight(todayParts.year, todayParts.month, todayParts.day);
  return Math.round((target - today) / 86400000);
}

function addDays(count) {
  const today = zonedParts(new Date());
  return new Date(istMidnight(today.year, today.month, today.day) + count * 86400000);
}

function toISODate(date) {
  const parts = zonedParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function yearFrom(receivedAt) {
  const year = Number(String(receivedAt).slice(0, 4));
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

function detectBrand(conversation, text) {
  const signature = text.match(/^([A-Z][A-Za-z0-9&]+)\s+Partnerships\b/m);
  if (signature && !STOP_BRANDS.has(signature[1])) return signature[1];

  const wants = text.match(/\b([A-Za-z0-9]*[A-Z][A-Za-z0-9]*)\s+wants\b/);
  if (wants && !STOP_BRANDS.has(wants[1])) return wants[1];

  if (conversation.source === "instagram") {
    const handle = (conversation.fromHandle || "").toLowerCase();
    const creators = handle.match(/^([a-z0-9_]+)\.creators$/);
    if (creators) return capitalize(creators[1]);
  }

  return null;
}

function stripBrand(value, brand) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!brand) return trimmed;
  const next = trimmed
    .replace(new RegExp(`\\b${escapeRegExp(brand)}\\b`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
  return next || trimmed;
}

function detectCampaign(conversation, brand) {
  const subject = conversation.subject || "";
  if (subject.includes("|")) {
    const first = subject.split("|")[0].trim();
    if (first && !/^(paid collab|collab|partnership|creator partnership)$/i.test(first)) {
      return stripBrand(first, brand);
    }
  }
  const dashed = subject.match(/[—–-]\s*(.+?)\s+campaign\b/i);
  if (dashed) return stripBrand(dashed[1].trim(), brand);
  const collab = blobOf(conversation).match(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,4})\s+collab\b/);
  if (collab) return stripBrand(collab[1].trim(), brand);
  return null;
}

function detectOffer(text) {
  const rupee = text.match(/₹\s?(\d{1,3}(?:,\d{2,3})+|\d+)/);
  if (rupee) {
    const around = text.slice(Math.max(0, rupee.index - 16), rupee.index);
    return {
      amount: Number(rupee[1].replace(/,/g, "")),
      approximate: /around|about|approx/i.test(around),
    };
  }
  const thousands = text.match(/(?:budget|fee|offer)[^.\n]{0,40}?(\d+)\s*k\b/i);
  if (thousands) {
    return {
      amount: Number(thousands[1]) * 1000,
      approximate: /around|about|approx/i.test(thousands[0]),
    };
  }
  return { amount: null, approximate: false };
}

function detectDeliverables(text) {
  const deliverables = [];
  const reels = text.match(/\b(\d+)\s+reels?\b/i);
  const stories = text.match(/\b(\d+)\s+stor(?:y|ies)\b/i);
  const posts = text.match(/\b(\d+)\s+posts?\b/i);
  if (reels) deliverables.push(countLabel(Number(reels[1]), "Reel", "Reels"));
  if (stories) deliverables.push(countLabel(Number(stories[1]), "Story", "Stories"));
  if (posts) deliverables.push(countLabel(Number(posts[1]), "Post", "Posts"));
  return deliverables;
}

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function detectDeadline(text, receivedAt) {
  const monthPattern = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
  const match = text.match(new RegExp(`\\b(?:on or before|before|by|on)\\s+(\\d{1,2})\\s+(${monthPattern})\\b`, "i"));
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  if (!month || day < 1 || day > 31) return null;
  return `${yearFrom(receivedAt)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function detectUsage(text) {
  const rights = text.match(/usage rights for\s+(\d+)\s+days/i);
  if (rights) return { days: Number(rights[1]), via: "usage rights", note: null };
  const whitelisting = text.match(/whitelisting for\s+(\d+)\s+days/i);
  if (whitelisting) {
    const days = Number(whitelisting[1]);
    return {
      days,
      via: "whitelisting",
      note: `They said whitelisting for ${days} days. Counted here as usage rights.`,
    };
  }
  const months = text.match(/(\d+)\s+months?\s+usage/i);
  if (months) {
    const count = Number(months[1]);
    const days = count * 30;
    return {
      days,
      via: "usage rights",
      note: `${count} months was counted as ${days} days.`,
    };
  }
  return { days: null, via: null, note: null };
}

function detectExclusivity(text) {
  if (/no exclusivity/i.test(text)) return 0;
  const match = text.match(/exclusivity for\s+(\d+)\s+days/i);
  return match ? Number(match[1]) : null;
}

function detectPayment(text) {
  if (/50%\s*advance/i.test(text)) return "50% advance";
  if (/100%\s*advance/i.test(text)) return "100% advance";
  if (/net\s*30/i.test(text) && /after the reel goes live/i.test(text)) return "Net 30 after going live";
  if (/net\s*30/i.test(text)) return "Net 30";
  return null;
}

function listGaps(extraction) {
  const gaps = [];
  if (!extraction.brand) gaps.push("Brand");
  if (!extraction.campaign) gaps.push("Campaign");
  if (extraction.offerAmount == null) gaps.push("Offer");
  if (!extraction.deliverables.length) gaps.push("Deliverables");
  if (!extraction.deadline) gaps.push("Deadline");
  if (extraction.usageRightsDays == null) gaps.push("Usage rights");
  if (extraction.exclusivityDays == null) gaps.push("Exclusivity");
  if (!extraction.payment) gaps.push("Payment");
  return gaps;
}

function extractDeal(conversation) {
  const text = blobOf(conversation);
  const newsletter = /unsubscribe|digest|this week in/i.test(text);
  const offer = detectOffer(text);
  const deliverables = detectDeliverables(text);
  const deadline = detectDeadline(text, conversation.receivedAt);
  const usage = detectUsage(text);
  const exclusivityDays = detectExclusivity(text);
  const payment = detectPayment(text);
  const hasCollab = /collab|partnership|campaign/i.test(text);
  const hasFee = offer.amount != null;
  const hasDeliverables = deliverables.length > 0;
  const hasUsage = usage.days != null;
  const hasDeadline = Boolean(deadline);

  let score = 0;
  if (hasCollab) score += 2;
  if (hasFee) score += 2;
  if (hasDeliverables) score += 1;
  if (hasUsage) score += 1;
  if (hasDeadline) score += 1;
  if (newsletter) score -= 5;

  const isBrandOpportunity = score >= 3 && !newsletter;
  const bits = [];
  if (hasFee) bits.push("a fee");
  if (hasDeliverables) bits.push("deliverables");
  if (hasUsage) bits.push("usage rights");
  if (hasDeadline) bits.push("a deadline");

  let detectionReason = "This reads as a personal message.";
  if (newsletter) detectionReason = "This reads as a newsletter.";
  else if (isBrandOpportunity && bits.length) detectionReason = `The message states ${joinList(bits)}.`;
  else if (isBrandOpportunity) detectionReason = "The message asks for a collaboration.";

  const brand = isBrandOpportunity ? detectBrand(conversation, text) : detectBrand(conversation, text);
  const notes = [];
  if (usage.note) notes.push(usage.note);
  if (offer.approximate) notes.push("The fee was phrased as approximate.");

  const extraction = {
    isBrandOpportunity,
    detectionReason,
    brand: isBrandOpportunity ? brand : null,
    campaign: isBrandOpportunity ? detectCampaign(conversation, brand) : null,
    offerAmount: isBrandOpportunity ? offer.amount : null,
    offerApproximate: Boolean(offer.approximate && isBrandOpportunity),
    deliverables: isBrandOpportunity ? deliverables : [],
    deadline: isBrandOpportunity ? deadline : null,
    usageRightsDays: isBrandOpportunity ? usage.days : null,
    usageVia: isBrandOpportunity ? usage.via : null,
    exclusivityDays: isBrandOpportunity ? exclusivityDays : null,
    payment: isBrandOpportunity ? payment : null,
    notes: isBrandOpportunity ? notes : [],
    gaps: [],
  };
  extraction.gaps = isBrandOpportunity ? listGaps(extraction) : [];
  return extraction;
}

function usageBlocks(askedDays, includedDays) {
  if (askedDays == null) return { extraDays: 0, blocks: 0 };
  const extraDays = Math.max(0, askedDays - includedDays);
  const blocks = extraDays === 0 ? 0 : Math.ceil(extraDays / 30);
  return { extraDays, blocks };
}

function buildAdvice(extraction, rules) {
  const { extraDays, blocks } = usageBlocks(extraction.usageRightsDays, rules.usageIncludedDays);
  const usageAmount = blocks * rules.usageUpliftPer30Days;
  const exclusivityBlocks = extraction.exclusivityDays ? Math.ceil(extraction.exclusivityDays / 30) : 0;
  const exclusivityAmount = exclusivityBlocks * rules.exclusivityUpliftPer30Days;
  const suggestedOffer = extraction.offerAmount == null
    ? null
    : extraction.offerAmount + usageAmount + exclusivityAmount;
  return { extraDays, blocks, usageAmount, exclusivityBlocks, exclusivityAmount, suggestedOffer };
}

function recommendedWaitDays(conversation) {
  const last = conversation.messages[conversation.messages.length - 1];
  if (last && /\btomorrow\b/i.test(last.text)) return 1;
  return 2;
}

function greetingName(conversation) {
  if (conversation.source === "instagram" && /\.creators$/i.test(conversation.fromHandle || "")) return "there";
  const first = (conversation.fromName || "").split(" ")[0];
  return first || "there";
}

function belowMinimum(extraction, minimumOffer) {
  const minimum = Number(minimumOffer) || 0;
  if (!extraction.isBrandOpportunity || minimum <= 0) return false;
  if (extraction.offerAmount == null) return false;
  return extraction.offerAmount < minimum;
}

function suggestedMinimum(followers) {
  const count = Number(followers);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count >= 10000000) return 500000;
  if (count >= 1000000) return 150000;
  if (count >= 100000) return 40000;
  if (count >= 20000) return 15000;
  return 5000;
}

function suggestedReply(conversation, extraction, advice, rules = DEFAULT_RULES) {
  const deliverables = extraction.deliverables.join(" + ");
  const scope = deliverables || "this";
  const minimum = Number(rules.minimumOffer) || 0;
  const lines = [`Hi ${greetingName(conversation)},`, ""];
  if (advice.usageAmount > 0 && advice.suggestedOffer != null) {
    lines.push(`For ${extraction.usageRightsDays}-day usage rights, my fee for ${scope} would be ${formatINR(advice.suggestedOffer)}.`);
  } else if (extraction.offerAmount == null && minimum > 0) {
    lines.push(`Thanks for the brief. My fee for ${scope} starts at ${formatINR(minimum)}.`);
    if (advice.usageAmount > 0) {
      lines.push(`Usage rights beyond what I include add ${formatINR(advice.usageAmount)} on top.`);
    }
    lines.push("Could you share the budget before we lock it?");
  } else if (advice.usageAmount > 0) {
    lines.push(`For ${extraction.usageRightsDays}-day usage rights, I add ${formatINR(advice.usageAmount)} on top of my usual fee for ${scope}.`);
  } else if (extraction.offerAmount != null && deliverables) {
    lines.push(`I can do ${deliverables} at ${formatINR(extraction.offerAmount)}.`);
  } else {
    lines.push("Thanks for the note. I would like to price this properly.");
  }

  const ask = extraction.gaps
    .filter((gap) => gap !== "Brand" && gap !== "Campaign")
    .filter((gap) => !(gap === "Offer" && extraction.offerAmount == null && minimum > 0))
    .map((gap) => gap.toLowerCase());
  if (ask.length) {
    lines.push(`Could you confirm ${joinList(ask)}?`);
    lines.push("", "Happy to lock it once those are clear.");
  } else {
    lines.push("", "Tell me if you want to lock this.");
  }
  return lines.join("\n");
}

export {
  CONVERSATIONS,
  DEFAULT_RULES,
  extractDeal,
  buildAdvice,
  belowMinimum,
  suggestedMinimum,
  recommendedWaitDays,
  suggestedReply,
  formatINR,
  formatDate,
  formatWhen,
  daysUntil,
  addDays,
  toISODate,
  listGaps,
};
