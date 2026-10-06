import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";

export const metadata: Metadata = {
  title: "Brand Deal Inbox",
  description: "Reads brand conversations and tells you what to charge. You still send the reply.",
};

export default function Page() {
  return <HomePage />;
};
