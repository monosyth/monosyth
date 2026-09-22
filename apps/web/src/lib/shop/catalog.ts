import catalog from "./catalog.json";

export type ShopProduct = (typeof catalog)[number];
export type ShopFile = ShopProduct["files"][number];

// These are versioned customer editions. Retain a release here when retiring it
// from the storefront so existing orders can still resolve their downloads.
export const shopProducts: readonly ShopProduct[] = catalog;
export const shopReleases: readonly ShopProduct[] = catalog;

export function findProduct(slug: string) {
  return shopProducts.find((product) => product.slug === slug);
}

export function findRelease(sku: string) {
  return shopReleases.find((product) => releaseId(product) === sku);
}

export function releaseId(product: ShopProduct) {
  return `${product.slug}@${product.version}`;
}

export function storagePath(product: ShopProduct, file: ShopFile) {
  return `patterns/${product.slug}/${product.version}/${file.sha256}/${file.name}`;
}

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
