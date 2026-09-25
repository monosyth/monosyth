import { shopOrigin } from "@/lib/shop/config";
import { createCheckout, createFormCheckout } from "@/lib/shop/server";
import { checkOrigin, privateHeaders, readLimitedText, ShopError, shopErrorResponse } from "@/lib/shop/security";
import { cartProducts } from "@/lib/shop/cart";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    checkOrigin(request, shopOrigin());
    let body: unknown;
    try { body = JSON.parse(await readLimitedText(request, 2048)); }
    catch (error) { if (error instanceof ShopError) throw error; throw new ShopError(400, "Invalid checkout request."); }
    if (!body || typeof body !== "object" || !("attemptId" in body) || typeof body.attemptId !== "string" || ("slug" in body && "slugs" in body)) {
      throw new ShopError(400, "Choose a pattern before starting checkout.");
    }
    const selection = "slugs" in body ? body.slugs : "slug" in body ? body.slug : undefined;
    const slugs = cartProducts(selection).map(product => product.slug);
    if ("uiMode" in body && body.uiMode !== "form") throw new ShopError(400, "Invalid checkout format.");
    if ("uiMode" in body) {
      return Response.json(await createFormCheckout(slugs, body.attemptId), { headers: privateHeaders });
    }
    const url = await createCheckout(slugs, body.attemptId);
    return Response.json({ url }, { headers: privateHeaders });
  } catch (error) { return shopErrorResponse(error); }
}
