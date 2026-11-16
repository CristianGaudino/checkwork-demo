// Everything the price block says or assumes, in one place. A clone changes these, not the component.
export const PRICING = {
  vatRatePct: 23, // Irish standard rate: used for the "inc. VAT" figure under an ex. VAT price
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
