import { readHypeAuditorPrice, readModashPrice, type PublicBaseline } from "@/lib/benchmarks.mjs";

export type { PublicBaseline };

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

export async function publicBaseline(username: string): Promise<PublicBaseline | null> {
  const handle = username.replace(/^@/, "").trim();
  if (!handle) return null;

  const modashKey = process.env.MODASH_API_KEY?.trim();
  if (modashKey) {
    const response = await fetch(`https://api.modash.io/v1/instagram/profile/${encodeURIComponent(handle)}/report`, {
      headers: { Authorization: `Bearer ${modashKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const price = readModashPrice(await readJson(response));
      if (price) return price;
    }
  }

  const auditorId = process.env.HYPEAUDITOR_API_ID?.trim();
  const auditorToken = process.env.HYPEAUDITOR_API_TOKEN?.trim();
  if (auditorId && auditorToken) {
    const url = new URL("https://hypeauditor.com/api/method/auditor.report/");
    url.searchParams.set("username", handle);
    const response = await fetch(url, {
      headers: { "X-Auth-Id": auditorId, "X-Auth-Token": auditorToken },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const price = readHypeAuditorPrice(await readJson(response));
      if (price) return price;
    }
  }

  return null;
}
