import type { Metadata } from "next";
import { EmailDesk } from "@/components/EmailDesk";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email desk — Creator Rate Enforcement",
  description: "Paste a brand email. The desk extracts the offer and prices it. Nothing is guessed.",
};

export default async function EmailPage() {
  const viewer = await getViewer();
  return <EmailDesk email={viewer?.email ?? null} />;
}
