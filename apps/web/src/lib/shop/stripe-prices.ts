import "server-only";
import type Stripe from "stripe";
import { releaseId, type ShopProduct } from "./catalog";
import { ShopError } from "./security";
import liveCatalog from "./stripe-live-catalog.json";

export function checkoutLineItem(product: ShopProduct, stripeKey: string): Stripe.Checkout.SessionCreateParams.LineItem {
  if (/^(sk|rk)_live_/.test(stripeKey)) {
    const price = liveCatalog.prices.find((entry) => entry.sku === releaseId(product));
    // A new edition or price must be explicitly mapped before it can be sold.
    if (!price || price.unitAmount !== product.priceCents || price.currency !== product.currency) {
      throw new ShopError(503, "This pattern is getting ready. Please check back soon.");
    }
    return { quantity: 1, price: price.priceId };
  }

  // Sandbox objects belong to a separate Stripe account; never use live IDs.
  return { quantity: 1, price_data: {
    currency: product.currency, unit_amount: product.priceCents, tax_behavior: "exclusive",
    product_data: {
      name: `${product.name} — PDF + EQ8`,
      description: `Digital quilt pattern · ${product.size} finished · Edition ${product.version}`,
      tax_code: liveCatalog.taxCode,
      metadata: { sku: releaseId(product) },
    },
  } };
}
