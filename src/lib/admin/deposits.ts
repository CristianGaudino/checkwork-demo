// Shared by the server and the deposit forms, so no server-only imports.
export const DEPOSIT_METHODS = ["Card", "Cash", "Bank transfer"] as const;
export type DepositMethod = (typeof DEPOSIT_METHODS)[number];

// The warranty: the included months (src/app/warranty/page.tsx says 12 from collection), or longer when extended cover is bought.
export const COVER_MONTHS = 12;
export const COVER_CHOICES = [COVER_MONTHS, 24, 36] as const;

// A fault found in the first 30 days lets the buyer reject the car for a full refund (Consumer Rights Act 2022). The dashboard flags a
// return inside that window; what the dealer owes is still their call, with their adviser.
export const RETURN_WINDOW_DAYS = 30;
export const withinReturnWindow = (soldOn: string, returnedOn: string) => (Date.parse(`${returnedOn}T12:00:00Z`) - Date.parse(`${soldOn}T12:00:00Z`)) / 86_400_000 <= RETURN_WINDOW_DAYS;
