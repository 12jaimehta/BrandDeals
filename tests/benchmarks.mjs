import assert from "node:assert/strict";
import { medianFee } from "../lib/benchmarks.mjs";
import { closeCut, invoiceFee, routeTransfer } from "../lib/commercial.mjs";
import { readHypeAuditorPrice, readModashPrice } from "../lib/benchmarks.mjs";

assert.strictEqual(medianFee([]), null);
assert.strictEqual(medianFee([100000, 80000, 120000]), 100000);
assert.strictEqual(medianFee([{ fee: 80000 }, { fee: 120000 }]), 100000);
assert.strictEqual(medianFee([0, -1, null]), null);

assert.deepStrictEqual(closeCut("deal-share", 100000), { cut: 5000, note: "5% of the closed fee." });
assert.strictEqual(closeCut("agency", 100000).cut, 0);
assert.strictEqual(closeCut("deal-share", 0).cut, 0);

assert.strictEqual(invoiceFee({ subtotal: 105000, conversationId: "c1", plan: "deal_share" }), 5250);
assert.strictEqual(invoiceFee({ subtotal: 105000, conversationId: null, plan: "deal_share" }), 0);
assert.strictEqual(invoiceFee({ subtotal: 105000, conversationId: "c1", plan: "agency" }), 0);
assert.deepStrictEqual(routeTransfer({ amountPaise: 12390000, gatewayFeePaise: 292404, counterFeeRupees: 5250 }), {
  transferPaise: 12390000 - 292404 - 525000,
  counterPaise: 525000,
  gatewayPaise: 292404,
});
assert.strictEqual(routeTransfer({ amountPaise: 1000, gatewayFeePaise: 900, counterFeeRupees: 50 }).transferPaise, 0);
assert.strictEqual(routeTransfer({ amountPaise: 1000, gatewayFeePaise: 900, counterFeeRupees: 50 }).counterPaise, 100);

assert.strictEqual(readModashPrice({ profile: { engagementRate: 0.04 } }), null);
assert.deepStrictEqual(readModashPrice({ profile: { price: { post: 500, currency: "usd" } } }), {
  source: "modash",
  amount: 500,
  currency: "USD",
  label: "Modash published post price",
});
assert.strictEqual(readHypeAuditorPrice({ result: { user: { followers: 20000 } } }), null);
assert.strictEqual(readHypeAuditorPrice({ result: { user: { blogger_prices: { post_price: 1500, currency: "INR" } } } }).amount, 1500);

console.log("benchmarks ok");
