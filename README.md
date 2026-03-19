# monosyth

The main `monosyth.com` app lives in [`apps/web`](/Users/scottwaite/monosyth/apps/web).

This repo is set up to grow into a multi-app workspace:

- `apps/web`: the primary Next.js site for the Monosyth brand

## Local development

1. Load Node with `nvm use 22`
2. Run `npm install` in `apps/web`
3. Start the app with `npm run dev`

## Firebase auth setup

The app includes a first-pass Firebase Auth foundation and a protected `/app`
route. To finish wiring it:

1. Copy `apps/web/.env.example` to `apps/web/.env.local`
2. Fill in the Firebase web app values from the `monosyth` Firebase app
3. Enable Google sign-in in Firebase Authentication
4. Restart the dev server

## Firebase App Hosting

Use Firebase App Hosting with:

- Firebase project: `monosyth-490705`
- GitHub repo: `monosyth/monosyth`
- App root directory: `apps/web`
