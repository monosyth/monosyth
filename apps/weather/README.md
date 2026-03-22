# Weather Sandbox

This folder is a safe place to explore your Ambient Weather station data without mixing it into the main site yet.

## What this app gives you

- A local weather dashboard with current conditions, quick stats, and mini trend charts
- A tiny Node 22 server that keeps your Ambient keys on the server side
- A small Ambient Weather REST client
- A `devices` script to discover your stations
- A `latest` script to pull the most recent readings for one station

## Quick start

1. Create a new Ambient Weather **Application Key** in the developer area.
2. Copy `.env.example` to `.env`.
3. Fill in `AMBIENT_API_KEY` and `AMBIENT_APPLICATION_KEY`.
4. Run `npm run devices` inside this folder to see your stations.
5. Copy your station `macAddress` into `AMBIENT_MAC_ADDRESS`.
6. Leave `WEATHER_LIMIT=48` unless you want a smaller or larger recent window.
7. Start the dashboard with `npm run dev`.
8. Open `http://localhost:8787`.

## Commands

```bash
npm run dev
npm run devices
npm run latest
npm run latest:json
```

## Dashboard features

- Current-condition cards for temperature, humidity, wind, rain, pressure, and solar data when available
- Derived highlights like gust peak, recent temperature range, and rainfall totals
- Mini SVG charts for recent temperature, humidity, wind, and rain trends
- A live raw snapshot panel so we can quickly see what your specific station sends
- A refresh button plus automatic polling

## Verified API shape

On March 19, 2026, the live Ambient Weather REST API responded from:

- `GET https://api.ambientweather.net/v1/devices`

It also confirmed that requests require both query parameters:

- `apiKey`
- `applicationKey`

This starter uses those two credentials for every request and keeps them on the server side.

## Good next expansions

- Add threshold alerts for freeze risk, heat spikes, or strong wind
- Build a daily summary email or SMS
- Save readings to a local database for longer-term charts
- Add indoor sensors, lightning, or air-quality fields if your station reports them
- Publish a private family weather page

## Notes

- Do not ship these keys to a browser app or public repo.
- If `AMBIENT_MAC_ADDRESS` is blank, the `latest` command will fall back to your first device.
- `WEATHER_LIMIT` defaults to `48` recent observations and is capped at `288`.
- The dashboard route is `/api/overview`, which the browser calls through the local server.
