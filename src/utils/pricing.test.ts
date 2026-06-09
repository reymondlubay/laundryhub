import { describe, expect, it } from "vitest";
import { DEFAULT_ADDONS_PRICING } from "../services/addonsPricingService";
import { getAddonsTotal, getLoadTotal } from "./pricing";

describe("pricing", () => {
  it("calculates addons total from snake_case fields", () => {
    const total = getAddonsTotal(
      {
        whiteprice: 50,
        fabconqty: 2,
        detergentqty: 1,
        colorsafeqty: 0,
      },
      DEFAULT_ADDONS_PRICING,
    );

    expect(total).toBe(
      50 +
        2 * DEFAULT_ADDONS_PRICING.fabconPrice +
        1 * DEFAULT_ADDONS_PRICING.detergentPrice,
    );
  });

  it("sums load row prices", () => {
    expect(getLoadTotal([{ price: 100 }, { price: "50" }, { price: null }])).toBe(
      150,
    );
  });
});
