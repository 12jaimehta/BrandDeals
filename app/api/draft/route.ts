import { NextResponse } from "next/server";
import { openaiConfig } from "@/lib/config";
import type { Conversation } from "@/lib/read-deal.mjs";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

const SYSTEM = `You rewrite a creator's reply to a brand so it sounds warm, confident, and human.
Return only the reply text.
Keep every number, fee, date, and term exactly as written in the draft. Do not add a price, discount, term, or promise that is not in the draft.
Never accept the deal or say the creator agrees, unless the draft already says so.
Keep it short: no more than the draft's length plus two sentences.`;

function amounts(text: string) {
  const found = new Set<number>();
  for (const match of text.matchAll(/(?:₹|rs\.?|inr)\s?(\d{1,3}(?:,\d{2,3})+|\d+)(\s?k\b)?/gi)) {
    const base = Number(match[1].replace(/,/g, ""));
    found.add(match[2] ? base * 1000 : base);
  }
  for (const match of text.matchAll(/\b(\d+)\s?k\b/gi)) found.add(Number(match[1]) * 1000);
  return found;
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { conversation?: Conversation; draft?: string } | null;
  const draft = body?.draft?.trim();
  if (!body?.conversation || !draft) {
    return NextResponse.json({ error: "The rewrite needs the thread and a draft." }, { status: 400 });
  }

  const { key, model, configured } = openaiConfig();
  if (!configured) return NextResponse.json({ draft, modelError: "Add OPENAI_API_KEY to rewrite drafts with AI. The draft is unchanged." });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: JSON.stringify({
              thread: body.conversation.messages.slice(-6).map((message) => ({ from: message.from, text: message.text.slice(0, 2000) })),
              draft,
            }),
          },
        ],
      }),
    });
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    const rewritten = payload.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !rewritten) {
      return NextResponse.json({ draft, modelError: payload.error?.message || "The AI did not return a draft. Your draft is unchanged." });
    }
    const allowed = amounts(`${draft}\n${body.conversation.messages.map((message) => message.text).join("\n")}`);
    const invented = [...amounts(rewritten)].filter((amount) => !allowed.has(amount));
    if (invented.length) {
      return NextResponse.json({ draft, modelError: "The AI changed a fee, so its rewrite was thrown away. Your draft is unchanged." });
    }
    return NextResponse.json({ draft: rewritten });
  } catch {
    return NextResponse.json({ draft, modelError: "The AI could not be reached. Your draft is unchanged." });
  }
}
