import { hasGmailConnection } from "@/lib/gmail-status";
import { hasInstagramConnection } from "@/lib/instagram-status";

export async function hasAnyInbox(userId: string) {
  const [gmail, instagram] = await Promise.all([
    hasGmailConnection(userId),
    hasInstagramConnection(userId),
  ]);
  return gmail || instagram;
}
