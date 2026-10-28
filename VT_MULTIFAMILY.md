# VT Multifamily hosting

Scott approved sharing the existing Monosyth Firebase App Hosting backend on
October 9, 2026, while keeping vtmultifamily.com in the visitor's address bar.
Later that day he requested a generic splash page and a separate Michelle site.

- Account: the owner's Google account; Firebase project/backend: monosyth, us-east4.
- Current editable splash and Michelle source: /Users/scottwaite/Desktop/Vermont Properties/marketing-2026/firebase-hosting/source/vtmultifamily/.
- Historical fallback: apps/web/public/vtmultifamily/.
- Share Michelle's site: https://monosyth.com/vtmultifamily/michellehebert.
- Splash: https://monosyth.com/vtmultifamily, and https://vtmultifamily.com
  when its domain certificate finishes activating. www redirects to the apex.
- The custom-domain path /michellehebert also serves the agent website.
- The splash uses Vermont Multifamily branding and the Vermont lake design.
  Its featured-realtor section introduces Michelle Hebert of KW Vermont and
  links to the top of her page, added at Scott’s request on October 9.
  Explore properties also opens her page without a section jump.
- Routing: apps/web/next.config.ts. The Monosyth folder and custom-domain
  paths proxy the dedicated Firebase Hosting site through external beforeFiles
  rewrites until the custom domain points there directly.
- Routine VT page edits publish from
  /Users/scottwaite/Desktop/Vermont Properties/marketing-2026/firebase-hosting/
  with `firebase deploy --only hosting --project monosyth`; the Monosyth
  App Hosting release is only needed when its routing configuration changes.
- GoDaddy is the registrar. Both domains are already configured on this backend.
  Do not configure GoDaddy forwarding or masking for the primary domain.
- The original ChatGPT preview is preserved. The files under this repository's
  public/vtmultifamily folder are retained as a historical fallback; edit the
  independent Hosting source for routine public page changes.

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
Scott then supplied a transparent revision; that is now the website copy.
Preserve its native 1409.3 × 508 proportions, outlined type, forest/clay colors
and transparent cutouts; this owner-supplied SVG supersedes earlier logo concepts
for website use. The responsive ivory header displays it at up to 360px wide on
desktop and 288px on mobile. Michelle’s page now keeps this same logo at the left of its header, with her
name and a smaller KW logo grouped beside it. The KW image is sized to match
her name’s text height (28px desktop; 20px mobile), with navigation below.

Both page footers include © 2026 VT Multifamily at Scott’s request.

The main splash includes Michelle Hebert as the featured realtor below the
landscape. Both its button and Explore properties link to
`https://vtmultifamily.com/michellehebert`, without a hash. Both Vermont logo
links return to `https://vtmultifamily.com/`, including when viewed through
the Monosyth folder URL.

Scott removed the top WEBSITE CONCEPT / Listing snapshot banner from Michelle’s
page. Dated listing-source notes and search-indexing settings were not changed
by that presentation request.

## Independent Hosting target — October 9, 2026

Scott requested a separate publishing target so text, image, and link edits can
publish without a Monosyth rebuild. The site `vtmultifamily-monosyth` was
created inside Firebase project `monosyth` and populated from the latest
public VT files. Its Hosting origin is
https://vtmultifamily-monosyth.firebaseapp.com. The main and Michelle pages
were verified there before this one-time routing change. The existing
`vtmultifamily.com` and `www.vtmultifamily.com` custom domains still require
DNS migration from App Hosting to this site; see the Vermont website handoff
for current domain state. The one-time proxy release allows independent page
publishing through those addresses in the meantime; verify it live before
relying on that route.

The Monosyth folder and the current App Hosting entry point for the custom
domain proxy to the Hosting origin. Once this routing commit is live, routine
page edits publish independently at both addresses even while the direct DNS
migration waits for Firebase's certificate. The route audit checks
65 HTTP cases, including page equality, 37 linked assets against that origin,
all four properties, 27 photos, and 147 MLS fields. The old public copy is
kept for rollback and dated history, and the original ChatGPT preview is
unchanged.
