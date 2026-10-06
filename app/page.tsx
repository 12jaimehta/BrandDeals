import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brand Deal Inbox — Turn brand messages into paid deals",
  description:
    "Connect Gmail and Instagram. Your desk finds every brand offer, shows the fee, work, and deadline on one card, tells you the fair price, and drafts your reply. Copy it or send it yourself.",
};

export default async function Page() {
  const viewer = await getViewer();
  return <HomePage email={viewer?.email ?? null} />;
}
