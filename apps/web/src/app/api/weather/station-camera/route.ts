import { NextResponse } from "next/server";
import { getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_OBJECT_PATH = "weather/station-camera/latest.jpg";

export async function GET() {
  const objectPath = process.env.STATION_CAMERA_STORAGE_PATH?.trim() || DEFAULT_OBJECT_PATH;

  try {
    const file = getFirebaseAdminStorageBucket().file(objectPath);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { error: "Station camera image is not available yet." },
        { status: 404 },
      );
    }

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const capturedAt = metadata.metadata?.capturedAt ?? "";

    const headers = new Headers({
      "content-type": metadata.contentType || "image/jpeg",
      "cache-control":
        metadata.cacheControl || "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      "x-station-camera-source": "firebase-storage",
    });

    if (capturedAt) {
      headers.set("x-station-camera-captured-at", String(capturedAt));
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Station camera image could not be loaded." },
      { status: 502 },
    );
  }
}
