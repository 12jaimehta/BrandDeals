const DEAL_SHARE = 0.05;
const AGENCY_MONTHLY_INR = 24000;

function closeCut(plan, fee) {
  const amount = Number(fee);
  if (!Number.isFinite(amount) || amount <= 0) return { cut: 0, note: "Enter the fee that was actually agreed." };
  if (plan === "agency") return { cut: 0, note: "Covered by the agency plan. No percentage on this close." };
  return { cut: Math.round(amount * DEAL_SHARE), note: "5% of the closed fee." };
}

// Counter's fee on an invoice: 5% of the pre-GST amount, only for deals on the desk.
function invoiceFee({ subtotal, conversationId, plan }) {
  if (plan === "agency" || !conversationId) return 0;
  const amount = Number(subtotal);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * DEAL_SHARE) : 0;
}

// What reaches the creator from an online payment, in paise: the payment
// minus Razorpay's gateway fee and Counter's fee. Never negative.
function routeTransfer({ amountPaise, gatewayFeePaise = 0, counterFeeRupees = 0 }) {
  const amount = Math.max(0, Math.round(Number(amountPaise) || 0));
  const gateway = Math.max(0, Math.round(Number(gatewayFeePaise) || 0));
  const counter = Math.max(0, Math.round((Number(counterFeeRupees) || 0) * 100));
  const deductible = Math.min(counter, Math.max(0, amount - gateway));
  return { transferPaise: Math.max(0, amount - gateway - deductible), counterPaise: deductible, gatewayPaise: Math.min(gateway, amount) };
}

export { DEAL_SHARE, AGENCY_MONTHLY_INR, closeCut, invoiceFee, routeTransfer };
