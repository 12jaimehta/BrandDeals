export const DEAL_SHARE: number;
export const AGENCY_MONTHLY_INR: number;
export function closeCut(plan: "deal-share" | "agency", fee: number): { cut: number; note: string };
