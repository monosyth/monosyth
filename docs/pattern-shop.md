# Monosyth pattern shop

The shop lives at `/shop` on the existing Next.js/Firebase App Hosting site. It
contains ten Trellis patterns from SEWstudio, each at $6.95 USD, using the newest
local listing records dated September 19, 2026. Older README and draft records
show $8.95 for some patterns; the newer per-pattern records take precedence.
This work does not change any Etsy listings.

## Business registration record

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
- The owner's My DOR profile is complete but has no linked business account.
  Adding access to an existing account requests a DOR Letter ID. No Letter ID
  has been supplied, and no business-license or tax-registration application
  has been submitted during this setup.

## Current state

- Storefront, ten product pages, cancellation handling and private order page implemented
- Stripe-hosted guest checkout; one pattern per transaction
- PDF, EQ8 ZIP and separate labels (where included): 24 exact versioned files
- Verified Stripe webhook sends a private download link through Resend
- Every download rechecks the Stripe payment, full-refund and dispute state
- Catalog prices and file entitlements are controlled by the server
- Checkout is disabled by default and in `apphosting.yaml`
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
- Final tax configuration, sandbox integration credentials and a full sandbox purchase remain outstanding; checkout stays disabled

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
