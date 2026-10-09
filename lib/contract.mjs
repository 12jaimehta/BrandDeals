import { formatINR } from "./read-deal.mjs";

const LONG_DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

function longDate(value) {
  if (!value) return "";
  const date = typeof value === "string" && value.length === 10 ? new Date(`${value}T12:00:00+05:30`) : new Date(value);
  return Number.isFinite(date.getTime()) ? LONG_DATE.format(date) : "";
}

function blank(value, fallback = "________________") {
  const text = value == null ? "" : String(value).trim();
  return text || fallback;
}

// A plain collaboration agreement filled from the deal. The wording is fixed;
// only the bracketed facts change, so nothing here is written by a model.
function buildAgreement({ creator = {}, brand = {}, deal = {}, date = new Date() }) {
  const creatorName = blank(creator.legalName || creator.name);
  const brandName = blank(brand.name);
  const fee = deal.fee ? formatINR(deal.fee) : "₹________";
  const advance = Number(deal.advancePercent) || 0;
  const usageDays = deal.usageDays ?? 30;
  const exclusivity = Number(deal.exclusivityDays) || 0;
  const deliverables = Array.isArray(deal.deliverables) && deal.deliverables.length ? deal.deliverables : ["________________"];

  const sections = [
    ["Parties", [
      `This agreement is dated ${longDate(date)} between ${creatorName}${creator.address ? `, ${creator.address}` : ""}${creator.pan ? ` (PAN ${creator.pan})` : ""}${creator.gstin ? ` (GSTIN ${creator.gstin})` : ""} ("Creator") and ${brandName}${brand.contactName ? `, represented by ${brand.contactName}` : ""}${brand.email ? ` (${brand.email})` : ""} ("Brand").`,
    ]],
    ["Campaign and deliverables", [
      `Campaign: ${blank(deal.campaign, brandName)}.`,
      `The Creator will publish: ${deliverables.join(", ")} on the Creator's own Instagram account.`,
      `Go-live on or before ${deal.deadline ? longDate(deal.deadline) : "the date agreed in writing"}.`,
    ]],
    ["Approvals", [
      "The Brand may review each piece before it goes live and may request up to two rounds of reasonable revisions within 2 working days of receiving it.",
      "Silence for more than 2 working days counts as approval. The Creator keeps creative control of tone and style.",
    ]],
    ["Fee and payment", [
      `Total fee: ${fee}${deal.gstRate ? ` plus GST at ${deal.gstRate}%` : ""}.`,
      advance > 0
        ? `${advance}% is payable as an advance on signing. The balance is payable within 15 days of the content going live.`
        : "The full fee is payable within 15 days of the content going live.",
      "Payment is not conditional on the Brand or its agency being paid by anyone else.",
      "Late payments carry interest at 1.5% per month from the due date.",
    ]],
    ["Usage rights", [
      `The Brand may repost, share, and run the content as paid ads (including whitelisting or Spark-style ads) for ${usageDays} days from the go-live date.`,
      "After that period, the Brand will stop paid promotion of the content. Organic reposts already published may remain.",
      "Any longer use, other platforms, TV, print, or out-of-home use needs a separate written agreement and fee.",
    ]],
    ["Ownership", [
      "The Creator owns the content, the raw footage, and all likeness rights. The Brand gets a licence to use the content only as set out in this agreement.",
    ]],
    ["Exclusivity", [
      exclusivity > 0
        ? `For ${exclusivity} days from the go-live date, the Creator will not publish paid content for a direct competitor in the same product category.`
        : "There is no exclusivity. The Creator may work with other brands, including in the same category.",
    ]],
    ["Disclosure", [
      "The Creator will label the content as a paid partnership in line with ASCI's guidelines for influencer advertising, for example with #ad or the platform's paid-partnership tag.",
    ]],
    ["Cancellation", [
      "The advance is non-refundable once production has started.",
      "If the Brand cancels after the content has been delivered for review, the full fee is payable. If it cancels after production has started but before delivery, 50% of the fee is payable.",
      "If the Creator cannot deliver, any amount paid for undelivered work is refunded.",
    ]],
    ["Liability", [
      "Each party's total liability under this agreement is limited to the fee. Neither party is liable for indirect losses.",
      "Product claims supplied by the Brand are the Brand's responsibility.",
    ]],
    ["Confidentiality", [
      "Both parties will keep the fee and unreleased campaign details confidential until the campaign is public.",
    ]],
    ["Law", [
      "This agreement is governed by the laws of India. Disputes will first be discussed in good faith for 15 days before any other step.",
    ]],
  ];

  const lines = [
    "INFLUENCER COLLABORATION AGREEMENT",
    "",
    "Template. Have a lawyer review it before you rely on it.",
    "",
  ];
  sections.forEach(([title, paragraphs], index) => {
    lines.push(`${index + 1}. ${title}`);
    paragraphs.forEach((paragraph) => lines.push(paragraph));
    lines.push("");
  });
  lines.push("Signed for the Creator: ____________________   Date: __________");
  lines.push("");
  lines.push("Signed for the Brand:   ____________________   Date: __________");
  return lines.join("\n");
}

function sentences(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/(?<=[.;!?])\s+|\n{1,}/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length > 3);
}

function quoteFor(all, pattern) {
  const hit = all.find((sentence) => pattern.test(sentence));
  if (!hit) return null;
  return hit.length > 260 ? `${hit.slice(0, 257)}…` : hit;
}

function daysIn(sentence) {
  const match = sentence.match(/(\d{1,3})\s*(day|days|month|months|week|weeks)\b/i);
  if (!match) return null;
  const count = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("month")) return count * 30;
  if (unit.startsWith("week")) return count * 7;
  return count;
}

const RULES = [
  {
    id: "perpetual",
    severity: "high",
    title: "Usage forever",
    pattern: /\b(perpetu(al|ity)|in perpetuity|irrevocabl[ey]|for all time|unlimited (period|duration|time))\b/i,
    why: "They could run your face in ads for as long as they like, with no extra fee.",
    ask: "Limit usage to a fixed window, such as 30 or 90 days, and price anything longer separately.",
  },
  {
    id: "ownership",
    severity: "high",
    title: "You would give up ownership",
    pattern: /\b(work(s)? (made )?for hire|assigns? (all|any)? ?(right|title)|all right,? title and interest|hereby assigns?|sole (and exclusive )?owner(ship)? of (the )?(content|deliverables))\b/i,
    why: "Assigning ownership means the brand owns your content, footage, and possibly your likeness in it.",
    ask: "Keep ownership and grant a limited licence for the agreed usage period instead.",
  },
  {
    id: "pay-when-paid",
    severity: "high",
    title: "Paid only when the agency is paid",
    pattern: /\b(upon receipt of payment from|once (the )?(client|brand) (has )?pa(id|ys)|pay when paid|subject to (the )?(client|brand)('s)? payment)\b/i,
    why: "Your payment depends on someone else paying the agency. That is how invoices sit unpaid for months.",
    ask: "Make payment due on a fixed date after go-live, whatever the agency's own terms are.",
  },
  {
    id: "penalty",
    severity: "high",
    title: "Penalties or full refund",
    pattern: /\b(liquidated damages|penalt(y|ies)|refund (the )?(entire|full|whole) (fee|amount)|forfeit)\b/i,
    why: "A penalty clause can cost you more than the fee if something slips.",
    ask: "Remove penalties. Cap your liability at the fee, and only for work you did not deliver.",
  },
  {
    id: "terminate-anytime",
    severity: "high",
    title: "They can cancel without paying",
    pattern: /\b(terminate|cancel)\b[^.]{0,80}\b(at any time|for any reason|without (cause|notice|reason|liability))\b/i,
    unless: /\b(kill fee|cancellation fee|pay(able)? for (work|services) (performed|completed|delivered))\b/i,
    why: "If they cancel after you've shot the content, you may get nothing.",
    ask: "Add a kill fee: 50% if they cancel after production starts, 100% once content is delivered.",
  },
  {
    id: "unlimited-revisions",
    severity: "medium",
    title: "Unlimited revisions",
    pattern: /\b(unlimited (revisions|edits|changes)|revisions? until (the )?(brand|client) is satisfied|as many (revisions|edits|changes))\b/i,
    why: "Endless rounds of edits turn one Reel into weeks of work.",
    ask: "Limit it to two rounds of reasonable revisions.",
  },
  {
    id: "sole-discretion",
    severity: "medium",
    title: "Approval at their sole discretion",
    pattern: /\b(sole|absolute) discretion\b/i,
    why: "They can reject finished content for any reason and hold back payment.",
    ask: "Approvals should be reasonable, within 2 working days, with silence counting as approval.",
  },
  {
    id: "indemnity",
    severity: "medium",
    title: "One-sided indemnity",
    pattern: /\b(indemnif(y|ies|ication)|hold harmless)\b/i,
    unless: /\b(each party|mutual(ly)?|both parties)\b/i,
    why: "You could be liable for the brand's legal costs, with no cap.",
    ask: "Make the indemnity mutual and cap it at the fee. Product claims they supply should stay their responsibility.",
  },
  {
    id: "moral-rights",
    severity: "medium",
    title: "Moral rights waiver",
    pattern: /\bmoral rights\b/i,
    why: "Waiving moral rights lets them edit or cut your content in ways you didn't approve, still under your name.",
    ask: "Keep moral rights, or allow only edits you approve.",
  },
  {
    id: "raw-footage",
    severity: "medium",
    title: "Raw footage handover",
    pattern: /\b(raw (footage|files)|source files|unedited (footage|content))\b/i,
    why: "Raw footage lets them cut new ads from your material without paying for them.",
    ask: "Deliver final edits only, or charge separately for raw footage.",
  },
  {
    id: "paid-media",
    severity: "medium",
    title: "Paid ads use",
    pattern: /\b(whitelist(ing)?|paid (media|social|amplification|promotion)|boost(ed|ing)? posts?|dark posts?|spark ads?|partnership ads?)\b/i,
    needsNoDays: true,
    why: "Running your content as their ads is worth more than an organic post, and needs a time limit.",
    ask: "State a fixed paid-usage window and price it as an add-on.",
  },
  {
    id: "non-compete",
    severity: "medium",
    title: "Broad non-compete",
    pattern: /\b(non-?compete|shall not (work|partner|collaborate) with any (other )?(brand|company|competitor))\b/i,
    why: "A broad non-compete can block other paid work far beyond this one campaign.",
    ask: "Limit it to named direct competitors, in one category, for a short window, and get paid for it.",
  },
];

function scanContract(text, limits = {}) {
  const all = sentences(text);
  const flags = [];
  for (const rule of RULES) {
    const quote = quoteFor(all, rule.pattern);
    if (!quote) continue;
    if (rule.unless && rule.unless.test(text)) continue;
    if (rule.needsNoDays && daysIn(quote) != null) continue;
    flags.push({ id: rule.id, severity: rule.severity, title: rule.title, why: rule.why, ask: rule.ask, quote });
  }

  const paymentSentence = all.find((sentence) => /\b(net\s*\d+|payment|invoice|paid|payable)\b/i.test(sentence) && /\b\d{1,3}\s*(day|days)\b|net\s*\d+/i.test(sentence));
  if (paymentSentence) {
    const net = paymentSentence.match(/net\s*(\d{1,3})/i);
    const days = net ? Number(net[1]) : daysIn(paymentSentence);
    if (days != null && days > 45) {
      flags.push({
        id: "slow-payment",
        severity: days > 60 ? "high" : "medium",
        title: `Payment after ${days} days`,
        why: "Long payment terms are where most creator invoices go unpaid.",
        ask: "Ask for an advance and the balance within 15 to 30 days of going live.",
        quote: paymentSentence.length > 260 ? `${paymentSentence.slice(0, 257)}…` : paymentSentence,
      });
    }
  } else if (all.length > 3 && !/\b(payment|payable|invoice|fee)\b/i.test(text)) {
    flags.push({
      id: "no-payment-date",
      severity: "medium",
      title: "No payment date",
      why: "Without a due date there is nothing to chase.",
      ask: "Add the fee, the advance, and a fixed due date for the balance.",
      quote: null,
    });
  }

  const exclusivitySentence = all.find((sentence) => /\bexclusiv/i.test(sentence));
  if (exclusivitySentence) {
    const days = daysIn(exclusivitySentence);
    const cap = limits.maxExclusivityDays ?? 30;
    if (days != null && days > cap) {
      flags.push({
        id: "long-exclusivity",
        severity: days >= 90 ? "high" : "medium",
        title: `Exclusivity for ${days} days`,
        why: `That is longer than the ${cap} days you allow. Exclusivity blocks other paid work in the category.`,
        ask: `Cut exclusivity to ${cap} days, or add a fee for each extra month.`,
        quote: exclusivitySentence.length > 260 ? `${exclusivitySentence.slice(0, 257)}…` : exclusivitySentence,
      });
    }
  }

  const usageSentence = all.find((sentence) => /\b(usage|licen[cs]e|use the content)\b/i.test(sentence) && daysIn(sentence) != null);
  if (usageSentence && limits.maxUsageDays != null) {
    const days = daysIn(usageSentence);
    if (days != null && days > limits.maxUsageDays) {
      flags.push({
        id: "long-usage",
        severity: "medium",
        title: `Usage for ${days} days`,
        why: `That is longer than the ${limits.maxUsageDays} days you license.`,
        ask: `Cap usage at ${limits.maxUsageDays} days or price the extra window.`,
        quote: usageSentence.length > 260 ? `${usageSentence.slice(0, 257)}…` : usageSentence,
      });
    }
  }

  const order = { high: 0, medium: 1 };
  return flags.sort((a, b) => order[a.severity] - order[b.severity]);
}

export { buildAgreement, scanContract, sentences };
