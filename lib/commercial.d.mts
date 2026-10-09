export const DEAL_SHARE: number;
export const AGENCY_MONTHLY_INR: number;
export function closeCut(plan: "deal-share" | "agency", fee: number): { cut: number; note: string };
export function invoiceFee(input: { subtotal: number; conversationId: string | null; plan: "deal_share" | "agency" }): number;
export function routeTransfer(input: { amountPaise: number; gatewayFeePaise?: number; counterFeeRupees?: number }): {
  transferPaise: number;
  counterPaise: number;
  gatewayPaise: number;
};
