# VT Multifamily hosting

Scott approved sharing the existing Monosyth Firebase App Hosting backend on
October 9, 2026, while keeping vtmultifamily.com in the visitor's address bar.
Later that day he requested a generic splash page and a separate Michelle site.

- Account: monosyth@gmail.com; Firebase project/backend: monosyth, us-east4.
- Generic splash: apps/web/public/vtmultifamily/index.html and styles.css.
- Michelle's complete site: apps/web/public/vtmultifamily/michellehebert/.
- Share Michelle's site: https://monosyth.com/vtmultifamily/michellehebert.
- Splash: https://monosyth.com/vtmultifamily, and https://vtmultifamily.com
  when its domain certificate finishes activating. www redirects to the apex.
- The custom-domain path /michellehebert also serves the agent website.
- The splash uses the Vermont lake design and has no agent/brokerage branding.
  Its Explore properties button opens the separate agent site's collection.
- Routing: apps/web/next.config.ts, host-specific beforeFiles rewrites.
- Deploy through the existing main-branch Firebase App Hosting flow.
- GoDaddy is the registrar. Both domains are already configured on this backend.
  Do not configure GoDaddy forwarding or masking for the primary domain.
- The original ChatGPT preview is preserved; production edits belong here.

Michelle's page preserves the KW Vermont design, four multifamily properties,
27 MLS listing photos and 147 public MLS fields. Property links use hashes,
for example /vtmultifamily/michellehebert#property/brooklyn. Legacy property
hashes on the splash redirect to the new page and retain query/hash values.
Preserve the dated October 9 snapshot, source credits and noindex review status
until the user requests a content/launch change. No live IDX or lead storage.

Keep private property documents, leases, tenant records, offers and financial
files out of this repository and public folder. Full project reference pack:
/Users/scottwaite/Desktop/Vermont Properties/agent-reference/.

Validation: build the app, start the production server, then run
node scripts/audit-vtmultifamily.mjs http://127.0.0.1:PORT.
This checks the splash and agent routes, all referenced assets, inventory,
www redirects, and isolation from Monosyth routes. Check the splash on mobile
and property galleries in the browser. Run lint for changed JavaScript/config.
The previous full lint run found an unrelated existing applySnapshot error in
src/components/app/bag-studio/index.tsx; do not modify that tool for this task.

Domain activation and deployment results are in the Vermont website handoff;
saved DNS alone does not prove successful HTTPS activation.

## Logo update — October 9, 2026

Scott supplied the updated logo at
`/Users/scottwaite/monosyth/vtmultifamily/vtmultifamily.svg`. The splash header
uses an exact copy at `apps/web/public/vtmultifamily/assets/vtmultifamily-logo.svg`.
Preserve its native 1409.31 × 508 proportions, outlined type, forest/clay colors
and light house details; this owner-supplied SVG supersedes earlier logo concepts
for website use. The responsive ivory header displays it at up to 360px wide on
desktop and 288px on mobile. Michelle’s separate page retains its own branding.
