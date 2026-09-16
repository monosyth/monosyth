# MoveMorrow identity

Approved direction, September 16, 2026: warm and calming, confident and practical, with enough visual strength to feel distinctive.

## Name and voice

Use **MoveMorrow**, with the tagline **More room for what’s next.** Monosyth Labs is the publisher, credited quietly in the footer. The product has its own wordmark and visual identity.

Write clear, specific next steps. Acknowledge that moving involves many small decisions. Dates are planning prompts, not pressure; distinguish suggested dates from confirmed obligations. Keep important controls and save states explicit.

## Visual system

| Role | Color |
| --- | --- |
| Primary accent, primary buttons, move-date panel | Oxblood `#642b3b` |
| Page background | Chalk `#f7f7f2` |
| Main text | Charcoal `#242520` |
| Secondary text | `#65665e` |
| Supporting notes and feature panels | Mineral blue `#d5e0e4` |
| Rules | `#cacbc2` |
| Input boundaries | `#818378` |

Archivo Black supplies the wordmark and prominent headings. IBM Plex Sans supplies body copy, forms, and controls; IBM Plex Mono labels small sections. Fonts are self-hosted through Next.js. Use ample space, crisp rules, and square or 2px corners. Large city names and an oxblood moving-date panel anchor the saved planner. Task rows are separated by rules; small blue notes provide a warmer moment without competing with actions.

Use solid surfaces, restrained accents, and no decorative gradients. Keep text contrast clear. Keyboard focus uses an oxblood outline, selected controls have both a visual state and accessible state, and mobile columns stack without hiding actions. Print removes controls and uses white surfaces.

## Implementation

The `/move` layout scopes fonts and tokens to MoveMorrow. Shared identity, wordmark, planner styles, and move-heading components live under `apps/web/src/components/move`. The landing page, setup, planner sections, and privacy page use this system. Other Monosyth products keep their own identities.
