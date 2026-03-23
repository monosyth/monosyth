import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LIVE_IMAGE_SOURCES = [
  {
    url: "https://i.ytimg.com/vi/4cgSE12k9Sc/maxresdefault_live.jpg",
    source: "youtube-maxres-live",
  },
  {
    url: "https://i.ytimg.com/vi/4cgSE12k9Sc/hqdefault_live.jpg",
    source: "youtube-hq-live",
  },
  {
    url: "https://cdn.skylinewebcams.com/live5024.jpg",
    source: "skyline-live",
  },
  {
    url: "https://cdn.skylinewebcams.com/social5024.jpg",
    source: "skyline-social-fallback",
  },
] as const;

export async function GET() {
  for (const candidate of LIVE_IMAGE_SOURCES) {
    const response = await fetchImage(candidate.url);

    if (!response) {
      continue;
    }

    return responseImage(response, candidate.source);
  }

  return NextResponse.json(
    {
      error:
        "Unable to load a current Skyline webcam frame from YouTube or SkylineWebcams.",
    },
    { status: 502 },
  );
}

async function fetchImage(url: string) {
  try {
    const upstream = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      },
    });

    if (!upstream.ok) {
      return null;
    }

    return upstream;
  } catch {
    return null;
  }
}

async function responseImage(upstream: Response, source: string) {
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      "x-webcam-source": source,
    },
  });
}
