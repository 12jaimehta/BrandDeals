import { headers } from "next/headers";

export async function pageOrigin() {
  const list = await headers();
  const host = (list.get("x-forwarded-host") || list.get("host") || "localhost:3000").split(",")[0].trim();
  const proto = (list.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  return `${proto}://${host}`;
}

export function publicOrigin(request: Request) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim();
  const proto = (request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", ""))
    .split(",")[0]
    .trim();
  if (!host) return new URL(request.url).origin;
  return `${proto}://${host}`;
}
