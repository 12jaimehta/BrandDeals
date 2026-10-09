import type { Metadata } from "next";
import { RatesPage } from "@/components/home/FeaturePages";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rate engine",
  description: "Thirty days of usage are included. Every extra 30 days adds to the counter, with the maths shown.",
};

export default async function Page() {
  const viewer = await getViewer();
  return <RatesPage email={viewer?.email ?? null} />;
}