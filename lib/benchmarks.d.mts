export type HistoricalFee = {
  id: string;
  brand: string;
  fee: number;
  deliverables: string;
  closedOn: string;
};

export type PublicBaseline = {
  source: "modash" | "hypeauditor";
  amount: number;
  currency: string;
  label: string;
};

export function medianFee(fees: Array<number | { fee?: number | null } | null>): number | null;
export function suggestedMinimum(): null;
export function readModashPrice(body: unknown): PublicBaseline | null;
export function readHypeAuditorPrice(body: unknown): PublicBaseline | null;
