import catalog from "./catalog.json";
import fontCatalog from "./font-catalog.json";
import fontHistory from "./font-release-history.json";

export type PatternProduct = (typeof catalog)[number] & { kind: "pattern" };
export type FontProduct = (typeof fontCatalog)[number] & { kind: "font" };
export type ShopProduct = PatternProduct | FontProduct;
export type ShopFile = ShopProduct["files"][number];

// Keep the pattern collection independent from the foundry storefront.
export const shopProducts: readonly PatternProduct[] = catalog.map(product => ({ ...product, kind: "pattern" }));
export const fontProducts: readonly FontProduct[] = fontCatalog.map(product => ({ ...product, kind: "font" }));
// Retain retired releases here so old receipts still resolve their exact files.
export const shopReleases: readonly ShopProduct[] = [...shopProducts, ...fontProducts, ...fontHistory.map(product => ({ ...product, kind: "font" as const }))];
export function findProduct(slug: string) { return [...shopProducts, ...fontProducts].find(product => product.slug === slug); }
export function findRelease(sku: string) { return shopReleases.find(product => releaseId(product) === sku); }
export function releaseId(product: ShopProduct) { return `${product.slug}@${product.version}`; }
export function storagePath(product: ShopProduct, file: ShopFile) {
  return `${product.kind === "font" ? "fonts" : "patterns"}/${product.slug}/${product.version}/${file.sha256}/${file.name}`;
}
export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
export function productTitle(product: ShopProduct) { return product.kind === "font" ? product.name : `${product.name} — PDF + EQ8`; }
export function productSummary(product: ShopProduct) { return product.kind === "font" ? product.licenseSummary : `Digital quilt pattern · ${product.size} finished · Edition ${product.version}`; }
