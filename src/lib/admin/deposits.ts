// Shared by the server and the deposit forms, so no server-only imports.
export const DEPOSIT_METHODS = ["Card", "Cash", "Bank transfer"] as const;
export type DepositMethod = (typeof DEPOSIT_METHODS)[number];

// A fault found in the first 30 days lets the buyer reject the car for a full refund (Consumer Rights Act 2022). The dashboard flags a
// return inside that window; what the dealer owes is still their call, with their adviser.
export const RETURN_WINDOW_DAYS = 30;
export const withinReturnWindow = (soldOn: string, returnedOn: string) => (Date.parse(`${returnedOn}T12:00:00Z`) - Date.parse(`${soldOn}T12:00:00Z`)) / 86_400_000 <= RETURN_WINDOW_DAYS;
