# MoveMorrow: product plan

Status: core early planner implemented. Updated September 16, 2026.

## Product decision

Turn the Seattle Move prototype into MoveMorrow, an independent consumer moving planner published by Monosyth Labs. The product name is MoveMorrow; “by Monosyth Labs” is a publisher credit. Use `/move` on `monosyth.com` as the stable initial route. Production stays on Monosyth-owned Firebase hosting.

The first release provides setup, a tailored checklist, a dated timeline, and private account saving at `/move/planner`. It uses new neutral templates and separate records; no old personal move data is connected. Budget tracking is now included. Contacts, move notes, and a dedicated moving-day view are now included; household sharing remains planned.

## Identity

The approved identity uses oxblood, chalk, charcoal, and mineral blue, with strong Archivo Black headings and IBM Plex Sans body text. The tagline is “More room for what’s next.” See [the brand guide](movemorrow-brand.md) for the shared visual and voice rules. US city autocomplete is available; editing saved housing and transport choices is the next planned enhancement.

## The promise

Help someone answer three questions: What should I do next? When does it need to happen? What will this move cost?

The product should feel like a calm, practical companion. Open the planner to the next few useful actions and an honest picture of progress. Keep the complete checklist available without making it the first thing someone must digest.

## Who the first version serves

Start with individuals and households planning a residential move within the United States. Support local and long-distance moves, renters and homeowners, people hiring movers and people doing it themselves. Allow an undecided destination or approximate move date so planning can start before everything is settled.

These are proposed scope choices, not validated market findings. The first research step is to check them with people actively preparing to move.

## First-use journey

1. Enter an origin and destination city, with “not sure yet” available. Exact street addresses are optional and unnecessary for the initial plan.
2. Choose a target move date or date window; identify rent/own at each end and DIY/hired/undecided transport. Ask about pets, storage, and temporary housing only where they affect the checklist.
3. Preview a tailored plan. Explain that suggested dates are editable planning prompts. Do not present lease, legal, or building deadlines as universal rules.
4. Create an account to save the plan. Use a consumer account flow distinct from the private Monosyth Studio's approved-account access.
5. Land on “Next up”: overdue tasks, tasks due soon, and the nearest milestone. Open the full checklist, costs, and move details from there.
6. Return to complete, skip, edit, or add tasks. Keep completed moves available for export and let the owner delete their records.

## Version one

| Area | Included | Done when |
| --- | --- | --- |
| Move setup | Cities, date/date window, housing situation, transport choice, relevant household needs | Renters and homeowners receive appropriate tasks without personal example data |
| Personal checklist | Task templates, categories, custom tasks, editable dates, done/skipped status | Changing one task persists across refresh and another signed-in device |
| Timeline | Before, during, and after the move; due-soon and overdue views | Date changes show a preview and preserve manually chosen deadlines unless the user elects to move them |
| Budget | User-entered estimates and actual costs, categories, paid status | Estimated, actual, and unpaid totals are clearly distinguished; blank amounts are not presented as confirmed zero costs |
| Move details | Notes and manually entered contacts | Information stays private to the owner and can be edited and removed |
| Moving day | A short view of essential tasks and contacts | Usable on a phone without navigating the full planning history |
| Portability | Printable checklist and export of the user's plan | A user can keep a usable copy outside the product |
| Accounts and saves | Sign-in, private records, visible save/failure state | One user cannot read or change another user's move; failed saves cannot look successful |

### Checklist content

Organize templates into planning, current-home preparation, packing, transportation, utilities and address updates, moving day, and settling in. Add optional groups for ending a lease, selling a home, pets, storage, and temporary housing.

Generate dates from the user's move date and template offsets. If the date is unknown, show phases with undated tasks. If someone starts late, highlight catch-up tasks without pretending they already missed a contractual deadline. Mark tasks complete or skipped separately; only applicable tasks count toward progress.

Example: a renter moving in six weeks with a cat and hired movers sees lease-review, mover-comparison, pet-transport, packing, utility, and handover tasks. They do not get realtor-selection or home-sale closing tasks. All defaults are neutral and editable.

### Budget behavior

Begin with moving services, truck rental, packing supplies, storage, travel, temporary housing, cleaning, and move-in expenses. Show deposits separately from nonrefundable expenses so the app does not imply they are permanently spent. Store currency and integer minor units; initially support USD. Do not carry over personal debts, house values, proceeds, realtor percentages, or financial assumptions from the prototype.

## What waits

After the core planner proves useful, consider household collaboration with explicit invitations and roles, opt-in reminders, calendar export, and a basic room/box inventory. A household should never gain access through a guessable link.

Later possibilities include reusable plans and user-added property comparisons. AI-assisted task suggestions may be useful after reliability and costs are understood. Suggestions must be reviewable and must not silently edit the plan.

Defer listing scraping, automatic apartment matching, mover marketplaces, paid referrals, mortgage/debt calculations, document uploads, native mobile apps, and international relocation. These add data, trust, or support requirements before the essential planning experience is validated.

## What to carry over from Seattle Move

| Existing idea | Product treatment |
| --- | --- |
| Staged checklist | Preserve the concept; replace hardcoded steps with conditional templates |
| Timeline | Generalize dates and phases; remove Seattle-specific and seller-only assumptions |
| Financials | Rebuild as a general moving budget; keep home-sale calculations out of version one |
| Realtor and rental research | Keep generic contact/note concepts; defer search integrations |
| Notes and history | Keep notes; add clear saved/failed state before a detailed user-facing history |
| Firebase persistence | Reuse platform experience; build private per-user records, not one shared document |
| Local fallback | Make any future offline behavior explicit and recoverable; never silently replace cloud data |
| Password screen and direct AI calls | Do not reuse as public-app authentication or secret handling |

Rebuild the public experience in the existing Next.js app with small, separate components. Use the old app as a workflow reference, not as a directory to copy wholesale. No personal photos, contacts, notes, financial records, API credentials, or old database identifiers should enter the new app or its public assets.

## Implementation outline

- Public product page: `/move`.
- Working early planner: `/move/planner`, with consumer authentication.
- Hosting: existing Next.js application on Firebase App Hosting through this repository's `main` branch.
- Data: `movemorrowUsers/{uid}/moves/current` with `tasks`, `expenses`, and `contacts` subcollections. This release supports one active move, up to 100 tasks, up to 100 budget items, and up to 50 contacts per account. Schema version 3; every move has a generation UUID and each task a stable ID. Move notes are stored on the move record.
- Access: authenticated owner-only reads and writes, field validation, and meaningful cross-account denial tests before beta. Review the current global auth provider before exposing consumer sign-in; preserve private Studio restrictions.
- Saves: update individual records rather than replacing the entire move. Track pending, saved, and failed changes visibly. Define conflict behavior for two devices; retry without duplicating tasks or expenses.
- Dates: store date-only deadlines explicitly; do not let timezone conversion shift a task to the previous day. Handle daylight saving, unknown dates, and rescheduling.
- Privacy: collect only what the planner needs, provide export/deletion, document retention, and keep private move text out of analytics and logs. Write product-specific privacy information before collecting real user data.
- AI, if added later: call providers from authenticated server endpoints with rate limits and usage controls; keep secrets out of browser bundles.

## Build sequence and release gates

1. **Concept and announcement — complete.** Use the selected name MoveMorrow, settle scope, publish an honest Coming soon page, and link it from the Monosyth Labs homepage. No inactive sign-up form or invented launch date.
2. **Core early planner — current phase.** Implement setup, conditional tasks, date logic, and personal persistence. Demonstrate two different household scenarios with synthetic data. Verify users cannot access each other's records and all save failures are visible.
3. **Complete planning alpha.** Add costs, contacts, moving-day view, and export. Check budget math, rescheduling, keyboard use, and narrow phone layouts. Run a full create/edit/reload/export/delete journey.
4. **Small invited beta.** Recruit 5–10 people with upcoming moves, with permission, and observe setup and return visits. Fix the tasks and confusing steps they actually encounter. Treat the sample as directional feedback, not proof of product-market fit.
5. **Public launch.** Confirm account recovery, privacy/deletion, support contact, monitoring, and operational costs. Keep early-version labeling until the complete planning journey is validated with users.

No launch date is committed. Estimate calendar time after choosing the alpha scope and completing the account/data foundation.

## Learning and business model

For the beta, ask whether someone can reach a useful plan without help, whether they know what to do next, whether they return to update it, and which tasks they expected but could not find. Record aggregate setup completion and return usage only after choosing an appropriate analytics/privacy approach. A proposed usability target is a useful initial plan within three minutes; this is a target to test, not a product claim.

Start with a free invited beta. Because moving is episodic, evaluate a one-time payment per move before assuming a recurring subscription. Pricing and paid features remain open until users demonstrate value and hosting/support costs are known. Do not make referral revenue or selling personal information part of the initial model.

## Naming decision

Selected September 11, 2026: **MoveMorrow**. Preserve this capitalization. Use “by Monosyth Labs” as a small publisher credit, not as part of the product name. The name covers both planning and settling in without tying the product to a particular city.

Launch-page tagline: **A big move. A clear next step.** A preliminary web search is not verification of domain or trademark availability. The initial announcement uses the existing Monosyth domain; no separate domain has been purchased or claimed. Check domain options and brand conflicts before investing in a standalone domain or formal brand registration.


## First release: implementation and limits

- Setup asks for optional cities and a single target date, housing and transport choices, pets, storage, and temporary housing. Date windows remain future work. Preview is held in memory and can be revised before saving.
- September 16 city suggestions: both setup city fields offer U.S.-only autocomplete backed by a self-hosted GeoNames snapshot of 21,785 cities and towns. Results show city and state, support mouse/keyboard selection and state abbreviations, and preserve manual entry. No external lookup subscription or new account is required. Source, attribution, coverage limits, and refresh instructions: [city data notes](movemorrow-city-data.md).
- A separate named Firebase client app (`movemorrow`) provides Google sign-in without changing the private Studio account allowlist. Preview requires no account; Save my plan is explicit after sign-in.
- `/api/move` verifies the Firebase ID token, revocation, and verified email. Ownership comes only from that token. Existing deployed Firestore rules deny all direct client access to the new collection. The server uses existing Firebase Admin credentials.
- September 16 save fix: Firebase forwards public requests to an internal Cloud Run URL. Write-origin validation uses the configured `NEXT_PUBLIC_SITE_URL` rather than that internal URL; forwarded host headers never determine trusted origins. Regression coverage reproduces this proxy path and rejects unrelated origins, lookalike domains, and invalid/unverified credentials. Earlier production checks covered reads and direct backend writes, but did not catch the public browser save path.
- Server transactions write changed task documents and plan metadata together. Move generation IDs and revisions reject stale updates, including tabs holding a deleted/recreated plan. Requests have field validation and a 12 KB body limit. Private responses are not cached.
- Next up shows the first six unfinished tasks; All tasks, Timeline, Completed, and Skipped expose the rest. Timeline groups unfinished tasks by date. Completion, skip/restore, names, notes, dates, and custom tasks save explicitly.
- Date changes preview affected tasks and preserve completed/skipped, custom, and manually dated tasks. Suggested dates are planning prompts rather than contractual deadlines.
- JSON export and printing the current view are available. Deletion requires typing DELETE and removes the active move and its task, expense, and contact documents. Authentication records and provider logs remain separate, as explained at `/move/privacy`.
- The early release has no offline persistence, reminders, multiple moves, or collaboration. Saved setup choices other than the move date cannot yet be changed; individual tasks remain editable. Failed saves stay visible and never silently substitute an empty cloud plan.

Validation commands: `npm run audit:move`, scoped ESLint, and `npm run build` in `apps/web`. The opt-in `scripts/audit-movemorrow-firebase.ts` exercises real Firestore persistence with temporary synthetic owners, including owner routing, concurrent/stale versions, unchanged task preservation, unauthenticated direct database denial, and cleanup. Identity verification is stubbed in that standalone audit; production always verifies real Firebase ID tokens. Run with `GOOGLE_CLOUD_QUOTA_PROJECT=monosyth MOVEMORROW_LIVE_AUDIT=1 node --import tsx scripts/audit-movemorrow-firebase.ts` using authorized application default credentials. Scott confirmed that the live setup, Google sign-in, save, task completion, and refresh flow all worked. No auth settings or permissions were changed for testing. Broader phone/keyboard usability review remains part of beta validation.

September 11 validation: all 11 logic/HTTP tests and scoped lint pass; production build passes. Real Firestore audit passes, including concurrent writes and complete synthetic-record cleanup. Full-repository lint still reports the existing Bag Studio declaration-order error and 1,068 warnings.


## Budget release

The Budget section shares the existing private saved move. Users can add, edit, remove, and mark items paid; switch between all and unpaid items; and track moving services, truck rental, supplies, storage, travel, housing/move-in, cleaning, utilities, and other costs. Refundable deposits have separate lists and totals. Advance payments toward a mover's final bill belong in the expense rather than the refundable-deposit group.

Amounts are USD stored as integer cents. Blank amounts are null, not zero. Estimate and actual totals disclose missing amounts; actual unpaid amounts and unpaid estimates are shown separately, with unknown unpaid items counted. Paid status requires an actual amount (zero is valid). Differences compare only items with both an estimate and an actual amount, so incomplete rows cannot create a misleading over/under total. Partial payments and deposit refunds are not yet tracked.

Existing schema-v1 moves read with an empty budget and upgrade on their next write. Older checklist clients preserve budget records because the server loads the current move before each transaction. Budget writes update only affected expense records and plan metadata; task records remain intact. Export schema version 2 includes expenses. Removing one budget item deletes its document; deleting a move also removes every expense document.

Validation adds money precision, unknown/zero amounts, payment rules, separate deposit totals, legacy compatibility, budget ownership, stale edits, and deletion coverage. The real Firestore audit now checks a synthetic legacy upgrade, budget add/edit/reload/removal, unchanged tasks and unrelated expenses, and complete move deletion. It continues to stub identity verification and never reads an existing user's move.

Budget-release verification: all 18 logic/HTTP tests, scoped ESLint, and the production build passed. The expanded real Firestore audit passed and removed all synthetic records. Scott’s earlier hands-on test confirmed the live Google sign-in and checklist save/reload flow. The new budget UI has not yet had a hands-on browser walkthrough.


## Contacts and moving-day release — September 12, 2026

Contacts & notes supports up to 50 manually entered contacts, with name, company, role, phone, email, notes, and a moving-day visibility option. Phone links normalize digits, country codes, and optional extensions. Email addresses are encoded into mail links. These actions open the user's phone or email app; adding a contact sends nothing and grants no access. Move notes (up to 2,000 characters) save explicitly and appear on moving day.

Moving day shows non-skipped tasks due on the target move date, default final-preparation tasks from the final two days (when dates have not been manually overridden), and any task the user pins in its details. Completed tasks remain visible after unfinished tasks. It uses the same task records and completion controls as the checklist. Rescheduling changes which custom dated tasks qualify, while explicit pins persist. Selected contacts and move notes appear below the tasks. Printing this view includes contact details; internet access is required to load and save the live plan.

Schema version 3 adds a contacts subcollection, a move-level notes field, and an optional movingDay flag on tasks. Older plans load with empty contacts and notes. Unrelated task/budget commands preserve these fields; edits update only affected records and metadata. Export includes contacts and notes. Full move deletion removes all child records.

Validation covers phone/email link handling, validation and limits, contacts and notes ownership, legacy loading, stale updates, moving-day selection with missing/rescheduled dates, task pins, and real Firestore persistence/deletion with temporary synthetic records. The new interfaces still need a hands-on browser walkthrough; automated database tests stub identity verification as in earlier releases.

September 12 release checks: all 25 logic/HTTP tests and scoped lint pass; production build passes. The expanded Firestore audit verifies contact and notes persistence, owner isolation, task pinning, and complete cleanup using synthetic records. Full-site lint retains the pre-existing Bag Studio declaration-order error.
