import { NextResponse } from "next/server";
import { openaiConfig } from "@/lib/config";
import { scanContract, type ContractFlag } from "@/lib/contract.mjs";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

const SYSTEM = `You review an influencer collaboration contract for the creator.
Return JSON: {"flags": [{"title": string, "severity": "high" | "medium", "why": string, "ask": string, "quote": string}]}.
Only flag terms that hurt the creator: usage, ownership, payment timing, cancellation, exclusivity, approvals, liability, penalties, data, morality clauses.
"quote" must be copied word for word from the contract. If you cannot quote it exactly, leave the flag out.
Keep "why" and "ask" to one short sentence each. Return at most 8 flags. Do not give legal advice beyond the negotiation ask.`;

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { text?: string; maxUsageDays?: number | null; maxExclusivityDays?: number | null } | null;
  const text = body?.text?.trim() ?? "";
  if (text.length < 40) return NextResponse.json({ error: "Paste the contract text first." }, { status: 400 });
  if (text.length > 60000) return NextResponse.json({ error: "Paste up to 60,000 characters at a time." }, { status: 400 });

  const rules = scanContract(text, { maxUsageDays: body?.maxUsageDays ?? null, maxExclusivityDays: body?.maxExclusivityDays ?? null });
  const { key, model, configured } = openaiConfig();
  if (!configured) return NextResponse.json({ flags: rules, ai: false });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      }),
    });
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!response.ok || !content) return NextResponse.json({ flags: rules, ai: false });
    const parsed = JSON.parse(content) as { flags?: Partial<ContractFlag>[] };
    const haystack = normalize(text);
    const taken = new Set(rules.map((flag) => flag.quote && normalize(flag.quote)));
    const extra: ContractFlag[] = (parsed.flags ?? [])
      .filter((flag) => typeof flag.quote === "string" && flag.quote.length > 8 && haystack.includes(normalize(flag.quote)))
      .filter((flag) => !taken.has(normalize(flag.quote as string)))
      .slice(0, 8)
      .map((flag, index) => ({
        id: `ai-${index}`,
        severity: flag.severity === "high" ? "high" : "medium",
        title: String(flag.title ?? "Worth a look").slice(0, 80),
        why: String(flag.why ?? "").slice(0, 240),
        ask: String(flag.ask ?? "").slice(0, 240),
        quote: String(flag.quote).slice(0, 300),
      }));
    const flags = [...rules, ...extra].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
    return NextResponse.json({ flags, ai: true });
  } catch {
    return NextResponse.json({ flags: rules, ai: false });
  }
}
