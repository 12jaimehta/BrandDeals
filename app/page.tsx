import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rate desk — Hold the rate on every offer",
  description:
    "Creator rate enforcement for managed creators and small agencies. Gmail and Instagram. The floor comes from closed fees, not a guess.",
};

export default async function Page() {
  const viewer = await getViewer();
  return <HomePage email={viewer?.email ?? null} />;
}
