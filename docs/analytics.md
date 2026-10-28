# Website Analytics

Monosyth and Everyday Measure use separate Google Analytics properties. Sharing
Firebase project `monosyth` for hosting does not combine their Analytics data.

| Site | Property | Stream | Measurement ID |
|---|---|---|---|
| monosyth.com | monosyth (`529069610`) | monosyth (`14036926875`) | `G-LXCLTKYMTY` |
| everydaymeasure.com | Everyday Measure (`560880037`) | everydaymeasure.com (`16212044335`) | `G-E7Z6YX78QK` |

[Monosyth reports](https://analytics.google.com/analytics/web/#/a42674541p529069610/reports/intelligenthome)
[Everyday Measure reports](https://analytics.google.com/analytics/web/#/a42674541p560880037/reports/intelligenthome)

## Monosyth integration

`PublicAnalytics` in the root layout initializes the existing measurement ID
from App Hosting. Previously the ID was configured but no Analytics SDK or tag
was initialized. The stream URL was also empty; it is now `https://monosyth.com`.

The public-path allowlist covers the homepage, shop catalogue/product/type pages,
weather and birds pages. Account tools, MoveMorrow, wedding/RSVP routes,
checkout/cart/order links and other independently hosted sites are excluded.
The tag is paused on excluded routes even after client navigation from a public
page. Collection is enabled only on monosyth.com and www.monosyth.com.

Page views are sent explicitly on pathname changes, after Next's title arrives.
Queries and fragments are excluded from page locations and referrers. Private
Monosyth referrer paths are removed. Google signals and ad personalization are
disabled. No form values, accounts, downloads or purchases are instrumented.

**Keep enhanced measurement disabled on this Monosyth stream.** This was its
existing setting, verified during setup. Enabling automatic history views would
bypass the explicit route selection and can double-count page views. Do not
initialize Firebase Analytics in addition to this tag.

## Verification on October 27, 2026

The focused routing/referrer tests, scoped ESLint and production build pass.
Full repository lint was run but fails in existing vendor/application files
outside this change (234 errors and 4,473 warnings).

An isolated browser verified the local production build using the production
hostname: homepage, client navigation to shop, and return to homepage each sent
one page_view with the correct title and G-LXCLTKYMTY, receiving HTTP 204.
Synthetic query/fragment values were absent. Navigating to MoveMorrow paused
collection and sent no private page location. Live deployment verification is
recorded below and in the local evidence folder.

Everyday Measure required no website tag change. Fresh live visits to its
homepage and backing calculator sent G-E7Z6YX78QK page_view requests, both
receiving HTTP 204; both page titles appeared in its dedicated Realtime report.
Its source/setup records remain in /Users/scottwaite/claude/everydaymeasure.

The owner explicitly approved deletion of the unused extra Everyday Measure
stream (16217745384 / G-QM8L1JNGN3) inside Monosyth. The deletion is complete;
Monosyth now has only its own stream. Everyday Measure retains its dedicated
property and working tag. Google preserves historical data from a deleted stream.

## Production verification

Firebase rollout rollout-2026-10-28-004 succeeded at 01:52 UTC on October 28
(October 27 Pacific), serving commit d1e8aa234d20d1582e718e5c87848aaecf0ea6ba.
An isolated browser then visited both live domains with no request interception.
The Monosyth homepage, shop and return to the homepage sent exactly three
page_view requests to G-LXCLTKYMTY, all with correct page titles and HTTP 204
responses. Query/fragment markers were absent; moving to /move disabled
collection and emitted no private page location. Everyday Measure's homepage
and backing calculator sent only G-E7Z6YX78QK, each receiving HTTP 204.
No JavaScript errors were observed. These are verification visits, not organic
traffic or growth evidence.

Local evidence: /Users/scottwaite/monosyth/analytics-repair-2026-10-27/, including
live-network-verification.json and screenshots of the separate properties.

Realtime verification confirmed the Monosyth homepage and shop titles in
property 529069610. Everyday Measure's homepage and backing-calculator titles
were confirmed separately in property 560880037; its stream also reports Data
flowing. The visible counts include this session's verification traffic.
