import { TrackerError } from "./model";
import { object } from "./agent-model";

export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
export function agentFailure(error: unknown) {
  if (error instanceof TrackerError) return Response.json({ error: error.message }, { status: error.status, headers: { ...privateHeaders, ...(error.status === 429 ? { "Retry-After": "60" } : {}) } });
  // Never log request bodies, bearer tokens, device secrets, or upstream errors.
  console.error("Journal connection request failed", error instanceof Error ? error.name : "Unknown error");
  return Response.json({ error: "The journal connection could not be reached. Try again." }, { status: 503, headers: privateHeaders });
}
export async function agentBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new TrackerError("Send updates as JSON.", 415);
  if (Number(request.headers.get("content-length") || 0) > 20000) throw new TrackerError("This request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new TrackerError("Send a JSON object.");
  const chunks: Uint8Array[] = []; let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 20000) { await reader.cancel(); throw new TrackerError("This request is too large.", 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new TrackerError("This request is not valid JSON."); }
  return object(data);
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = ["https://monosyth.com", "https://www.monosyth.com", new URL(request.url).origin];
  if (origin && !allowed.includes(origin)) throw new TrackerError("Use the journal's own connection page.", 403);
}
