# Monosyth Web

This is the main Next.js app for `monosyth.com`.

## Getting started

```bash
nvm use 22
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Firebase setup

Copy `.env.example` to `.env.local` and fill in your Firebase web app config:

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Optional values:

- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `AMBIENT_API_KEY`
- `AMBIENT_APPLICATION_KEY`
- `AMBIENT_MAC_ADDRESS`
- `WEATHER_LIMIT`
- `AMBIENT_REQUEST_TIMEOUT_MS`
- `WEATHER_LOG_SECRET`

Station camera capture also supports:

- `STATION_CAMERA_RTSP_URL`, or the host/username/password/stream variables in `.env.example`
- `STATION_CAMERA_STORAGE_PATH` for the latest full JPEG
- `STATION_CAMERA_THUMBNAIL_STORAGE_PATH` for the lightweight hero WebP
- `STATION_CAMERA_ARCHIVE_PREFIX` for hourly daylight frames
- `STATION_CAMERA_TIME_ZONE`, `STATION_CAMERA_LATITUDE`, and `STATION_CAMERA_LONGITUDE` for daylight checks

Then enable the Google provider in Firebase Authentication.

## App Hosting

This app is deployed from Firebase App Hosting with:

- Project: `monosyth-490705`
- Repo: `monosyth/monosyth`
- Root directory: `apps/web`

Set `NEXT_PUBLIC_FIREBASE_API_KEY` in the App Hosting Environment UI instead of
committing it to source control.

## Routes

- `/`: brand home and auth-aware landing page
- `/app`: first protected app shell
- `/rsvp`: multi-event RSVP route with online submissions and admin editing
- `/weather`: Ambient Weather dashboard route
- `/shop`: quilt pattern storefront, product pages and private purchased downloads

The pattern shop's catalog, account setup, private file upload and launch checks
are documented in [`docs/pattern-shop.md`](../../docs/pattern-shop.md). Checkout
stays disabled until Stripe, email delivery and private storage are configured.

## Notes

- The app uses the Firebase Web SDK on the client.
- If Firebase keys are missing, the UI shows setup guidance instead of crashing.
- The weather route reads Ambient keys only on the server.
- `POST /api/weather/log` is available for a scheduler to persist readings into Firestore when `WEATHER_LOG_SECRET` is configured.

## Station camera archive

`npm run camera:capture` now checks local sunrise and sunset before opening the
RTSP stream. During daylight it writes the latest JPEG/WebP pair and one
idempotent archive slot for the current local hour. A five-minute local launch
agent can therefore keep the latest image fresh without retaining twelve nearly
identical files per hour; outside daylight the command exits successfully
without contacting the camera.

The Cameras tab requests only the selected day's small archive listing and
lazy-loads immutable WebP thumbnails. Full JPEG frames are fetched only when a
photo is opened. The capture must continue to run on a machine that can reach
the camera's LAN RTSP address; Firebase App Hosting cannot reach that private
stream directly.


## Weather observatory

The current weather dashboard combines a procedural Three.js sky, station
instruments, an interactive 24-hour temperature trace, a calculated daylight
arc, and the existing NWS hourly forecast. Sky terrain is illustrative; cloud
coverage is estimated from NWS descriptions. Rain streaks mean the station
reported rainfall in the past hour, not a real-time rain detector. Missing
measurements remain unavailable, and readings older than 20 minutes are
marked as delayed. Historical pages, graphs, radar, and the camera archive
remain available through the existing navigation.

Motion can be paused and respects the system reduced-motion preference. The
sky renderer stops drawing when off-screen, hidden, or paused; a CSS sky
remains available when WebGL is unavailable. Visible dashboards refresh every
five minutes. Camera previews retry automatically and show the actual capture
time instead of presenting a saved image as live video.

Run `npm run audit:weather` for data provenance, freshness, time-window,
missing-reading, forecast, compass, and daylight checks.

### Repairing the local camera schedule

Run `npm run camera:install` from this app after moving the repository. It
registers the existing five-minute LaunchAgent using the current folder and
backs up any previous configuration. `npm run camera:capture` performs one
daylight capture. Capture attempts time out after 45 seconds; camera
credentials are redacted from error messages. Node 22 is required.

The Mac must be awake, signed in, and able to reach the Tapo camera on the home
network. If the camera receives a new address, update `STATION_CAMERA_HOST`
(or the host in `STATION_CAMERA_RTSP_URL`) in the local environment. The
camera's configured Camera Account must allow RTSP. The application does not
open the camera's private video port to the internet.

If local Storage uploads report an invalid user project, set
`GOOGLE_CLOUD_QUOTA_PROJECT=monosyth` in `.env.local`. This scopes the quota
override to this app without changing shared Google Cloud credentials.
