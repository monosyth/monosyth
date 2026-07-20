import { NextRequest, NextResponse } from "next/server";

import { getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";
import { getWeatherDayKey } from "@/lib/weather/time";

export const dynamic = "force-dynamic";

const DEFAULT_OBJECT_PATH = "weather/station-camera/latest.jpg";
const DEFAULT_ARCHIVE_PREFIX = "weather/station-camera/archive";
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const requestedDate = request.nextUrl.searchParams.get("date")?.trim() ?? "";
  const date = requestedDate || getWeatherDayKey(new Date());

  if (!DAY_KEY_PATTERN.test(date)) {
    return NextResponse.json({ error: "A valid archive date is required." }, { status: 400 });
  }

  const archivePrefix =
    process.env.STATION_CAMERA_ARCHIVE_PREFIX?.trim().replace(/\/+$/, "") ||
    DEFAULT_ARCHIVE_PREFIX;
  const latestObjectPath =
    process.env.STATION_CAMERA_STORAGE_PATH?.trim() || DEFAULT_OBJECT_PATH;
  const dayPrefix = `${archivePrefix}/${date}/`;

  try {
    const bucket = getFirebaseAdminStorageBucket();
    const [files] = await bucket.getFiles({
      autoPaginate: false,
      maxResults: 64,
      prefix: dayPrefix,
    });
    const latestMetadata = await bucket
      .file(latestObjectPath)
      .getMetadata()
      .then(([metadata]) => metadata)
      .catch(() => null);
    const frames = files
      .filter((file) => /\.jpe?g$/i.test(file.name))
      .map((file) => {
        const fileName = file.name.slice(dayPrefix.length);
        const capturedAt = String(
          file.metadata.metadata?.capturedAt || file.metadata.updated || "",
        );
        const thumbnailFileName = fileName.replace(/\.jpe?g$/i, ".webp");

        return {
          capturedAt,
          fileName,
          fullImageUrl: buildFrameUrl(date, fileName),
          imageUrl: buildFrameUrl(date, thumbnailFileName),
        };
      })
      .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));
    const latestCapturedAt = String(latestMetadata?.metadata?.capturedAt ?? "");
    const latestAgeMs = latestCapturedAt
      ? Date.now() - Date.parse(latestCapturedAt)
      : Number.POSITIVE_INFINITY;
    const isCurrentDay = date === getWeatherDayKey(new Date());

    return NextResponse.json(
      {
        date,
        frames,
        latest: latestMetadata
          ? {
              capturedAt: latestCapturedAt,
              fullImageUrl: "/api/weather/station-camera",
              imageUrl: "/api/weather/station-camera?variant=thumbnail",
              isStale:
                !Number.isFinite(latestAgeMs) || latestAgeMs > 24 * 60 * 60 * 1000,
            }
          : null,
      },
      {
        headers: {
          "cache-control": isCurrentDay
            ? "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
            : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Station camera archive could not be loaded.",
      },
      { status: 502 },
    );
  }
}

function buildFrameUrl(date: string, fileName: string) {
  const params = new URLSearchParams({ date, file: fileName });
  return `/api/weather/station-camera?${params.toString()}`;
}
