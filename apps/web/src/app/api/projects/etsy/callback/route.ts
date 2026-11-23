import { etsyReturnUrl, finishEtsyConnection } from "@/lib/projects/etsy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Etsy sends the browser here, so there is no bearer token. The single-use state issued to the signed-in owner is the proof.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams, state = params.get("state");
  let result = "expired";
  if (state) {
    try { result = await finishEtsyConnection({ state, code: params.get("error") ? null : params.get("code") }); }
    catch (error) {
      console.error("Etsy connection could not finish", error instanceof Error ? error.name : "Unknown error");
      result = "failed";
    }
  }
  return new Response(null, { status: 303, headers: { Location: etsyReturnUrl(result), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
}
