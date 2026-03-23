import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import nextEnv from "@next/env";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DEFAULT_OBJECT_PATH = "weather/station-camera/latest.jpg";

async function main() {
  const config = readStationCameraConfig();
  const tempDir = await mkdtemp(path.join(tmpdir(), "station-camera-"));
  const outputPath = path.join(tempDir, `${randomUUID()}.jpg`);

  try {
    await captureFrame(config.rtspUrl, outputPath);
    const buffer = await readFile(outputPath);
    await uploadFrame(buffer, config.objectPath);

    console.log(
      JSON.stringify(
        {
          ok: true,
          objectPath: config.objectPath,
          capturedAt: new Date().toISOString(),
          bucket: config.bucketName,
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
  const explicitRtspUrl = process.env.STATION_CAMERA_RTSP_URL?.trim() ?? "";
  const host = process.env.STATION_CAMERA_HOST?.trim() ?? "";
  const username = process.env.STATION_CAMERA_USERNAME?.trim() ?? "";
  const password = process.env.STATION_CAMERA_PASSWORD?.trim() ?? "";
  const port = process.env.STATION_CAMERA_PORT?.trim() || "554";
  const streamPath = (process.env.STATION_CAMERA_STREAM_PATH?.trim() || "stream1").replace(
    /^\/+/,
    "",
  );

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
    objectPath,
    rtspUrl,
  };
}

function captureFrame(rtspUrl, outputPath) {
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
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-vf",
    "scale='min(1600,iw)':-2",
    outputPath,
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
          stderr.trim() || `ffmpeg exited with status ${code ?? "unknown"} while capturing station camera frame.`,
        ),
      );
    });
  });
}

async function uploadFrame(buffer, objectPath) {
  const bucket = getFirebaseStorageBucket();
  const file = bucket.file(objectPath);
  const capturedAt = new Date().toISOString();

  await file.save(buffer, {
    resumable: false,
    contentType: "image/jpeg",
    metadata: {
      cacheControl: "public, max-age=60",
      metadata: {
        capturedAt,
        source: "tapo-rtsp",
      },
    },
  });
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
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
