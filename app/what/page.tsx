import type { Metadata } from "next";
import { WhatPage } from "@/components/home/FeaturePages";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What it does",
  description: "Find the real brand opportunities, price the usage, negotiate inside your rules, then contract, invoice, and get paid.",
};

export default async function Page() {
  const viewer = await getViewer();
  return <WhatPage email={viewer?.email ?? null} />;
}
