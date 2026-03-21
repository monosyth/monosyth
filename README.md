# monosyth

Monosyth is set up as a multi-app workspace.

## Active apps

- `apps/web`: the primary Next.js site for the Monosyth brand
- `apps/weather`: a standalone Ambient Weather app for station-data experiments

## Local development

### Main site

1. Load Node with `nvm use 22`
2. Run `npm install` in `apps/web`
3. Start the app with `npm run dev`

### Weather app

1. Load Node with `nvm use 22`
2. Run `npm install` in `apps/weather`
3. Copy `apps/weather/.env.example` to `apps/weather/.env`
4. Start it with `npm run dev`

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

## Project notes

- Full setup and deployment notes live in [`MONOSYTH_SETUP.md`](/Users/scottwaite/monosyth/MONOSYTH_SETUP.md)
