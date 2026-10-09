function medianFee(fees) {
  const amounts = (Array.isArray(fees) ? fees : [])
    .map((fee) => Number(fee && typeof fee === "object" ? fee.fee : fee))
    .filter((amount) => Number.isFinite(amount) && amount > 0)
    .sort((a, b) => a - b);
  if (!amounts.length) return null;
  const mid = Math.floor(amounts.length / 2);
  if (amounts.length % 2 === 1) return amounts[mid];
  return Math.round((amounts[mid - 1] + amounts[mid]) / 2);
}

function suggestedMinimum() {
  return null;
}

function asRecord(value) {
  return value && typeof value === "object" ? value : null;
}

function positive(value) {
  const amount = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function readModashPrice(body) {
  const root = asRecord(body);
  const profile = asRecord(root?.profile) ?? root;
  if (!profile) return null;
  const nested = asRecord(profile.price);
  const amount = positive(profile.paidPostPrice) ?? positive(profile.estimatedPostPrice) ?? positive(nested?.post);
  if (amount == null) return null;
  const currency = typeof nested?.currency === "string" ? nested.currency.toUpperCase() : "USD";
  return { source: "modash", amount, currency, label: "Modash published post price" };
}

function readHypeAuditorPrice(body) {
  const root = asRecord(body);
  const result = asRecord(root?.result) ?? root;
  const user = asRecord(result?.user) ?? result;
  const prices = asRecord(user?.blogger_prices) ?? asRecord(result?.blogger_prices);
  if (!prices) return null;
  const amount = positive(prices.post_price) ?? positive(prices.instagram_post_price);
  if (amount == null) return null;
  const currency = typeof prices.currency === "string" ? prices.currency.toUpperCase() : "UNSPECIFIED";
  return { source: "hypeauditor", amount, currency, label: "HypeAuditor published post price" };
}

export { medianFee, suggestedMinimum, readModashPrice, readHypeAuditorPrice };
