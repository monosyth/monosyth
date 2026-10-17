import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";
import { parseBirdDay, parseBirdSnapshot, validBirdDate } from "@/lib/weather/birds";

export const dynamic = "force-dynamic";

async function readJson(path: string): Promise<unknown> {
  const [buffer] = await getFirebaseAdminStorageBucket().file(path).download();
  if (buffer.byteLength > 5_000_000) throw new Error("Bird history exceeds size limit");
  return JSON.parse(buffer.toString("utf8"));
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || "";
  if (date && !validBirdDate(date)) return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  try {
    const snapshot = parseBirdSnapshot(await readJson("weather/birds/latest.json"));
    if (date && date !== snapshot.day.date) {
      try {
        const day = parseBirdDay(await readJson(`weather/birds/days/${date}.json`));
        if (day.date !== date) throw new Error("Bird history date mismatch");
        snapshot.day = day;
      } catch (error) {
        if ((error as {code?: number}).code === 404) return NextResponse.json({ error: "No bird history has been saved for this date." }, { status: 404 });
        throw error;
      }
    }
    return NextResponse.json(snapshot, { headers: { "cache-control": "public, max-age=30, s-maxage=30, stale-while-revalidate=30" } });
  } catch {
    return NextResponse.json({ error: "The bird listening feed is temporarily unavailable." }, { status: 503 });
  }
}
