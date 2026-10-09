# VT Multifamily hosting

Scott approved sharing the existing Monosyth Firebase App Hosting backend on
October 9, 2026, while keeping vtmultifamily.com in the visitor's address bar.

- Account: monosyth@gmail.com; Firebase project/backend: monosyth, us-east4.
- Public files: apps/web/public/vtmultifamily/.
- Monosyth path: https://monosyth.com/vtmultifamily.
- Primary domain: https://vtmultifamily.com; www redirects to the apex domain.
- Routing: apps/web/next.config.ts, host-specific beforeFiles rewrites.
- Deploy with the existing main-branch Firebase App Hosting flow.
- GoDaddy is the registrar. Connect both domains to this existing backend;
  do not configure GoDaddy forwarding or masking for the primary domain.
- Source migration: Vermont Properties/marketing-2026/site/dist, saved source
  commit d9929cccd33167565d40f6c1179788e6836272a2. The old ChatGPT preview is
  preserved; subsequent production edits belong in this Monosyth folder.

This is the approved Michelle Hebert / KW Vermont design with four multifamily
properties, 27 MLS listing photos and 147 public MLS fields. Property details
use hash links (for example /#property/brooklyn). Preserve the dated October 9
snapshot, source credits and noindex review status until the user requests a
content/launch change. No live IDX or stored inquiry form is included.

Keep private property documents, leases, tenant records, offers and financial
files out of this repository and public folder. The full project reference
pack is /Users/scottwaite/Desktop/Vermont Properties/agent-reference/.

Validation: run npm run lint and npm run build, start the production server,
then run node scripts/audit-vtmultifamily.mjs http://127.0.0.1:PORT. This checks
real HTTP routing with both hostnames, all referenced assets, the exact listing
inventory and isolation from Monosyth routes. Also check galleries and mobile
layout in the browser.

Domain connection/deployment completion is recorded in the Vermont Properties
website handoff; do not infer completion merely from this configuration.
