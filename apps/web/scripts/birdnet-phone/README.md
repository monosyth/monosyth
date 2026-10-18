# BirdNET phone field test

The public files at `apps/web/public/weather/field-listen/` are an adapted build of BirdNET-Team's real-time web app. They let a phone identify bird sounds locally in its browser, separately from the stationary camera feed. The weather card links to `/weather/listen`, which redirects to the static test page.

Source: https://github.com/birdnet-team/real-time-pwa
Pinned upstream revision: `6ab67ac09fa64d98858b90f14318229aca9bb7dc`
Model: BirdNET v2.4, CC BY-SA 4.0. Application: MIT. The built page includes a third-party license notice.

To rebuild, clone the pinned revision in a temporary directory, apply `monosyth.patch`, run `npm ci` and `npm run build`, and replace the static files in `apps/web/public/weather/field-listen/` with the generated `_site/` contents. Keep only the listening page, `legal/index.html`, and their required assets. The customized build uses `/weather/field-listen/` as its base path and turns location off by default. Do not add the upstream institutional privacy notice back to the hosted page.

This is a field test. Bird suggestions remain on the phone and are not added to the weather station's BirdNET history. The model download is about 64 MB, so a first visit is best on Wi-Fi. Microphone access requires HTTPS and a user tap on Start.
