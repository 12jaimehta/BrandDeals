import type { Metadata } from "next";
import { WhatPage } from "@/components/home/FeaturePages";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What it does — Brand Deal Inbox",
  description: "Find the real brand opportunities, pull the terms out, price the usage, and get the reply ready for your approval.",
};

export default async function Page() {
  const viewer = await getViewer();
  return <WhatPage email={viewer?.email ?? null} />;
}
