import { shopOrigin } from "@/lib/shop/config";
import { createCheckout, createFormCheckout } from "@/lib/shop/server";
import { checkOrigin, privateHeaders, readLimitedText, ShopError, shopErrorResponse } from "@/lib/shop/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    checkOrigin(request, shopOrigin());
    let body: unknown;
    try { body = JSON.parse(await readLimitedText(request, 2048)); }
    catch (error) { if (error instanceof ShopError) throw error; throw new ShopError(400, "Invalid checkout request."); }
    if (!body || typeof body !== "object" || !("slug" in body) || typeof body.slug !== "string" || !("attemptId" in body) || typeof body.attemptId !== "string") {
      throw new ShopError(400, "Choose a pattern before starting checkout.");
    }
    if ("uiMode" in body && body.uiMode !== "form") throw new ShopError(400, "Invalid checkout format.");
    if ("uiMode" in body) {
      return Response.json(await createFormCheckout(body.slug, body.attemptId), { headers: privateHeaders });
    }
    const url = await createCheckout(body.slug, body.attemptId);
    return Response.json({ url }, { headers: privateHeaders });
  } catch (error) { return shopErrorResponse(error); }
}
