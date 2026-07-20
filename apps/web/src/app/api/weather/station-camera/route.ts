import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_OBJECT_PATH = "weather/station-camera/latest.jpg";
const DEFAULT_THUMBNAIL_OBJECT_PATH = "weather/station-camera/latest.webp";
const DEFAULT_ARCHIVE_PREFIX = "weather/station-camera/archive";
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FRAME_FILE_PATTERN = /^\d{2}-(?:gmt)?[a-z0-9+-]+\.(?:jpe?g|webp)$/i;

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";
  const fileName = request.nextUrl.searchParams.get("file")?.trim() ?? "";
  const wantsThumbnail = request.nextUrl.searchParams.get("variant") === "thumbnail";

  if ((date || fileName) && (!DAY_KEY_PATTERN.test(date) || !FRAME_FILE_PATTERN.test(fileName))) {
    return NextResponse.json({ error: "Invalid station camera frame." }, { status: 400 });
  }

  const archivePrefix =
    process.env.STATION_CAMERA_ARCHIVE_PREFIX?.trim().replace(/\/+$/, "") ||
    DEFAULT_ARCHIVE_PREFIX;
  const latestObjectPath =
    process.env.STATION_CAMERA_STORAGE_PATH?.trim() || DEFAULT_OBJECT_PATH;
  const latestThumbnailObjectPath =
    process.env.STATION_CAMERA_THUMBNAIL_STORAGE_PATH?.trim() ||
    DEFAULT_THUMBNAIL_OBJECT_PATH;
  const isArchive = Boolean(date && fileName);
  const objectPath = isArchive
    ? `${archivePrefix}/${date}/${fileName}`
    : wantsThumbnail
      ? latestThumbnailObjectPath
      : latestObjectPath;

  try {
    const image = await readStationCameraImage(objectPath).catch(() => null);

    if (!image) {
      return NextResponse.json(
        { error: "Station camera image is not available yet." },
        { status: 404 },
      );
    }

    const { buffer, metadata } = image;
    const capturedAt = metadata.metadata?.capturedAt ?? "";

    const headers = new Headers({
      "content-type": metadata.contentType || "image/jpeg",
      "cache-control":
        metadata.cacheControl ||
        (isArchive
          ? "public, max-age=31536000, immutable"
          : "public, max-age=60, s-maxage=300, stale-while-revalidate=900"),
      "content-length": String(buffer.byteLength),
      "x-station-camera-source": "firebase-storage",
    });

    if (capturedAt) {
      headers.set("x-station-camera-captured-at", String(capturedAt));
    }

    if (metadata.etag) {
      headers.set("etag", metadata.etag);
    }

    if (metadata.updated) {
      headers.set("last-modified", new Date(metadata.updated).toUTCString());
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

async function readStationCameraImage(objectPath: string) {
  const file = getFirebaseAdminStorageBucket().file(objectPath);
  const [[buffer], [metadata]] = await Promise.all([
    file.download(),
    file.getMetadata(),
  ]);

  return { buffer, metadata };
}
