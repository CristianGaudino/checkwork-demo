# Mobile navigation and polish: spec

Owner feedback, 2026-11-11. One branch, `feat/mobile-nav-polish`. Designed at 360px first, then up, in light and dark (design contract,
section 7). The rules in `docs/dashboard-polish.md` still hold: quiet chrome, one accent, Sora at 400 to 600, 4px grid, line icons.

## Research, in short
- Keep the main menu to five to seven items, ordered by what visitors come for, the same on every page. Dealers who list every page in the
  menu cause choice paralysis ([Spidersnet](https://spidersnet.co.uk/blog/user-friendly-navigation-tips-for-car-websites/),
  [Dealer Spike](https://www.dealerspike.com/blog/does-your-website-navigation-drive-shoppers-toward-a-purchase-64524/),
  [Digital Dealer](https://digitaldealer.com/news/website-optimization-101-navigation-best-practices/91635/)).
- On a phone, keep the main categories (for us, the stock) at the top level of the menu: nesting them makes people give up on the menu.
  Everything else can sit one level down ([Baymard](https://www.baymard.com/mcommerce-usability/benchmark/mobile-page-types/navigation-menu)).
- Vendor and trade guidance, not controlled studies. Direction, not proof.

## 1. Menu (public site)
- **Desktop header, seven links:** Used cars, New cars, Commercial, Finance, Sell or trade in, Service, Contact, then the heart. Makes and
  About leave the header: Makes is on the home page, in every stock filter and in the menu; About is in the menu and the footer.
- **Phone menu:** the stock first, as big rows: Used cars, New cars, Commercial, Makes. Then three groups that fold open (Buying, Selling,
  Dealership), closed by default, except the one holding the page you are on. Then Call us. Every page is still one or two taps away.
  - Buying: Find a car, Test drive, Finance, Warranty, Compare cars, Saved cars.
  - Selling: Sell your car, Trade in your car.
  - Dealership: Service, Reviews, Questions, About us, Contact.

## 2. Footer
- Groups: Cars (Used, New, Commercial, Makes), Buying, Selling, Dealership, then Privacy and Terms in the bottom line.
- **Phone:** each group folds (closed), one row each, so the footer is about half its height. The address, phone and social icons stay open.
- **From 1024px:** the groups are open columns, as now.

## 3. Demo bar
- **Phone (under 640px):** a small pill at the bottom right, "Customer" or "Dealer" with an arrow. A tap opens the controls above it (view
  as, role, DoneDeal, theme); a tap outside, Escape or the pill again closes them. It starts closed on each visit and stays as it is
  while you move between pages. The page keeps room for the pill only, so nothing sits under it.
- **From 640px:** the one-line bar, as now.
- In the dashboard the pill stays until 1024px, above the tab bar that shows until then, so the two never stack at the foot of a tablet.

## 4. Dashboard on a phone
- **A tab bar at the foot** (under 1024px): Overview, Leads, Test drives, Stock, More. Icons with labels, the current one in the accent.
- **More** opens a sheet with the rest, in the sidebar's groups, filtered by the role's permissions, and View the public site. When the page
  you are on is in More, More is marked current.
- The top line stays: the dealership name, and the page title below it. The swipe row of links goes.
- From 1024px nothing changes: the sidebar.
- Settings gets a real gear icon (it was drawn as a sun).

## 5. Home: browse by make
- **Two rows that scroll sideways together**, at every width, by swipe or trackpad. The makes alternate between the rows (first,
  third, fifth on the top; second, fourth on the bottom), so the busiest makes lead both. Both rows start at the left edge; the pills' own
  widths stagger them (owner, 2026-11-11: no forced indent).
- Arrows under them on a desktop only (from 1024px, with a mouse), and only when the rows are wider than the screen.
- The rows fade at the edges. All makes stays above, on the right.

## 6. The pass after
Screenshots at 360, 390 and 1280px, light and dark, of every public page and every dashboard page, looking for what the owner named:
misalignment, uneven spacing, controls that do not line up, text that wraps badly. Fixes go in the same branch, listed in the PR.

### Fixed in the pass
- The gearbox icon on the car page was the same sun as Settings: now a gear-stick pattern.
- Stat tiles: the figure is sized from the tile (a container query), so tiles side by side match and €117,565 fits a half tile at 360px.
  The figure keeps the display font.
- Dashboard page actions: on a phone, two or more share one full-width row, each icon above its label (Overview's three no longer wrap
  two and one). A single action keeps its size.
- Dashboard tables: the floor is 18rem, not 22rem, so two-column tables (stock, leads, team) fit a phone. The stock list drops the
  thumbnail under 400px to keep the car's name readable. Customers shows Marketing from 640px.
- Marketing, Worth posting: Write a post stays on the right of every row.
- Home: the finance band's two buttons are full width on a phone, like the hero's.
- Stock list: Filters is a box the same height as the sort select beside it.
- Car page: Compare and Price alert sit side by side, like Call us and WhatsApp.
- Makes page: long make names wrap instead of being cut off.
- Settings: the opening hours list Bank holidays as closed, as the public site does.
- The dev-only data switch moved to the top of the screen, off the pill and the tab bar.

### Noted, not changed
- Lead status buttons wrap one, two, one at 360px. A 2 by 2 grid is too narrow for "Appointment set" with its icon.
- Margins and Reports tables still scroll sideways inside their cards on a phone (several money columns).
- The featured stock on the home page is a long column of cards on a phone.

## Checks
Lint, typecheck, unit tests, the migration check and the full E2E suite on a production build, the ponytail audit of the branch, and
screenshots at 360, 390 and 1280px.
