# Dashboard and site polish: spec and plan

Issues #67 to #82. Owner feedback, 2026-11-11. This is the spec for all of them and the order they are built in. Method: the unslop checklist
(unslop by Damir Sokolovsky, CC BY 4.0) over the whole site, a pass for the same faults the owner named, then build in phases with a ponytail
audit at the end of each.

## Direction (unslop, five lines)
- **Product:** a used and new car dealer's website, and the dashboard its staff use to run stock, leads and posts.
- **Character:** calm, exact, practical. A forecourt office, not a launch page.
- **World:** a lit showroom floor and the office behind it. Neutrals are tinted stone in light and graphite-teal in dark.
- **Moments:** the car photo on its lit plinth on the public site; on the dashboard, the lead list and the post preview. Everything else is quiet.
- **Signature:** the plinth under every car photo. Nothing else is decorative.

## Rules every phase follows
1. **Quiet chrome, one accent.** Indigo marks the primary action and the selection. Nothing else carries color except status.
2. **Type:** Sora, weights 400, 500 and 600 only. Sentence case. No tracked uppercase, no italic emphasis, no eyebrow labels above titles.
3. **Surfaces:** solid. No tinted overlays (`bg-x/15`), no inner highlight (the sheen), no hue gradients, no glow. Depth in dark is surface steps and a hairline; in light a small neutral shadow.
4. **Status** (badges, chips): five solid tones (neutral, ok, warn, bad, info), each a background and a text color that meet 4.5:1, defined once per theme.
5. **Radius** on one scale and nested: control 12px, card 20px, tile 24px, chip full. An inner radius is the outer minus the padding.
6. **Spacing** on the 4px grid; equal things equal sizes.
7. **Icons:** one line set (the existing one), 16 or 20px, 1.5 stroke, text color. No emoji anywhere.
8. **Copy:** short. Labels, buttons and subheads end without a period. No helper sentence where the label already says it. One primary action per page.
9. **Motion:** color, background, opacity and transform only, one easing, no looping, nothing that moves on hover by more than a few pixels.
10. **Clickable means clickable:** a number, a badge or a row that looks like a link is one.

## Spec by issue
| # | What |
|---|---|
| 67 | `VehicleListPage` for New and Commercial becomes the same `StockShell` as Used: filter rail, sheet, search, sort, grid and list, scoped to the kind. The make chips stay as a shortcut above it. |
| 68 | `MakeLogo` renders initials in the same box when there is no SVG (`LR`, `GN`, `GMC`, `DG`, `BK`). A `standalone` prop (the make page heading) renders nothing instead. |
| 69 | `/test-drive` gets a full page: title, intro, Call and WhatsApp, how it works, what to bring, then Select a car. Title and description written for search. |
| 70 | Every label that says Admin or Dealer admin says Dashboard or Dealer dashboard, and the URL moves to `/dashboard` (owner decision), with `/admin` redirecting to it. The Cloudflare Access application path must change to `/dashboard*` when it deploys; until then the Worker answers 404 (it fails closed). |
| 71 | The warranty is 12 months in `WARRANTY`, the trust strip, the buy box, the warranty page and the tests. The Warranty page gets: what is covered, what is not, how to claim, extended cover, contact. |
| 72, 73 | Overview: a short heading, five figures that are links to their pages, a needs-attention list, recent leads as whole-row links, three quick actions. No chart. |
| 74 | One `Select` (the Combobox) in all 12 places; typable on desktop at any length; the chevron has padding on the right. |
| 75 | Lead status as quick-action buttons with line icons (Contacted, Appointment, Won, Lost) and type as filter chips with counts. |
| 76 | Assign with team profile chips (initials and name), one click, including Nobody. |
| 77 | Marketing is one composer: car, text with a suggestion, photos, a live preview, an optional ad toggle, publish now or schedule (owner decision: post and ad in the composer, newsletters in a list). |
| 78 | The hero image fades into the page background at the bottom edge in both themes (a mask, not a hard cut). |
| 79 | The tokens above: weights, radius scale, status tones, no sheen, no tinted overlays, in light and dark. |
| 80 | Dealer tools on the car page: a labelled strip (Dealer) above the gallery with two buttons and icons: Edit car, Post to social. Visible, not loud. |
| 81, 82 | The unslop pass and the copy and button cut over every page, applying rules 1 to 10. |

Owner decisions (2026-11-11): sentence case across the public site and the dashboard; the dashboard URL becomes `/dashboard`; marketing keeps post and ad in one composer, newsletters in a list.

## Plan
1. **Foundations (PR 1):** tokens (weights, radius, status tones, shadows, no sheen), the Select and its 12 replacements, hero fade, make initials, eyebrow removal. Audit.
2. **Public site (PR 2):** filters on New and Commercial, the Test Drive page, 12 month warranty and page, dealer tools strip. Audit.
3. **Dashboard (PR 3):** rename, overview, clickable rows, leads quick actions and assignee profiles, marketing composer, text and button cut. Audit.
4. **Whole-site pass (PR 4):** sentence case across the public site, trailing periods, copy cuts, spacing and motion review. Audit.

Each PR keeps lint, `tsc`, unit and E2E green, shows screenshots at 390px and 1280px in both themes, and is audited before it is opened.

## Found in the pass over the site (beyond what was reported)
- 12 native selects (admin leads, lead detail, marketing x4, car form x2, add drive, team role, the shared form field).
- 150 uses of weight 600 or 700; headings at 700 read heavy and generic.
- Tinted status colors (`bg-better/15`, `bg-accent/15`, `bg-warning/15`, `bg-destructive/15`) and 8 other opacity overlays: the sheen in dark.
- The panel shadow has an inner highlight, and the page background has a warm radial glow in dark.
- Eyebrow labels above page titles (Our Stock, New, Commercial), and Title Case on most headings and buttons.
- Strays in the radius scale (`rounded-lg`, `rounded-md`, `rounded`).
- Helper sentences on most dashboard pages that repeat the page title.

## What was built (one branch, `feat/dashboard-polish`)
- The dashboard lives at `/dashboard`; `/admin` redirects to it (`next.config.ts`). The Cloudflare Access application path is `/dashboard*`.
- Overview: five figures that link to their pages, latest leads and the needs-attention list as whole-row links, three quick actions. No chart.
- Leads: type as filter chips, whole-row links in the list, status as icon buttons and the owner as profile chips on a lead.
- Marketing: one composer (`PostComposer`) for a post and its ad, with suggested text per network, photo choice, a live preview, publish now or later,
  or save a draft. Newsletters are a list. The ad switch adds a platform and a budget; with simulation on, publishing starts the ad too.
- The post stores the photos chosen (`SocialPost.photos`); the publisher adapters will use them when a real service is connected.
- Sentence case across the public site and the dashboard. Proper nouns keep their capitals.
