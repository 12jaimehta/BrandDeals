const DEAL_SHARE = 0.05;
const AGENCY_MONTHLY_INR = 24000;

function closeCut(plan, fee) {
  const amount = Number(fee);
  if (!Number.isFinite(amount) || amount <= 0) return { cut: 0, note: "Enter the fee that was actually agreed." };
  if (plan === "agency") return { cut: 0, note: "Covered by the agency plan. No percentage on this close." };
  return { cut: Math.round(amount * DEAL_SHARE), note: "5% of the closed fee." };
}

export { DEAL_SHARE, AGENCY_MONTHLY_INR, closeCut };
