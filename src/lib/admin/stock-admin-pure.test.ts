import { describe, expect, it } from "vitest";
import { droppedPrice } from "./stock-admin-pure";

describe("droppedPrice", () => {
  it("drops by euros or a percentage, to whole euros", () => {
    expect(droppedPrice({ priceEur: 20000 }, 500, "eur")).toEqual({ priceEur: 19500, wasPriceEur: 20000 });
    expect(droppedPrice({ priceEur: 19995 }, 5, "pct")).toEqual({ priceEur: 18995, wasPriceEur: 19995 });
  });
  it("keeps the highest earlier price, so a second drop shows the whole drop", () => {
    expect(droppedPrice({ priceEur: 19500, wasPriceEur: 20000 }, 500, "eur")).toEqual({ priceEur: 19000, wasPriceEur: 20000 });
  });
  it("refuses no drop, a drop to nothing, a fraction, and more than half", () => {
    expect(droppedPrice({ priceEur: 500 }, 500, "eur")).toBeNull();
    expect(droppedPrice({ priceEur: 500 }, 0, "eur")).toBeNull();
    expect(droppedPrice({ priceEur: 500 }, 1.5, "eur")).toBeNull();
    expect(droppedPrice({ priceEur: 500 }, 51, "pct")).toBeNull();
    expect(droppedPrice({ priceEur: 1 }, 1, "pct")).toBeNull(); // rounds back to the same price
  });
});
