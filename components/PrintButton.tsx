"use client";

import { buttonInk } from "@/components/ui";

export function PrintButton({ label = "Print or save PDF" }: { label?: string }) {
  return <button type="button" className={buttonInk} onClick={() => window.print()}>{label}</button>;
}
