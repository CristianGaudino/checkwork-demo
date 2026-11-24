# Dealer dashboard redesign, sell your car, DoneDeal stock

History. The dashboard and DoneDeal stock parts moved to checkwork-dash; sell your car and trade-in are this site's.

Owner feedback, 2026-11-11: the dealer side reads as unfinished; tables are hard to scan; summary tiles and filter chips repeat each other and the
tiles do nothing; a drop-down stays open; the trade-in page is really a valuer; a Sell your car page is missing; the stock page needs a second
version for dealers whose stock comes from DoneDeal.

## Research, in short
- **Sell versus trade-in.** Big UK dealers keep two doors. Motorpoint has Value my car, Sell my car and Part exchange; its valuation needs no
  car to buy, and its part-exchange guide starts with choosing the next car. Dealer-site guides call the sell page one of the best converting
  pages and say to keep the form short (registration, mileage, condition, contact, optional photos) and to say plainly whether a purchase is
  needed. No source found evidence that forcing a car choice first converts better; every source that mentions it treats it as optional.
- **Tables.** Practitioner guidance (no controlled studies found): alternate row fills on dense or long tables, a sticky header on long ones,
  48px rows by default, numbers right aligned in tabular figures, one clear way to act on a row.
- **DoneDeal.** The public API usage policy (page returned 403 to us; quoted from search snippets): the API "is provided exclusively to support a
  single dealer's official digital presence", keys need "explicit, documented consent" from the dealer, and it is not for aggregation or
  multi-dealer use. So: one dealer's own site, read their stock, never edit it here. Field schema and rate limits are not public; the adapter is
  written when a dealer's key is issued.

## Decisions
1. **Two doors, one form.** `/sell-your-car` (sell outright, no purchase needed) and `/trade-in` (against a car of ours). Same valuation steps.
   - Trade-in opens with "The car you want", optional ("Not chosen yet"), filled in when you arrive from a car page. Never required: a valuation
     without a chosen car is still a lead.
   - Sell your car says once, plainly, that trading in against one of our cars can get a better price, with the same optional car picker. Picking
     a car turns the lead into a trade-in.
   - One lead type (`trade_in`) with `intent` (sell or trade) and an optional car, so the dealer email, the dashboard and the purge do not fork.
2. **Dashboard kit, rebuilt.**
   - **Summary tabs:** one row of tiles that are the filter (label, count, chosen state). No separate chips and no dead stat cards above lists.
   - **Tables:** alternating rows, sticky header, 48px rows, whole-row link where a row opens something, row actions as small labelled buttons in
     the last column, numbers right aligned.
   - **Toolbar:** search with an icon and the page's main action on one line.
   - **Navigation:** grouped, with line icons, the same order on a phone.
   - Lists that were stacks of cards (test drives, reviews) become dense rows; long forms open on demand.
3. **Stock has two modes.** `STOCK_SOURCE=checkwork` (today: add, edit, mark sold, delete here) or `donedeal` (read only here: stock is synced
   from DoneDeal, each row links to the listing on DoneDeal, no add, edit or delete, and the server refuses those actions). The demo bar has a
   switch so both can be shown. The sync job is a stub until a dealer's key exists. Both modes now live in checkwork-dash; this site's
   `NEXT_PUBLIC_STOCK_SOURCE`, which only hid the factory-order pages, went with them (#271).
4. **Bugs:** the drop-down closes on any press outside it and on a second press on the field; Follow us tiles open the dealer's page on that
   network; a price drop is a tag on the card photo so prices line up.
