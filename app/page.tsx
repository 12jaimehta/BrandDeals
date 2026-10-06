import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brand Deal Inbox — Turn brand messages into paid deals",
  description:
    "Connect Gmail and Instagram. The desk reads each brand offer, tells you the fair price, and writes the reply",
};

export default async function Page() {
  const viewer = await getViewer();
  return <HomePage email={viewer?.email ?? null} />;
}
