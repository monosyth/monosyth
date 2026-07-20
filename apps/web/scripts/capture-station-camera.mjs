import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import nextEnv from "@next/env";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getTimes } from "suncalc";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DEFAULT_OBJECT_PATH = "weather/station-camera/latest.jpg";
const DEFAULT_THUMBNAIL_OBJECT_PATH = "weather/station-camera/latest.webp";
const DEFAULT_ARCHIVE_PREFIX = "weather/station-camera/archive";
const DEFAULT_TIME_ZONE = "America/Los_Angeles";
const DEFAULT_LATITUDE = 47.7565;
const DEFAULT_LONGITUDE = -122.345;

async function main() {
  const config = readStationCameraConfig();
  const capturedAt = new Date();
  const daylight = describeDaylight(capturedAt, config);

  if (!daylight.isDaylight) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          reason: "outside-daylight-hours",
          sunrise: daylight.sunrise.toISOString(),
          sunset: daylight.sunset.toISOString(),
          checkedAt: capturedAt.toISOString(),
        },
        null,
        2,
      ),
    );
    return;
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "station-camera-"));
  const captureId = randomUUID();
  const outputPath = path.join(tempDir, `${captureId}.jpg`);
  const thumbnailPath = path.join(tempDir, `${captureId}.webp`);

  try {
    await captureFrames(config.rtspUrl, outputPath, thumbnailPath);
    const [buffer, thumbnailBuffer] = await Promise.all([
      readFile(outputPath),
      readFile(thumbnailPath),
    ]);
    const archiveSlot = buildArchiveSlot(capturedAt, config);

    await Promise.all([
      uploadFrame(buffer, config.objectPath, {
        cacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=900",
        capturedAt,
        contentType: "image/jpeg",
        variant: "full",
      }),
      uploadFrame(thumbnailBuffer, config.thumbnailObjectPath, {
        cacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=900",
        capturedAt,
        contentType: "image/webp",
        variant: "thumbnail",
      }),
      uploadFrame(buffer, archiveSlot.objectPath, {
        cacheControl: "public, max-age=31536000, immutable",
        capturedAt,
        contentType: "image/jpeg",
        variant: "archive-full",
      }),
      uploadFrame(thumbnailBuffer, archiveSlot.thumbnailObjectPath, {
        cacheControl: "public, max-age=31536000, immutable",
        capturedAt,
        contentType: "image/webp",
        variant: "archive-thumbnail",
      }),
    ]);

    console.log(
      JSON.stringify(
        {
          ok: true,
          objectPath: config.objectPath,
          thumbnailObjectPath: config.thumbnailObjectPath,
          archiveObjectPath: archiveSlot.objectPath,
          archiveThumbnailObjectPath: archiveSlot.thumbnailObjectPath,
          capturedAt: capturedAt.toISOString(),
          bucket: config.bucketName,
          dateKey: archiveSlot.dateKey,
          hour: archiveSlot.hour,
        },
        null,
        2,
      ),
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function readStationCameraConfig() {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? "";
  const objectPath = process.env.STATION_CAMERA_STORAGE_PATH?.trim() || DEFAULT_OBJECT_PATH;
  const thumbnailObjectPath =
    process.env.STATION_CAMERA_THUMBNAIL_STORAGE_PATH?.trim() ||
    DEFAULT_THUMBNAIL_OBJECT_PATH;
  const archivePrefix =
    process.env.STATION_CAMERA_ARCHIVE_PREFIX?.trim().replace(/\/+$/, "") ||
    DEFAULT_ARCHIVE_PREFIX;
  const explicitRtspUrl = process.env.STATION_CAMERA_RTSP_URL?.trim() ?? "";
  const host = process.env.STATION_CAMERA_HOST?.trim() ?? "";
  const username = process.env.STATION_CAMERA_USERNAME?.trim() ?? "";
  const password = process.env.STATION_CAMERA_PASSWORD?.trim() ?? "";
  const port = process.env.STATION_CAMERA_PORT?.trim() || "554";
  const streamPath = (process.env.STATION_CAMERA_STREAM_PATH?.trim() || "stream1").replace(
    /^\/+/,
    "",
  );
  const latitude = parseCoordinate(
    process.env.STATION_CAMERA_LATITUDE,
    DEFAULT_LATITUDE,
    -90,
    90,
  );
  const longitude = parseCoordinate(
    process.env.STATION_CAMERA_LONGITUDE,
    DEFAULT_LONGITUDE,
    -180,
    180,
  );
  const timeZone = process.env.STATION_CAMERA_TIME_ZONE?.trim() || DEFAULT_TIME_ZONE;

  if (!bucketName) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required for station camera uploads.");
  }

  const rtspUrl =
    explicitRtspUrl ||
    (host && username && password
      ? `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${streamPath}`
      : "");

  if (!rtspUrl) {
    throw new Error(
      "Set STATION_CAMERA_RTSP_URL or provide STATION_CAMERA_HOST, STATION_CAMERA_USERNAME, and STATION_CAMERA_PASSWORD.",
    );
  }

  return {
    bucketName,
    archivePrefix,
    latitude,
    longitude,
    objectPath,
    rtspUrl,
    thumbnailObjectPath,
    timeZone,
  };
}

function captureFrames(rtspUrl, outputPath, thumbnailPath) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not return a usable ffmpeg binary path.");
  }

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-rtsp_transport",
    "tcp",
    "-i",
    rtspUrl,
    "-filter_complex",
    "[0:v]split=2[full][thumb];[full]scale='min(1600,iw)':-2[fullout];[thumb]scale='min(800,iw)':-2[thumbout]",
    "-map",
    "[fullout]",
    "-frames:v",
    "1",
    "-q:v",
    "3",
    outputPath,
    "-map",
    "[thumbout]",
    "-frames:v",
    "1",
    "-c:v",
    "libwebp",
    "-q:v",
    "72",
    thumbnailPath,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          redactCameraCredentials(
            stderr.trim() ||
              `ffmpeg exited with status ${code ?? "unknown"} while capturing station camera frame.`,
          ),
        ),
      );
    });
  });
}

async function uploadFrame(buffer, objectPath, metadata) {
  const bucket = getFirebaseStorageBucket();
  const file = bucket.file(objectPath);

  await file.save(buffer, {
    resumable: false,
    contentType: metadata.contentType,
    metadata: {
      cacheControl: metadata.cacheControl,
      metadata: {
        capturedAt: metadata.capturedAt.toISOString(),
        source: "tapo-rtsp",
        variant: metadata.variant,
      },
    },
  });
}

function describeDaylight(date, config) {
  const { sunrise, sunset } = getTimes(date, config.latitude, config.longitude);

  return {
    isDaylight: date.getTime() >= sunrise.getTime() && date.getTime() < sunset.getTime(),
    sunrise,
    sunset,
  };
}

function buildArchiveSlot(date, config) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  const dateKey = `${value("year")}-${value("month")}-${value("day")}`;
  const hour = value("hour");
  const offset = value("timeZoneName").toLowerCase().replace(/[^a-z0-9+-]+/g, "");
  const slot = `${hour}-${offset || "local"}`;
  const dayPrefix = `${config.archivePrefix}/${dateKey}`;

  return {
    dateKey,
    hour,
    objectPath: `${dayPrefix}/${slot}.jpg`,
    thumbnailObjectPath: `${dayPrefix}/${slot}.webp`,
  };
}

function parseCoordinate(rawValue, fallback, min, max) {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function redactCameraCredentials(message) {
  return message.replace(/rtsp:\/\/[^@\s]+@/gi, "rtsp://<credentials-redacted>@");
}

function getFirebaseStorageBucket() {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

  if (!bucketName) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required.");
  }

  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: applicationDefault(),
          projectId:
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
            process.env.GCLOUD_PROJECT ||
            "monosyth",
          storageBucket: bucketName,
        });

  return getStorage(app).bucket(bucketName);
}

main().catch((error) => {
  console.error(redactCameraCredentials(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
