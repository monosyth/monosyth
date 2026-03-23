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
      return fallbackToSkyline();
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
    return fallbackToSkyline();
  }
}

async function fallbackToSkyline() {
  const response = await fetch(new URL("/api/weather/webcam", process.env.NEXT_PUBLIC_SITE_URL || "https://monosyth.com"), {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Station camera image is not available yet." },
      { status: 502 },
    );
  }

  const buffer = await response.arrayBuffer();

  const headers = new Headers({
    "content-type": response.headers.get("content-type") || "image/jpeg",
    "cache-control":
      response.headers.get("cache-control") || "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    "x-station-camera-source": "skyline-fallback",
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers,
  });
}
