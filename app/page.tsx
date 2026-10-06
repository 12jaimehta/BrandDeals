import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";

export const metadata: Metadata = {
  title: "Brand Deal Inbox — Your brand deals, read before you reply",
  description:
    "Connect Gmail and Instagram. AI extracts the fee, usage, deadline and deliverables, advises your rate, times the follow-up, and drafts a reply you approve. Nothing is ever sent for you.",
};

export default function Page() {
  return <HomePage />;
}
