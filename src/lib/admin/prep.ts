// The kinds of prep cost (valet, tyres, NCT...), in a fixed list so reports can total them. No imports: the prep panel (client) shares it.
export const PREP_KINDS = ["Valet", "Tyres", "NCT", "Service", "Repairs", "Bodywork", "Transport", "Other"] as const;
export type PrepKind = (typeof PREP_KINDS)[number];
export type PrepLine = { kind: PrepKind; eur: number; note?: string; at: number };
