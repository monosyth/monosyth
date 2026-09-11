import { MoveError } from "./model";

type Actor = { uid: string; email_verified?: boolean };
export type MoveBackend = {
  verify: (token: string) => Promise<Actor>;
  read: (uid: string) => Promise<unknown>;
  change: (uid: string, body: unknown) => Promise<unknown>;
};
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
  "X-Content-Type-Options": "nosniff",
};
export function createMoveHandler(backend: MoveBackend) {
  return async function handle(request: Request): Promise<Response> {
    try {
      const match = /^Bearer ([^\s]+)$/.exec(
        request.headers.get("authorization") ?? "",
      );
      if (!match) throw new MoveError("Sign in to open your saved move.", 401);
      let actor: Actor;
      try {
        actor = await backend.verify(match[1]);
      } catch {
        throw new MoveError("Your sign-in expired. Please sign in again.", 401);
      }
      if (
        !actor.uid ||
        actor.uid.includes("/") ||
        actor.email_verified !== true
      )
        throw new MoveError(
          "Use a verified Google account to save a move.",
          403,
        );
      if (request.method === "GET")
        return Response.json(
          { plan: await backend.read(actor.uid) },
          { headers },
        );
      if (request.method !== "POST")
        return Response.json(
          { error: "Method not supported." },
          { status: 405, headers },
        );
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new MoveError("Open MoveMorrow directly to make changes.", 403);
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        throw new MoveError("Send valid move details.", 415);
      // Bound the streamed body too; a missing Content-Length must not bypass the limit.
      const reader = request.body?.getReader();
      let body = "";
      let bytes = 0;
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 12000) {
            await reader.cancel();
            throw new MoveError("This change is too large.", 413);
          }
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new MoveError("Send valid move details.");
      }
      // The account is always from the verified token. No client-supplied uid or path is used.
      return Response.json(
        { plan: await backend.change(actor.uid, parsed) },
        { headers },
      );
    } catch (error) {
      const known = error instanceof MoveError;
      return Response.json(
        {
          error: known
            ? error.message
            : "We couldn’t reach your saved plan. Please try again.",
        },
        { status: known ? error.status : 503, headers },
      );
    }
  };
}
