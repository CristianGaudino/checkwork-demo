# Dashboard usability pass: contract

Owner feedback, 2026-11-20: the dashboard looks flat and empty, behaviour is convoluted, the most wanted information and tools are not
clear, and it is not built for someone who is not technical. This is the contract every page in this pass follows. It adds to
`docs/dashboard-polish.md` (tokens, type, radius, status tones, copy rules), which still holds.

## Who it is for
A salesperson or owner at a small car dealer, on a phone on the forecourt or a laptop in the office, who has never had training. They open
a page to do one of a few jobs. They should know within five seconds what needs doing, what the main job here is, and how to do it.

## Rules
1. **Start with what needs doing.** A page that has work waiting opens with it, as a task list (`TaskList` and `Task` in the kit): what it is,
   why now, and the button that does it in the row (Reply, Call, Confirm, Record sale). Never a count that only links somewhere else.
2. **One main job, obvious.** One filled accent button per page, for the job people come for (Add a car, Book a test drive, New post). Other
   actions are quiet buttons. On the Overview, the main jobs are `ActionTiles`: an icon, a verb and one short line each.
3. **Actions where the thing is.** A row's two most used actions are labelled buttons in the row, with icons; the rest go under More. A
   phone gets the same actions on the record's own page, at the top.
4. **Hierarchy, not a wall of equal cards.** The work of the page is raised; supporting detail is `quiet` or plain text with no frame.
   Important numbers are large; secondary ones are small. Not every block needs a panel.
5. **No dead space, no half-empty cards.** Use the width: two columns on a laptop where the content suits it. A card holds enough to
   earn its frame, or it is merged into another. Empty states say what to do next and carry the button that does it.
6. **Plain words.** Say what a button does ("Mark as sold", "Post to Facebook and Instagram"). No internal terms (SLA, module, sync, CSV
   on its own, lead type codes). Short helper text only where a label cannot say it. No em dashes. Sentence case.
7. **Every figure goes somewhere.** A number, a badge or a row that looks clickable is a link to the list behind it.
8. **Fewer steps.** If a job takes several pages or a hidden menu, bring it forward. Confirm only what cannot be undone; anything that can
   be undone happens at once with Undo in the toast.
9. **Phone first.** The main content is on the first screen of a 390px phone, under the title (`feedback: mobile-first-screen`). Tap
   targets 44px.
10. **Keep what works.** Server permission checks, module gates (`hasModule`, `enabledModules`), the DoneDeal synced mode, simulated
    integrations and every feature stay. This is presentation and flow, not a rewrite of the data layer.

## Kit
`src/components/admin/kit.tsx`: PageHeader, Panel (raised or `quiet`), StatCard and StatGrid, Badge, EmptyState, DataTable, SummaryTabs,
Segmented, Notice, Facts, Avatar, and new in this pass `TaskList`/`Task` (urgency marker, icon, detail, inline action) and
`ActionTiles`/`ActionTile` (the main jobs as big buttons). Button classes: `adminButton` (primary), `adminButtonQuiet`, `rowButton`,
`dangerButton`.

## Public site
The public site is the customer's only. No dealer tools on car pages and no Dashboard link in its header or menu. The demo bar's Dealer
link opens the dashboard. Posting a car to social starts from the stock list or the car's page in the dashboard.
