// A row button on a list sends the status the row showed (`from`). If someone moved the record since, the press is refused rather than
// moving it back a step; the toast says so. A form with no `from` (a record's own page) is not checked.
export const STALE_STATUS = "Someone changed this already. Refresh the page and try again.";
export const changedSince = (from: unknown, now: string) => typeof from === "string" && from !== "" && from !== now;
export const movedSince = (data: FormData, now: string) => changedSince(data.get("from"), now);
