import { NextResponse } from "next/server";
import { suggestedReply, type Advice, type Conversation, type Extraction, type RateRules } from "@/lib/read-deal.mjs";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM = `You draft a reply a creator will copy and send themselves.
Return only the reply text.
Use the fee numbers you are given. Do not invent a price, a brand, or a term that was not provided.
If no offer was stated and a minimum fee was provided, ask for the budget and state that minimum.
If a suggested counter was provided, use that figure.
Do not say the message has already been sent.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string } | undefined;
  if (error || !claims?.sub) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    conversation?: Conversation;
    extraction?: Extraction;
    advice?: Advice;
    rules?: RateRules;
  } | null;
  if (!body?.conversation || !body.extraction || !body.advice || !body.rules) {
    return NextResponse.json({ error: "The draft needs the thread and the rate rules." }, { status: 400 });
  }

  const fallback = suggestedReply(body.conversation, body.extraction, body.advice, body.rules);
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return NextResponse.json({ draft: fallback, reader: "rules" });
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4",
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: JSON.stringify({
              thread: body.conversation.messages.map((message) => ({ from: message.from, text: message.text })),
              deal: body.extraction,
              advice: body.advice,
              minimumOffer: body.rules.minimumOffer,
              rulesDraft: fallback,
            }),
          },
        ],
      }),
    });
    const payload = await response.json() as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    const draft = payload.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !draft) {
      return NextResponse.json({
        draft: fallback,
        reader: "rules",
        modelError: payload.error?.message || "Grok did not return a draft. The rules draft is shown instead.",
      });
    }
    return NextResponse.json({ draft, reader: "grok" });
  } catch {
    return NextResponse.json({
      draft: fallback,
      reader: "rules",
      modelError: "Grok could not be reached. The rules draft is shown instead.",
    });
  }
}
