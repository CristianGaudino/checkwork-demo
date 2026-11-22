# Makes, home and menu

Owner feedback, 2026-11-11. Issues #94 to #99.

## Research, in short
- Dealer-site guidance (vendor and trade press, not controlled studies): keep the top menu to 5 to 7 items, lead with buying and
  selling, plain labels ("Finance"), the same menu on every page, and a simple phone menu; on phones the footer menu gets heavy use.
- Listing badges: Autotrader's are price ratings against its own valuation. Mileage and one owner appear in advert text, not badges.
  We have no market valuation, so no price judgements; only facts the car's own data proves.

## Decisions
1. **Demo bar at the foot of the screen** (removed with the dashboard, #243), so the site reads as itself from the top.
2. **Home:** Browse by make, then **Browse by type** (renamed), with a photo of a car of that type in each tile and its count.
3. **Browse by make:** makes in stock first (with counts), then the popular Irish makes always, each opening its make page.
4. **A page per make** at `/makes/<make>`, and `/makes` for all of them:
   - In stock: what we have across used, new and commercial, a few cars of each, and "See all" to `/used-cars/<make>`,
     `/new-cars/<make>`, `/commercial/<make>` (the full lists, with filters).
   - Nothing in stock: says so, shows recently sold cars of that make, similar cars we do have, and "Looking for a particular one? We
     can find it" to Find a car with the make filled in.
   - A make we have never stocked but people look for (the popular list) still has a page.
5. **Menu:** header: Used cars, New cars, Commercial, Makes, Finance, Sell or trade in, Service, Contact, with Saved (heart) and
   Compare. Phone menu and footer in groups: Cars (Used, New, Commercial, Makes, Find a car, Compare, Saved), Buying (Test drive,
   Finance, Warranty), Selling (Sell your car, Trade in), Dealership (Service, About, Contact). Every page is reachable.
6. **Markers** (#99): proposed to the owner first, not built until agreed.
