# Monosyth Project Playbook

## Project Layout

- Repo root: `/Users/scottwaite/monosyth`
- Web app: `/Users/scottwaite/monosyth/apps/web`
- Weather app: `/Users/scottwaite/monosyth/apps/weather`
- Homepage: `/Users/scottwaite/monosyth/apps/web/src/app/page.tsx`
- App shell: `/Users/scottwaite/monosyth/apps/web/src/app/app/page.tsx`
- Global layout and metadata: `/Users/scottwaite/monosyth/apps/web/src/app/layout.tsx`
- Global styles: `/Users/scottwaite/monosyth/apps/web/src/app/globals.css`
- Firebase config: `/Users/scottwaite/monosyth/apps/web/src/lib/firebase/config.ts`
- Firebase client init: `/Users/scottwaite/monosyth/apps/web/src/lib/firebase/client.ts`
- Auth provider: `/Users/scottwaite/monosyth/apps/web/src/components/auth/auth-provider.tsx`
- Firestore profile logic: `/Users/scottwaite/monosyth/apps/web/src/lib/firebase/profiles.ts`
- App Hosting config: `/Users/scottwaite/monosyth/apps/web/apphosting.yaml`

## Current Stack

- Frontend: Next.js App Router
- Hosting: Firebase App Hosting
- Auth: Firebase Authentication with Google sign-in
- Database: Firestore
- Domain: `monosyth.com` and `www.monosyth.com`
- Registrar and DNS: GoDaddy
- Google Cloud and Firebase project: `monosyth`
- App Hosting backend name: `monosyth`

## Fonts

- Main display font: `Space Grotesk`
- Mono accent font: `IBM Plex Mono`

## How I Edit

1. Work inside `/Users/scottwaite/monosyth/apps/web`.
2. Inspect the relevant files before changing them.
3. Make code edits in the app source.
4. Run lint and production build before committing.
5. Commit and push to `main`.

## Local Development

```bash
cd ~/monosyth/apps/web
source ~/.nvm/nvm.sh
nvm use 22
npm install
npm run dev
```

Local URL:

- `http://localhost:3000`

Weather app:

```bash
cd ~/monosyth/apps/weather
source ~/.nvm/nvm.sh
nvm use 22
npm install
npm run dev
```

Weather app local URL:

- `http://localhost:8787`

## Local Environment File

- Local env file: `/Users/scottwaite/monosyth/apps/web/.env.local`
- Template: `/Users/scottwaite/monosyth/apps/web/.env.example`

Important:

- Keep `.env.local` local only
- Do not commit API keys into source
- Keep the Firebase web API key in App Hosting environment settings for production

## Standard Validation Commands

```bash
cd ~/monosyth/apps/web
source ~/.nvm/nvm.sh
nvm use 22
npm run lint
npm run build
```

## Git and Deploy Flow

The production site deploys automatically from GitHub through Firebase App Hosting.

Standard flow:

```bash
cd ~/monosyth/apps/web
source ~/.nvm/nvm.sh
nvm use 22
npm run lint
npm run build

cd ~/monosyth
git add .
git commit -m "Your commit message"
git push origin main
```

When `main` updates, Firebase App Hosting creates a new rollout automatically.

## App Hosting Configuration

- GitHub repo: `monosyth/monosyth`
- Live branch: `main`
- App root directory: `apps/web`
- Backend name: `monosyth`

## Firebase and Google Full Stack Setup

### Hosting

- Firebase App Hosting serves the Next.js app
- The app is deployed from GitHub
- Custom domains are attached in Firebase App Hosting settings

### Authentication

- Firebase Authentication is enabled
- Google provider is enabled
- The app uses Firebase client auth from the browser

### Database

- Firestore database ID: `(default)`
- Firestore region: `nam5`
- User profiles are stored at `users/{uid}`

### Google OAuth Client

Authorized JavaScript origins should include:

- `https://monosyth.com`
- `https://www.monosyth.com`
- `https://monosyth.firebaseapp.com`
- `https://monosyth--monosyth.us-east4.hosted.app`
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost`
- `http://localhost:5000`

Authorized redirect URI:

- `https://monosyth.firebaseapp.com/__/auth/handler`

### Firebase Authorized Domains

In Firebase Authentication, authorized domains should include:

- `localhost`
- `monosyth.com`
- `www.monosyth.com`

## Firebase Web Config Used By The App

The app expects these values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Production note:

- `NEXT_PUBLIC_FIREBASE_API_KEY` should be set in Firebase App Hosting `Settings > Environment`
- Other public Firebase values can live in app config or environment depending on preference

## Firestore Rules

Current baseline rules pattern:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create, read, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Domain and DNS Notes

Custom domains are connected through Firebase App Hosting.

Main DNS records ended up as:

- `A @ -> 35.219.200.203`
- `A www -> 35.219.200.203`
- App Hosting claim `TXT` records for `@` and `www`
- Certificate validation `CNAME` for `_acme-challenge...`

If the site works on mobile but not on local Wi-Fi, it is usually local DNS cache.

Good public DNS resolvers:

- `1.1.1.1`
- `8.8.8.8`

## Security Rules for This Project

- Do not reveal Scott's identity publicly on the site
- Keep homepage copy generic and brand-focused
- Do not commit API keys into source again
- Restrict the active Firebase web API key by HTTP referrer

Recommended referrers:

- `https://monosyth.com/*`
- `https://www.monosyth.com/*`
- `https://monosyth.firebaseapp.com/*`
- `https://monosyth--monosyth.us-east4.hosted.app/*`
- `http://localhost:3000/*`
- `http://127.0.0.1:3000/*`

## What The Site Currently Does

- Minimal homepage with private access panel
- Google sign-in works
- `/app` exists
- Firestore profile document is created and synced on sign-in
- Profile editor exists in the signed-in area

## Good Next Steps

- Build a public profile page
- Build a private dashboard in `/app`
- Add app launcher cards for future Monosyth tools
- Add Storage if uploads or media are needed
- Add Cloud Functions or server actions later for backend workflows
- Expand Firestore collections as the app surface grows
