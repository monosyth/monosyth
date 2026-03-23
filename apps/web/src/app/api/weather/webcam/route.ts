import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

export const dynamic = "force-dynamic";

const SKYLINE_PAGE_URL =
  "https://www.skylinewebcams.com/en/webcam/united-states/washington/seattle/panorama.html";
const SKYLINE_FALLBACK_IMAGE_URL = "https://cdn.skylinewebcams.com/social5024.jpg";

export async function GET() {
  try {
    const screenshot = await captureSkylineFrame();

    return new NextResponse(new Uint8Array(screenshot), {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return proxyFallbackImage();
  }
}

async function captureSkylineFrame() {
  const executablePath = await chromium.executablePath();
  const browser = await playwrightChromium.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1427, height: 974 },
    });

    await page.goto(SKYLINE_PAGE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForSelector("#skylinewebcams", {
      state: "visible",
      timeout: 20_000,
    });

    // Give the embedded live player a moment to stabilize and hide transient controls.
    await page.mouse.move(10, 10);
    await page.waitForTimeout(3000);

    const frame = page.locator("#skylinewebcams");
    return await frame.screenshot({
      type: "jpeg",
      quality: 80,
    });
  } finally {
    await browser.close();
  }
}

async function proxyFallbackImage() {
  const upstream = await fetch(SKYLINE_FALLBACK_IMAGE_URL, {
    cache: "no-store",
    headers: {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Fallback webcam image request failed with ${upstream.status}.` },
      { status: 502 },
    );
  }

  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
