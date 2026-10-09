import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Counter — Your deals, negotiated. Only you say yes." },
  description:
    "The AI deal desk for creators. Reads Gmail and Instagram, negotiates inside your rules, checks contracts, invoices, and chases payment.",
};

export default async function Page() {
  const viewer = await getViewer();
  return <HomePage email={viewer?.email ?? null} />;
}
