import { downloadFile, retrieveOrder } from "@/lib/shop/server";
import { privateHeaders, ShopError, shopErrorResponse } from "@/lib/shop/security";
import { releaseId } from "@/lib/shop/catalog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const key = params.get("key") || "";
    if (!/^[0-9a-f]{64}$/.test(key)) throw new ShopError(403, "Open the complete private link from your order email.");
    const { products } = await retrieveOrder(params.get("session_id") || "", key);
    const sku = params.get("sku");
    const product = sku ? products.find(product => releaseId(product) === sku) : products.length === 1 ? products[0] : undefined;
    if (!product) throw new ShopError(404, "That pattern isn’t part of this order.");
    const file = product.files.find((candidate) => candidate.id === params.get("file"));
    if (!file) throw new ShopError(404, "That file isn’t part of this order.");
    const bytes = await downloadFile(product, file);
    return new Response(new Uint8Array(bytes), { headers: {
      ...privateHeaders,
      "Content-Type": file.name.endsWith(".pdf") ? "application/pdf" : "application/zip",
      "Content-Disposition": `attachment; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
      "Content-Length": String(bytes.length),
    } });
  } catch (error) { return shopErrorResponse(error); }
}
