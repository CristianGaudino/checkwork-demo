// Everything the price block says or assumes, in one place. A clone changes these, not the component.
export const PRICING = {
  vatRatePct: 23, // Irish standard rate: used for the "inc. VAT" figure under an ex. VAT price
  labels: {
    vatInc: "Inc. VAT",
    vatEx: "Ex. VAT", // not "reclaimable": that depends on the buyer and the vehicle (an 8-seat Tourer often is not)
    incVatSuffix: "inc. VAT",
    sold: "Sold",
    onRequest: "Price on request",
    reduced: "Reduced by",
    financeFrom: "Estimate from",
    perMonth: "a month",
  },
} as const;
