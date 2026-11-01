import { NextResponse } from "next/server";

import { requireKitchenUser } from "@/lib/kitchen/auth-server";
import type { Store } from "@/lib/kitchen/types";

export const runtime = "nodejs";

type Point = { lat: number; lng: number; label: string };

const UA = "DallasKitchen/0.1 (monosyth.com meal planner)";

export async function GET(request: Request) {
  const user = await requireKitchenUser(request);
  if (user instanceof NextResponse) return user;

  const params = new URL(request.url).searchParams;
  const zip = (params.get("zip") ?? "").trim();
  const query = (params.get("q") ?? "").trim().slice(0, 80);
  const miles = Math.min(30, Math.max(2, Number(params.get("miles")) || 10));

  let center: Point | null = null;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (Number.isFinite(lat) && Number.isFinite(lng) && params.get("lat")) {
    center = { lat, lng, label: "your location" };
  } else if (/^\d{5}$/.test(zip)) {
    center = await geocodeZip(zip);
    if (!center) {
      return NextResponse.json({ error: "We couldn't find that zip code. Double-check it and try again." }, { status: 422 });
    }
  } else {
    return NextResponse.json({ error: "Type a 5-digit zip code, or tap “Use my location.”" }, { status: 422 });
  }

  try {
    const stores = process.env.GOOGLE_MAPS_API_KEY
      ? await googleStores(center, query, miles)
      : await openStreetMapStores(center, query, miles);
    return NextResponse.json({ center, stores: stores.filter(s => (s.distanceMiles ?? 0) <= miles * 1.5).slice(0, 25) });
  } catch (error) {
    console.error("Store search failed", error);
    return NextResponse.json({ error: "Store search is having trouble right now. Try again in a minute." }, { status: 502 });
  }
}

async function geocodeZip(zip: string): Promise<Point | null> {
  const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    places?: Array<{ latitude: string; longitude: string; "place name": string; "state abbreviation": string }>;
  };
  const place = data.places?.[0];
  if (!place) return null;
  return {
    lat: Number(place.latitude),
    lng: Number(place.longitude),
    label: `${place["place name"]}, ${place["state abbreviation"]} ${zip}`,
  };
}

async function googleStores(center: Point, query: string, miles: number): Promise<Store[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY ?? "",
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery: query || "grocery store",
      pageSize: 20,
      locationBias: {
        circle: { center: { latitude: center.lat, longitude: center.lng }, radius: Math.min(50000, miles * 1609) },
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      location: { latitude: number; longitude: number };
      googleMapsUri?: string;
    }>;
  };
  return (data.places ?? [])
    .map(place => ({
      id: `g_${place.id}`,
      name: place.displayName?.text ?? "Grocery store",
      address: (place.formattedAddress ?? "").replace(/, USA$/, ""),
      lat: place.location.latitude,
      lng: place.location.longitude,
      distanceMiles: milesBetween(center, place.location.latitude, place.location.longitude),
      mapsUrl: place.googleMapsUri ?? mapsLink(place.displayName?.text ?? "", place.formattedAddress ?? ""),
    }))
    .filter(store => !NOT_GROCERY.test(store.name))
    .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
}

// Text search for "Costco" also returns its gas station, pharmacy, and so on.
const NOT_GROCERY = /\b(gas|fuel|pharmacy|optical|tire|car wash|hearing|photo|liquor|business center)\b/i;

async function openStreetMapStores(center: Point, query: string, miles: number): Promise<Store[]> {
  const meters = Math.round(miles * 1609);
  const overpass = `[out:json][timeout:25];(nwr["shop"~"^(supermarket|wholesale|greengrocer|grocery|butcher|health_food)$"](around:${meters},${center.lat},${center.lng}););out center tags 200;`;
  // Public map servers are sometimes slow, so ask two and use whichever answers first.
  const ask = async (endpoint: string) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: `data=${encodeURIComponent(overpass)}`,
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    return res;
  };
  const res = await Promise.any([
    ask("https://overpass-api.de/api/interpreter"),
    ask("https://overpass.kumi.systems/api/interpreter"),
  ]);
  const data = (await res.json()) as {
    elements: Array<{
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };
  const needle = query.toLowerCase().replace(/[’']/g, "");
  return data.elements
    .map(el => {
      const tags = el.tags ?? {};
      const lat = el.lat ?? el.center?.lat ?? 0;
      const lng = el.lon ?? el.center?.lon ?? 0;
      const name = tags.name ?? tags.brand ?? "";
      const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
      const address = [street, tags["addr:city"]].filter(Boolean).join(", ");
      return {
        id: `o_${el.type}${el.id}`,
        name,
        address,
        lat,
        lng,
        distanceMiles: milesBetween(center, lat, lng),
        mapsUrl: mapsLink(name, address || `${lat},${lng}`),
      };
    })
    .filter(store => store.name && (!needle || store.name.toLowerCase().replace(/[’']/g, "").includes(needle)))
    .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
}

function mapsLink(name: string, address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`.trim())}`;
}

function milesBetween(a: Point, lat: number, lng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.lat);
  const dLng = toRad(lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(3958.8 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10;
}
