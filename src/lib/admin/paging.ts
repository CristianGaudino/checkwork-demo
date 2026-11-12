// How many rows a table page holds: the person's choice from the footer (?per=), else 25. Anything else is the default, never trusted.
export const PER_PAGE = [10, 25, 50, 100] as const;
export const PER_PAGE_DEFAULT = 25;
export const perPage = (asked: string | undefined) => (PER_PAGE as readonly number[]).find((n) => String(n) === asked) ?? PER_PAGE_DEFAULT;
