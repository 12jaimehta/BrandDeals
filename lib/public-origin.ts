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
