import { retrieveOrder } from "@/lib/shop/server";
import { privateHeaders, ShopError, shopErrorResponse } from "@/lib/shop/security";
import { releaseId } from "@/lib/shop/catalog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const key = params.get("key") || "";
    if (!/^[0-9a-f]{64}$/.test(key)) throw new ShopError(403, "Open the complete private link from your order email.");
    const { session, products } = await retrieveOrder(params.get("session_id") || "", key);
    const items = products.map(product => ({ sku: releaseId(product), slug: product.slug, name: product.name, version: product.version,
      files: product.files.map(file => ({ id: file.id, label: file.label, name: file.name, bytes: file.bytes })),
    }));
    return Response.json({
      // Preserve the original response for older open single-pattern order pages.
      ...(items.length === 1 ? { name: items[0].name, version: items[0].version, files: items[0].files } : {}),
      products: items, orderId: session.metadata?.order_id,
      emailSent: Boolean(session.metadata?.delivery_email_id),
    }, { headers: privateHeaders });
  } catch (error) { return shopErrorResponse(error); }
}
