import type { Metadata } from "next";
import { ReadPage } from "@/components/home/FeaturePages";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live read — Rate desk",
  description: "One brand thread becomes the deal: fee, deliverables, usage, uplift, and the counter.",
};

export default async function Page() {
  const viewer = await getViewer();
  return <ReadPage email={viewer?.email ?? null} />;
}
