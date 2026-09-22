import { retrieveOrder } from "@/lib/shop/server";
import { privateHeaders, ShopError, shopErrorResponse } from "@/lib/shop/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const key = params.get("key") || "";
    if (!/^[0-9a-f]{64}$/.test(key)) throw new ShopError(403, "Open the complete private link from your order email.");
    const { session, product } = await retrieveOrder(params.get("session_id") || "", key);
    return Response.json({
      name: product.name, version: product.version,
      emailSent: Boolean(session.metadata?.delivery_email_id),
      files: product.files.map((file) => ({ id: file.id, label: file.label, name: file.name, bytes: file.bytes })),
    }, { headers: privateHeaders });
  } catch (error) { return shopErrorResponse(error); }
}
