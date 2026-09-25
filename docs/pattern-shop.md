# Monosyth pattern shop

The shop lives at `/shop` on the existing Next.js/Firebase App Hosting site. It
contains ten Trellis patterns from SEWstudio, each at $6.95 USD, using the newest
local listing records dated September 19, 2026. Older README and draft records
show $8.95 for some patterns; the newer per-pattern records take precedence.
This work does not change any Etsy listings.

## Business registration record

Local company document index: `business-records/README.md`. Original company
documents and private administration records belong in that Git-ignored folder.

- Legal business name: **Monosyth Labs, LLC** (owner-provided and matched in
  Washington DOR's public general-license search)
- Washington Unified Business Identifier (UBI): **606 274 538**
  (`606274538` for forms), provided by Scott on September 22, 2026 (Pacific)
- This is the Washington business identifier, not a federal EIN or an SSN
- Washington DOR's public **General license** search by this UBI returned
  `MONOSYTH LABS, LLC` with UBI `606-274-538`. The results row did not show a
  business ID, location ID, city or state, and no active-license status was
  confirmed from that row.
- Washington DOR's public **Tax account** lookup on September 22, 2026
  returned “Account does not exist or the account has been closed more than
  5 years” when searched by this UBI with the business-name field empty.
  A name search for `Monosyth` also returned no account. These results do not
  verify sales-tax registration; do not configure Stripe as registered on this
  evidence alone.
- Before the application, the owner's My DOR profile had no linked business
  account. Adding access requested a DOR Letter ID; none was supplied.
- The owner submitted the Washington Business License Application and supplied
  the DOR confirmation receipt in this task. Filing timestamp as displayed:
  **September 22, 2026, 10:45:53 PM** (receipt does not specify a time zone).
  Confirmation number: **0-054-250-878**.
- Receipt identifies legal entity **MONOSYTH LABS, LLC**, firm name
  **MONOSYTH**, and UBI **606-274-538**. Business location: Shoreline, WA.
- Receipt lists **$55.00** amount due plus **$1.63** card processing fee,
  totaling **$56.63**, with payment method credit or debit card. No card
  details are retained in this record.
- **Current status: Washington tax registration confirmed.** The official DOR
  letter dated September 24, 2026 confirms registration and an Excise Tax account.
  This supersedes the earlier same-day signed-in My DOR Pending observation.
  Filing is quarterly; the first return covers the period ending September 30,
  2026 and is due November 2, 2026, even without business activity. Original
  letter and private notes are indexed in `business-records/README.md`.
- Check application status in My DOR: **Manage My Profile → View, Edit, or
  Print Drafts or Submissions**, in the Drafts and Submissions area. DOR says
  the license will be emailed to the linked SAW email when possible.
- Shoreline's city license is handled separately through FileLocal after
  obtaining the state license and full 16-digit UBI. City application has not
  been confirmed complete. Official instructions:
  <https://www.shorelinewa.gov/government/departments/city-clerk-s-office/business-licenses>.
- On September 24, 2026, Scott requested an email check for approval. The
  connected `monosyth@gmail.com` search returned no recent DOR/license mail.
  Apple Mail's All Mailboxes searches for `dor.wa.gov` and the exact phrase
  `"business license"` found September 22 account-access messages and older
  LLC formation messages, but no business-license approval. This is a mail
  search result, not a fresh determination of DOR's application status.
- On September 24, 2026, located and visually reviewed the owner's saved
  **Certificate of Formation**, issued by the Washington Secretary of State
  for **MONOSYTH LABS, LLC**, effective and issued **August 12, 2026**, with
  UBI **606 274 538**. Source:
  `business-records/registration/2026-08-12 Monosyth Labs LLC - Certificate of Formation.pdf`
  (an unchanged copy of `/Users/scottwaite/Desktop/0024672852_Certificate.pdf`).
  This establishes the formation document's contents; it is not a DOR
  business-license or tax-registration endorsement. The owner's report of an
  existing business registration is now confirmed separately by the DOR letter above.

## Current state

- Storefront, ten product pages, cancellation handling and private order page implemented
- Embedded Stripe guest checkout at `/shop/checkout/[slug]`; one pattern per transaction
- PDF, EQ8 ZIP and separate labels (where included): 24 exact versioned files
- Verified Stripe webhook sends a private download link through Resend
- Every download rechecks the Stripe payment, full-refund and dispute state
- Catalog prices and file entitlements are controlled by the server
- Checkout remains disabled by default unless explicitly enabled; production `apphosting.yaml` now enables sales with automatic tax
- All 24 buyer files uploaded to the dedicated private `monosyth-pattern-downloads` bucket in project `monosyth`, region `us-east4`
- Public access prevention and uniform access enforced; the existing App Hosting service account has read access
- Stripe business onboarding completed by the owner; bank details also completed per owner confirmation
- Live restricted Stripe key stored as `STRIPE_SECRET_KEY` version 1 in Google Secret Manager; Checkout Sessions write, Payment Intents read, Charges and Refunds read; all three read-only API checks passed
- Live webhook `we_1UIhuL9FGEoNhiRQZnOSCNkz` targets `https://monosyth.com/api/shop/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, using API version `2026-08-26.dahlia`
- Webhook signing secret and stable download-link signing secret stored as `STRIPE_WEBHOOK_SECRET` and `SHOP_DOWNLOAD_SECRET`, each version 1; Firebase backend access granted
- Runtime configuration references these secret versions and uses owner-confirmed `scott@monosyth.com` for customer support
- Resend verified `monosyth.com` after three DNS records were added at GoDaddy; existing Google mail records remain in place
- Sending-only Resend key scoped to `monosyth.com` stored as `RESEND_API_KEY` version 1, with Firebase backend access granted; runtime sender is `Monosyth Patterns <scott@monosyth.com>`
- Resend accepted the owner-authorized sender test to `scott@monosyth.com` on September 22, 2026 (Pacific); this test did not create a payment or a customer download link
- Owner approved Stripe Tax pay-as-you-go; Washington live sales-tax registration was added with immediate collection. Runtime configuration now selects automatic tax. Automatic filing is not enabled
- Embedded sandbox purchase passed with $6.95 subtotal, $0.73 Washington test-address tax and $7.68 total; the signed order page and all three file hashes verified
- Actual sandbox completion event replayed twice with the local webhook signing secret: one email delivered (Resend confirmed), then full sandbox refund correctly denied future downloads. This does not verify Stripe-to-local webhook network delivery
- Owner confirms company Shoreline-based revenue below $4,000 this year; city-license threshold does not currently apply based on that answer and the published city rule
- Live restricted-key preflight accepted an embedded session with the saved $6.95 price and automatic tax; the unpaid preflight session was immediately expired
- Washington tax registration confirmed by the official September 24 DOR letter, superseding the earlier Pending observation; separate Shoreline city-license status remains unverified
- Stripe account status checked September 24: Payments and Payouts active, no active tasks; Company / Single-member LLC tax information marked Verified. No tax identity fields changed
- The saved IRS CP575G letter confirms the LLC already has an EIN; see the private business-records index. Do not store the EIN in tracked website documentation

## Stripe product catalog

On September 24, 2026, all ten patterns were created in the live Monosyth Labs
Stripe account as active products, each with a **one-time $6.95 USD price**.
Tax behavior is **exclusive** (tax, when configured, is added to the price).
The existing category preset is `txcd_10503000`, digital other news/documents,
downloadable, non-subscription, permanent rights. Product descriptions identify
the PDF and EQ8 deliverables, finished quilt size, edition, and EQ8 requirement.
Creating these entries did not enable website checkout or configure tax collection.

The exact product and price IDs are retained by edition in
`apps/web/src/lib/shop/stripe-live-catalog.json`. Live website checkout uses these
saved prices and keeps the existing signed private-download flow. Sandbox
checkout uses separate inline test prices and does not reference live IDs.
A changed website price, currency, or edition without a matching catalog record
is blocked in live mode. When changing a price, create a new Stripe price and
update the mapping together with the website catalog. Retain old release records
for customers' existing download links.

Verification: each saved product and its $6.95 default-price detail page was
checked in Stripe. The 32 automated shop checks cover live price selection,
sandbox separation, mismatched editions/prices, payment validation, fulfillment,
and private downloads. These mocked checks do not replace the outstanding full
sandbox purchase and delivery acceptance test.

## Embedded checkout draft

On September 24, the owner supplied Stripe Checkout builder draft
`chkplan_61VSk406KFrCfxSBU16VS54s81SQPMgX0jLeglQyO` (Embedded form 1).
Its implementation uses `ui_mode=form`, the request API version
`2026-08-26.dahlia; custom_checkout_payment_form_preview=v1`, and the Dahlia
Stripe.js SDK with `custom_checkout_payment_form_1`. The form uses the draft's
expanded layout and appearance settings. The Dashboard URL is an admin draft,
not a customer payment URL; no draft link is placed on the public website.

The shop creates each session on the server with the selected edition's saved
price, private-download metadata, and a signed return URL. Customer card fields
are hosted inside Stripe's iframe. The preview header applies only to form
session creation; existing webhook/order verification uses the normal API.
The original hosted-checkout API remains available to clients that omit
`uiMode`, with separate idempotency keys for the two formats.

The integration retains card payments, USD prices with adaptive conversion
disabled, and billing-address collection. These keep the existing payment
verification and tax-address handling consistent. The draft's disabled tax
setting does not override `SHOP_TAX_MODE`: this remains an explicit launch
configuration. Form requests return the matching runtime
`STRIPE_PUBLISHABLE_KEY`, never the secret key. Key-mode mismatches fail closed.

Validation so far: 34 automated shop checks passed, including form-session tax
settings, server-owned pricing and private return URL, idempotency separation,
and rejection of missing/mismatched keys. Scoped lint and production build passed.
The form rendered successfully with the owner's existing Stripe sandbox account.
A real sandbox browser purchase completed on September 25 after fixing duplicate
return-address parameters: `return_url` is set by the server; `confirm()` receives
only the form event. Its synchronous errors also reach the customer error handler.
The signed order page, three exact file downloads, delivered email via actual-event
replay, duplicate-email suppression, tampered-link rejection and full-refund denial
were verified. No live payment was created. The temporary email used a localhost
link; production uses the configured public origin.

## Complete setup

1. Stripe account setup is complete. Live account: `acct_1UIh7V9FGEoNhiRQ`.
   Sandbox: `acct_1UIh7e7H9c3XazXS`. The owner completed onboarding directly
   in Stripe. Use separate sandbox credentials for the acceptance checks below.
2. Resend domain `monosyth.com` is verified (domain ID
   `2fe1a942-86f6-45fc-867f-f60b63009ca5`). `SHOP_FROM_EMAIL` uses
   `Monosyth Patterns <scott@monosyth.com>` and `SHOP_SUPPORT_EMAIL` uses the
   owner-confirmed support address. Receiving through Resend is disabled;
   Google continues to handle the domain's incoming mail. The sending key has
   sending access only, scoped to this domain. Email delivery is a required
   part of checkout setup.
3. Private storage is provisioned: **`monosyth-pattern-downloads`**, in project
   `monosyth`, region `us-east4`. It has **uniform bucket-level access** and
   **public access prevention** enforced. Do not use Firebase public download
   URLs or download tokens. If recreating the storage in another environment:
   Grant the App Hosting runtime service account `roles/storage.objectViewer`
   on this bucket, plus `storage.buckets.get` through a small custom role (or
   the bucket's `roles/storage.legacyBucketReader` role) for the privacy preflight.
   The uploader needs these read permissions plus permission to create objects.
   The checkout preflight rejects nonprivate bucket settings.
4. The original 24 SEWstudio customer files have been verified and uploaded.
   Use the commands below for repeat verification or future editions. This never
   commits PDFs or EQ8 files into the website repository.
5. Store secrets in Firebase/Google Secret Manager and grant the App Hosting
   backend access. Add runtime secret references to `apphosting.yaml` only once
   those secrets exist. Adding nonexistent secret references can break deploys.
6. In Stripe, create a webhook destination for
   `https://monosyth.com/api/shop/webhook`, subscribed to
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   Save that destination's signing secret as `STRIPE_WEBHOOK_SECRET`. Test and
   live webhook destinations/keys are separate.
7. Review the sales-tax setup before accepting payments. Choose
   `SHOP_TAX_MODE=automatic` after configuring Stripe Tax, product tax treatment
   and applicable registrations, or `manual` only after confirming the intended
   manual/no-collection arrangement. An unset mode blocks checkout. Automatic
   tax is an optional Stripe service with its own fees; no tax decision is inferred.
8. Run the sandbox checklist below. Then replace test credentials with live
   credentials, verify the live webhook, and set `SHOP_ENABLED=true` to open
   sales. Production remains on Firebase App Hosting at monosyth.com.

Required runtime environment:

| Variable | Purpose |
| --- | --- |
| `SHOP_ENABLED` | `false` until launch; `true` enables configured checkout |
| `STRIPE_SECRET_KEY` | Secret Stripe API key; never `NEXT_PUBLIC_` |
| `STRIPE_PUBLISHABLE_KEY` | Public key from the same account and mode, supplied to the embedded form at runtime |
| `STRIPE_WEBHOOK_SECRET` | This environment's `whsec_…` signing secret |
| `SHOP_DOWNLOAD_SECRET` | Random secret, at least 32 characters; keep stable |
| `SHOP_STORAGE_BUCKET` | Dedicated private bucket name |
| `RESEND_API_KEY` | Secret email API key |
| `SHOP_FROM_EMAIL` | Verified sender, optionally `Monosyth Patterns <…>` |
| `SHOP_SUPPORT_EMAIL` | Real support mailbox |
| `SHOP_TAX_MODE` | Explicit `automatic` or `manual` |
| `NEXT_PUBLIC_SITE_URL` | `https://monosyth.com`; localhost origin for development |

Example secret mapping, after provisioning:

```yaml
- variable: STRIPE_SECRET_KEY
  secret: STRIPE_SECRET_KEY
  availability:
    - RUNTIME
```

Use the same form for the webhook secret, download secret and Resend key.
Bucket, sender, support and tax mode can be runtime values. Do not paste secrets
into source code or commit `.env.local`. Generate the download secret once
with a password manager or secure random generator. Rotating it invalidates
existing private download links.

## Customer files and source provenance

`apps/web/src/lib/shop/catalog.json` records the source-relative path, exact
SHA-256 digest, size and edition of every buyer file. The source root is
`/Users/scottwaite/claude/SEWstudio`. Buyer files remain there; website assets
under `public/shop` are listing images only. Preserved filenames are intentional,
including `review` in the already published Harvest buyer PDF filename.

The first image for each pattern comes from its September 19 approved listing
photo set. These are illustrative lifestyle mockups, labeled as such in the shop.
The second image is the corresponding full-layout/overview graphic from the
current customer package. No physical sample claim is made.

Read-only file verification, from `apps/web`:

```sh
npm run shop:files -- --source=/Users/scottwaite/claude/SEWstudio
```

Upload after the private bucket, credentials and environment are configured:

```sh
npm run shop:files -- --source=/Users/scottwaite/claude/SEWstudio --upload
```

For this machine's local application credentials, set
`GOOGLE_CLOUD_QUOTA_PROJECT=monosyth` on the upload command: the saved ADC quota
project points at an older unrelated project. The upload used that environment
override only; account defaults and credential files were not changed.

The uploader checks every source before writing any object. Object paths include
edition and hash, and create-only preconditions prevent overwriting sold files.
Repeated uploads verify existing bytes instead. Runtime downloads also hash the
actual bytes before returning them. Keep old releases in `shopReleases` if a
product is revised or removed from the storefront; existing orders refer to the
immutable `slug@version` in Stripe. Never reuse a SKU for changed buyer files.

## Payment and delivery design

`POST /api/shop/checkout` accepts only a product slug and browser attempt UUID.
It rejects cross-origin browser requests, uses the server's price, verifies all
private files exist, and creates one card-only Checkout Session. Repeated attempts
use Stripe idempotency keys. Card wallets supported by Stripe may appear in its
hosted checkout. There is no customer login or payment data stored on this site.

The return URL contains the Checkout Session ID and an HMAC capability tied to
the order UUID. The signed webhook retrieves current payment state from Stripe,
sends the same capability link to the checkout email, and records Resend's email
ID in Stripe metadata. A stable Resend idempotency key handles concurrent webhook
retries (Resend retains keys for 24 hours). The Stripe metadata marker prevents
later resends. A rare failure after email acceptance but before saving the marker,
followed by a retry more than 24 hours later, can send a duplicate email.

The webhook is independent of the buyer returning to the site. Email failures
return 503 so Stripe retries. The paid buyer can download from the return page
while email delivery is pending. The browser never sends email. Only the verified
webhook does. No test exercises contact a real email address.

`GET /api/shop/order` and `/api/shop/download` require the private capability,
retrieve the current Stripe Session and expanded charge, and verify the shop,
mode, edition, purchase subtotal, currency, confirmed payment, capture, full
refund and dispute state. Downloads select only file IDs belonging to that
edition. They never accept caller-provided storage paths. Partial refunds retain
access; full refunds or disputed charges deny new downloads. Already downloaded
files cannot be recalled. Dispute history remains blocked for manual support.

Private responses disable caching, referrer sharing and indexing. The order
page also sets a no-referrer policy. Treat links as bearer credentials: anyone
with a buyer's complete link can access that order. Keep full query strings out
of analytics and access-log exports; the app does not log order URLs or payloads.
There is no separate Firestore customer/order database; Stripe is the order record.

## Sandbox acceptance checklist

- Complete a Stripe test-card purchase and verify all files open correctly
- Check the correct $6.95 subtotal and intended tax treatment
- Confirm the real sandbox delivery email arrives at a controlled test inbox
- Close checkout before returning; verify the webhook still sends the email
- Cancel checkout and verify the product page remains available
- Replay a signed successful webhook; verify no second email
- Simulate email provider failure; verify Stripe retries and then delivers
- Fully refund a test payment; verify future downloads are denied
- Check missing/tampered links, unknown file IDs and another order's key
- Verify download links work after redeploy and on a second device
- Confirm all ten products' files exist before enabling live checkout

Local automated checks:

```sh
npm run audit:shop
npm run build
```

The automated payment tests use real Stripe SDK signing and request construction
with fake network responses and storage. They do not replace the sandbox purchase
or prove that live account verification, email DNS, tax setup and IAM are ready.

## Support and operational limits

Orders, receipts and refunds are managed in Stripe. If a buyer loses a link,
locate their verified order in Stripe and resend the download email by clearing
only its `delivery_email_id` metadata field and replaying its successful webhook
after the provider's idempotency window; replays within 24 hours may be deduplicated.
There is no public email lookup endpoint. Do not share an order link before
verifying the requester owns that purchase.

This first version buys one pattern at a time, without a cart, discount codes,
subscriptions or a customer account library. Product edits are made in the
versioned catalog. Keep `SHOP_ENABLED=false` to pause new checkouts; existing
paid downloads and webhook delivery continue while credentials remain configured.

## City-license applicability check, September 25

Shoreline's current general-license page states a $4,000 annual Shoreline-based
revenue threshold for businesses located in the city. A city license must not be
assumed necessary regardless of revenue. On September 25, the owner confirmed total company revenue is under that
threshold this year. Revisit city licensing if Shoreline-based revenue reaches
$4,000; do not infer indefinite exemption from this year’s answer.
Source: <https://www.shorelinewa.gov/government/departments/city-clerk-s-office/business-licenses>.
The latest private account and test records are in `business-records/registration/`.

## Sales launch, September 25

After owner approval, Washington tax setup, successful sandbox acceptance checks
and the live unpaid-session preflight, production configuration was changed to
`SHOP_ENABLED=true` and `SHOP_TAX_MODE=automatic`. Production deployment and
public checkout verification must confirm the rollout before reporting sales live.
Automatic filing remains off. The DOR first-return deadline remains November 2,
2026, including a no-activity return when applicable.
