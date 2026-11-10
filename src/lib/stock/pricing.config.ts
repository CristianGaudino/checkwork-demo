// Everything the price block says or assumes, in one place. A clone changes these, not the component.
export const PRICING = {
  vatRatePct: 23, // Irish standard rate: used for the "inc. VAT" figure under an ex. VAT price
  // The finance-from line uses the finance defaults (finance.config.ts) with this share of the price as deposit.
  financeFromDepositPct: 20,
  labels: {
    vatInc: "Inc. VAT",
    vatEx: "Ex. VAT, reclaimable",
    incVatSuffix: "inc. VAT",
    sold: "Sold",
    reduced: "Reduced by",
    financeFrom: "Estimate from",
    perMonth: "a month",
  },
} as const;
