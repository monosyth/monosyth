import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";
import { parseBirdDay, validBirdDate } from "@/lib/weather/birds";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!validBirdDate(date) || !/^bn-[1-9]\d{0,11}$/.test(id)) return NextResponse.json({ error: "Invalid sound graph" }, { status: 400 });
  try {
    const bucket = getFirebaseAdminStorageBucket();
    const [archive] = await bucket.file(`weather/birds/days/${date}.json`).download();
    if (archive.length > 5_000_000) throw new Error("Archive exceeds size limit");
    const day = parseBirdDay(JSON.parse(archive.toString("utf8")));
    // Deleted, rejected, and private detections cannot expose a previously saved graph.
    if (day.date !== date || !day.records.some(record => record.id === id && record.hasSpectrogram)) return NextResponse.json({ error: "Sound graph unavailable" }, { status: 404 });
    const [bytes] = await bucket.file(`weather/birds/spectrograms/${date}/${id}.png`).download();
    if (bytes.length > 2_000_000 || bytes.subarray(0,8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Invalid graph");
    return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": "image/png", "cache-control": "public, max-age=60, s-maxage=60", "x-content-type-options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Sound graph unavailable" }, { status: 404 });
  }
}
