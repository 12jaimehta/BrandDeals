import assert from "node:assert/strict";
import { medianFee } from "../lib/benchmarks.mjs";
import { closeCut } from "../lib/commercial.mjs";
import { readHypeAuditorPrice, readModashPrice } from "../lib/benchmarks.mjs";

assert.strictEqual(medianFee([]), null);
assert.strictEqual(medianFee([100000, 80000, 120000]), 100000);
assert.strictEqual(medianFee([{ fee: 80000 }, { fee: 120000 }]), 100000);
assert.strictEqual(medianFee([0, -1, null]), null);

assert.deepStrictEqual(closeCut("deal-share", 100000), { cut: 5000, note: "5% of the closed fee." });
assert.strictEqual(closeCut("agency", 100000).cut, 0);
assert.strictEqual(closeCut("deal-share", 0).cut, 0);

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
