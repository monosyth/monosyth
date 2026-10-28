import assert from "node:assert/strict";
import test from "node:test";
import { analyticsReferrer, isPublicAnalyticsPath } from "../src/lib/analytics";

test("public pages are measured without including private app and order routes", () => {
  for (const path of ["/", "/shop", "/shop/type", "/shop/everyday-carved", "/weather", "/weather/birds", "/weather/birds/american-robin"]) {
    assert.equal(isPublicAnalyticsPath(path), true, path);
  }
  for (const path of ["/app", "/app/quilting", "/move", "/move/planner", "/rsvp", "/dallas-and-scott", "/shop/order", "/shop/checkout", "/shop/checkout/everyday-carved", "/shop/cart", "/weather/field-listen", "/vtmultifamily", "/everydaymeasure"]) {
    assert.equal(isPublicAnalyticsPath(path), false, path);
  }
});

test("referrers remove tokens, query strings, fragments and private Monosyth paths", () => {
  assert.equal(analyticsReferrer("https://example.com/start?email=private#secret"), "https://example.com/start");
  assert.equal(analyticsReferrer("https://monosyth.com/shop/type?filter=fonts#preview"), "https://monosyth.com/shop/type");
  for (const referrer of ["https://monosyth.com/shop/order?token=private", "https://www.monosyth.com/move/planner", "", "invalid", "javascript:alert(1)"]) {
    assert.equal(analyticsReferrer(referrer), "");
  }
});
