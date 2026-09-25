import { findProduct, type ShopProduct } from "./catalog";
import { ShopError } from "./security";

export const MAX_CART_PATTERNS = 10;

// Client selections identify products only. Prices and editions come from our catalog.
export function cartProducts(selection: unknown): ShopProduct[] {
  const slugs = typeof selection === "string" ? [selection] : selection;
  if (!Array.isArray(slugs) || slugs.length < 1 || slugs.length > MAX_CART_PATTERNS || slugs.some(slug => typeof slug !== "string")) {
    throw new ShopError(400, "Choose between 1 and 10 different patterns for your cart.");
  }
  if (new Set(slugs).size !== slugs.length) throw new ShopError(400, "Each digital pattern only needs to be added once.");
  return [...slugs].sort().map(slug => {
    const product = findProduct(slug);
    if (!product) throw new ShopError(404, "A pattern in your cart is no longer available. Please review your cart.");
    return product;
  });
}
