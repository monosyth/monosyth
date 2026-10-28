# Monosyth Type storefront

Everyday Carved is sold at https://monosyth.com/shop/type, linked from the main
/shop page and shared shop navigation. The production Firebase project is
`monosyth`, backend `monosyth`, in `us-east4`. Deploy through the repository's
normal main-branch App Hosting rollout.

## Approved launch catalog

Owner-approved October 27, 2026; merchant is the existing Monosyth Labs Stripe
account. Prices are one-time USD amounts, exclusive of applicable tax.

| Edition | Price | Release SKU | Buyer kit |
| --- | --- | --- | --- |
| Desktop | $8 | everyday-carved-desktop@1.600 | OTF, TTF, guide, specimen, character inventory and desktop license |
| Desktop + Web | $12 | everyday-carved-desktop-web@1.600 | Desktop kit plus WOFF2, CSS and web license |

Desktop is one named user's seat. Desktop + Web adds one website project,
including staging, subdomains and translated domains, with no pageview cap or
recurring font fee. The full written terms appear before purchase and in each
kit. The source license names Scott Waite trading as Monosyth Type as licensor;
Monosyth Labs is the payment merchant.

The two immutable live Stripe price IDs are mapped by release SKU in
`apps/web/src/lib/shop/stripe-live-catalog.json`. Font entries have their own
catalog and downloaded-software tax code (`txcd_10202003`, business use), rather
than the digital-document code used for quilt patterns. Washington's existing
Stripe Tax registration was verified active on October 27. Existing runtime
automatic tax settings and registration were retained.

## Payment and delivery

Font buttons create hosted Stripe Checkout Sessions through the existing
`/api/shop/checkout` API. Amounts, release metadata, return URL and download key
are supplied by the server. The existing embedded checkout and cart continue to
serve the pattern collection. A request containing both font editions is refused
because Desktop + Web includes Desktop.

The existing signed webhook handles completed and asynchronous successful
payments. It retrieves the paid order, checks the captured charge for refund or
dispute, and sends one private download link through the existing Resend setup.
Font-only orders use the sender name Monosyth Type and font installation copy.
Pattern-only orders keep their existing template. Delivery markers and
idempotency prevent duplicate webhook emails. The existing protocol namespace
is retained so old pattern receipts remain valid.

Buyer ZIPs live in the existing private `monosyth-pattern-downloads` bucket:
`fonts/<slug>/<version>/<sha256>/<filename>`. They are checked before checkout
and hash-verified on download. No full installable fonts or paid ZIPs are in the
repository or public directory. The storefront uses a separately named,
95-character web demo and public specimen/images/license terms.

Upload or verify the exact kits from the separate font source project:

```sh
cd apps/web
GOOGLE_CLOUD_QUOTA_PROJECT=monosyth SHOP_STORAGE_BUCKET=monosyth-pattern-downloads \
  npm run shop:files -- --fonts --source=/Users/scottwaite/claude/monosyth-type --upload
```

Omit `--upload` for read-only verification. Uploads are create-only; existing
objects must match their expected hashes. Do not overwrite a sold release.
For the public demo, `scripts/build-type-preview.py` requires fontTools with
WOFF2 support; pass the full source WOFF2 path. Do not copy that source font to
public/. Buyer source and ZIP hashes are in the font catalog.

## Verification

- Production build and TypeScript passed
- 46 shop checks passed, including both font prices, live mappings, software tax
  classification, unpaid/refunded/disputed access denial, web-kit entitlement
  isolation, signed webhooks and duplicate-email behavior
- Desktop and phone layout, font loading, tester input/palette and license links
  checked in the browser
- An isolated Stripe sandbox browser purchase of Desktop + Web completed at
  $12; the private order page returned the correct v1.600 ZIP, with its exact 859,261
  bytes and SHA-256 matching the release. This sandbox used manual tax and did
  not send an email. Email template, signature and retry behavior were tested
  with mocked transport; existing live webhook and sender infrastructure reused
- Both exact buyer ZIPs verified and uploaded to private storage

No live charge is required for release verification. Check live checkout's
edition, amount, tax calculation and cancel return after rollout. Do not submit
a live payment as part of a smoke test.


## Latest source update before launch

The owner flagged a newer Everyday Measure source while the initial storefront
rollout was queued. Current sale files are commercial v1.600, frozen from the
original project's v1.500 source (including its independent p/q drawings).
Every outline, advance and feature table is preserved from that source; only
commercial naming, license and style metadata change. Public previews and
specimen URLs are versioned under `/shop/type/v1.600/` to avoid stale caches.
The original Everyday Measure project was read without editing it.

Both $8/$12 price IDs are retained for the same licensed products, with explicit
current-release mappings. No price was disabled. The earlier v1.400 release is
retained in a historical catalog solely for existing receipts; new selections
resolve only to the current v1.600 kits. The first pending deployment preceded
the owner's correction; publish the replacement only after verifying the new
font packages and previews.

The refreshed v1.600 sandbox purchase and browser download were repeated after
all preview/kit changes. The ZIP hash and all three embedded font binaries
match the verified current build exactly. No real payment was submitted.
