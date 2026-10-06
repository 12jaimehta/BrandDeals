import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";

export const metadata: Metadata = {
  title: "Brand Deal Inbox — Turn brand messages into paid deals",
  description:
    "Connect Gmail and Instagram. Your desk finds every brand offer, shows the fee, work, and deadline on one card, tells you the fair price, and drafts your reply. Copy it or send it yourself.",
};

export default function Page() {
  return <HomePage />;
}
