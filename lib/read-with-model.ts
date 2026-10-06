import {
  extractDeal,
  listGaps,
  type Conversation,
  type Extraction,
} from "@/lib/read-deal.mjs";

const SYSTEM = `You read a creator's brand email or Instagram DM and extract the deal.
Return one JSON object with these keys:
isBrandOpportunity (boolean), detectionReason (short sentence), brand, campaign, offerAmount, offerApproximate, deliverables, deadline, usageRightsDays, usageVia, exclusivityDays, payment, notes.
Rules:
- A brand opportunity is a direct offer or negotiation from a brand or an agency. Newsletters, receipts, and personal chats are not.
- Use null when the message does not state that term. Never invent a fee, brand, deadline, usage window, or payment term.
- brand is the company being advertised. Leave it null when only an agency is named.
- offerAmount is an integer in the currency written in the message. offerApproximate is true when the fee is phrased as around or about.
- deliverables is an array of short labels such as "2 Reels" or "3 Stories".
- deadline is YYYY-MM-DD or null. Use the year of the message when the year is missing.
- usageRightsDays is a number of days. Count a stated month as 30 days and say so in notes.
- usageVia is "usage rights", "whitelisting", or null.
- exclusivityDays is a number, 0 when they say there is no exclusivity, or null when exclusivity is not mentioned.
- payment is a short phrase such as "50% advance", or null.
- notes is an array of short reading notes. detectionReason says why it is or is not a brand opportunity.`;

export type ReadResult = {
  extraction: Extraction;
  reader: "rules" | "openai";
  modelError?: string;
};

function asNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? Math.round(number) : null;
}

function asText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 180) : null;
}

function textHasAmount(text: string, amount: number) {
  const plain = text.replace(/[,\s]/g, "");
  if (plain.includes(String(amount))) return true;
  if (amount % 1000 === 0 && new RegExp(`\\b${amount / 1000}\\s*k\\b`, "i").test(text)) return true;
  return false;
}

export function coerceExtraction(value: unknown, conversation: Conversation): Extraction {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const text = `${conversation.subject}\n${conversation.messages.map((message) => message.text).join("\n")}`;
  const notes = Array.isArray(raw.notes) ? raw.notes.filter((note) => typeof note === "string").slice(0, 6) : [];
  const isBrandOpportunity = raw.isBrandOpportunity === true;
  const detectionReason = asText(raw.detectionReason) || (isBrandOpportunity
    ? "The model marked this as a brand opportunity."
    : "The model left this out of brand deals.");

  if (!isBrandOpportunity) {
    return {
      isBrandOpportunity: false,
      detectionReason,
      brand: null,
      campaign: null,
      offerAmount: null,
      offerApproximate: false,
      deliverables: [],
      deadline: null,
      usageRightsDays: null,
      usageVia: null,
      exclusivityDays: null,
      payment: null,
      notes: [],
      gaps: [],
    };
  }

  let brand = asText(raw.brand);
  if (brand && !text.toLowerCase().includes(brand.toLowerCase())) {
    notes.push("A brand name was dropped because it was not written in the message.");
    brand = null;
  }

  let offerAmount = asNumber(raw.offerAmount);
  if (offerAmount != null && offerAmount < 0) offerAmount = null;
  if (offerAmount != null && !textHasAmount(text, offerAmount)) {
    notes.push("A fee was dropped because that amount was not written in the message.");
    offerAmount = null;
  }

  const deadline = typeof raw.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline) ? raw.deadline : null;
  const usageRightsDays = asNumber(raw.usageRightsDays);
  const exclusivityDays = raw.exclusivityDays == null ? null : asNumber(raw.exclusivityDays);
  const deliverables = Array.isArray(raw.deliverables)
    ? raw.deliverables.filter((item) => typeof item === "string" && item.trim()).slice(0, 8).map((item) => item.trim())
    : [];

  const extraction: Extraction = {
    isBrandOpportunity: true,
    detectionReason,
    brand,
    campaign: asText(raw.campaign),
    offerAmount,
    offerApproximate: raw.offerApproximate === true,
    deliverables,
    deadline,
    usageRightsDays: usageRightsDays != null && usageRightsDays >= 0 ? usageRightsDays : null,
    usageVia: asText(raw.usageVia),
    exclusivityDays: exclusivityDays != null && exclusivityDays >= 0 ? exclusivityDays : null,
    payment: asText(raw.payment),
    notes,
    gaps: [],
  };
  extraction.gaps = listGaps(extraction);
  return extraction;
}

async function readWithOpenAI(conversation: Conversation): Promise<Extraction> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: JSON.stringify({
              source: conversation.source,
              fromName: conversation.fromName,
              fromHandle: conversation.fromHandle,
              subject: conversation.subject,
              receivedAt: conversation.receivedAt,
              messages: conversation.messages,
            }),
          },
        ],
      }),
    });
    const json = (await response.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!response.ok) {
      throw new Error(json.error?.message || "OpenAI did not read this message.");
    }
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty reading.");
    return coerceExtraction(JSON.parse(content), conversation);
  } finally {
    clearTimeout(timer);
  }
}

export async function readConversation(conversation: Conversation): Promise<ReadResult> {
  const rules = extractDeal(conversation);
  if (!process.env.OPENAI_API_KEY) return { extraction: rules, reader: "rules" };
  try {
    const extraction = await readWithOpenAI(conversation);
    return { extraction, reader: "openai" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI failed";
    return {
      extraction: rules,
      reader: "rules",
      modelError: message.includes("API key") ? "OpenAI rejected the key. The rules reader was used." : message,
    };
  }
}
