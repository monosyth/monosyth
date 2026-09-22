import { shopConfig } from "@/lib/shop/config";
import { fulfillOrder, stripeClient } from "@/lib/shop/server";
import { privateHeaders, readLimitedText, ShopError, shopErrorResponse } from "@/lib/shop/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new ShopError(400, "Missing signature.");
    const payload = await readLimitedText(request, 262144);
    const stripe = stripeClient();
    let event;
    try { event = stripe.webhooks.constructEvent(payload, signature, shopConfig().webhookSecret); }
    catch { throw new ShopError(400, "Invalid signature."); }
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      if (session.metadata?.shop === "monosyth-patterns-v1" && session.payment_status === "paid") {
        try { await fulfillOrder(session.id); }
        catch (error) {
          // A replay after a refund/dispute should not send another download email.
          if (!(error instanceof ShopError && error.status === 403)) throw error;
        }
      }
    }
    return Response.json({ received: true }, { headers: privateHeaders });
  } catch (error) { return shopErrorResponse(error); }
}
