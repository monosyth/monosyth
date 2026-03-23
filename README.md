# monosyth

Monosyth is set up as a multi-app workspace.

Use this file as the quick overview.
For the full working playbook, deployment notes, and Firebase setup, read [`MONOSYTH_SETUP.md`](/Users/scottwaite/monosyth/MONOSYTH_SETUP.md).

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

## Deployment preference

- When the user says `deploy`, treat that as approval to proceed with the normal deployment flow for this repo without asking for an extra conversational confirmation step first.
- For the main site, that normally means committing the current intended changes and pushing `main` so Firebase App Hosting can roll out the update.
- In Codex desktop, a tool-level approval popup may still appear for commands like `git commit` or `git push` if the sandbox requires it. That popup is enforced by the runtime, not by project policy.
- If the environment has already approved the needed Git command prefixes, deploy can proceed without any extra interruption.

## Project notes

- `README.md`: quick repo overview
- [`MONOSYTH_SETUP.md`](/Users/scottwaite/monosyth/MONOSYTH_SETUP.md): detailed setup, deploy, and platform playbook
