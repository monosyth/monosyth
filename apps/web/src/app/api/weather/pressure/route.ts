import { NextRequest, NextResponse } from "next/server";
import { readStoredWeatherObservationsBetween } from "@/lib/weather/history";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const now = Date.now();
  const hours = Number(request.nextUrl.searchParams.get("hours") ?? "48");
  const endValue = request.nextUrl.searchParams.get("end");
  const end = endValue ? Date.parse(endValue) : now;
  if (!Number.isInteger(hours) || hours < 1 || hours > 168 || !Number.isFinite(end) || end > now + 60_000 || end < now - 366*86_400_000) return NextResponse.json({error:"Choose 1–168 hours and a valid recent end time."},{status:400});
  const from = end - hours*3_600_000;
  try {
    const rows = await readStoredWeatherObservationsBetween({macAddress:process.env.AMBIENT_MAC_ADDRESS?.trim(),startMs:from,endMs:end,limit:10000});
    const readings = rows.flatMap(row => typeof row.timestamp === "number" && row.timestamp <= now && typeof row.baromrelin === "number" && Number.isFinite(row.baromrelin) && row.baromrelin>=20 && row.baromrelin<=35 ? [{timestamp:new Date(row.timestamp).toISOString(),pressureInHg:row.baromrelin}] : []);
    return NextResponse.json({version:1,source:"Shoreline weather station",field:"baromrelin",unit:"inHg",from:new Date(from).toISOString(),to:new Date(end).toISOString(),retrievedAt:new Date(now).toISOString(),readings,truncated:rows.length>=10000},{headers:{"cache-control":"public, max-age=300, s-maxage=300"}});
  } catch { return NextResponse.json({error:"Station pressure history is temporarily unavailable."},{status:503}); }
}
