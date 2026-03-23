import { NextRequest, NextResponse } from "next/server";

import { getNearbyWeatherCamera } from "@/lib/weather/cameras";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cameraId = request.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (!cameraId) {
    return NextResponse.json({ error: "Camera id is required." }, { status: 400 });
  }

  const camera = getNearbyWeatherCamera(cameraId);

  if (!camera) {
    return NextResponse.json({ error: "Unknown camera." }, { status: 404 });
  }

  try {
    const upstream = await fetch(camera.imageUrl, {
      cache: "no-store",
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        ...(camera.referer ? { referer: camera.referer } : {}),
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream camera request failed with ${upstream.status}.` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=45, s-maxage=45, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
