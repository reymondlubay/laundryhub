import { DEFAULT_ADDONS_PRICING } from "../services/addonsPricingService";
import type { AddonsPricing } from "../services/addonsPricingService";

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getAddonsTotal = (
  payload: {
    whitePrice?: number | string | null;
    whiteprice?: number | string | null;
    fabconQty?: number | string | null;
    fabconqty?: number | string | null;
    detergentQty?: number | string | null;
    detergentqty?: number | string | null;
    colorSafeQty?: number | string | null;
    colorsafeqty?: number | string | null;
  },
  pricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): number => {
  const whitePrice = toNumber(payload.whitePrice ?? payload.whiteprice);
  const fabconQty = toNumber(payload.fabconQty ?? payload.fabconqty);
  const detergentQty = toNumber(payload.detergentQty ?? payload.detergentqty);
  const colorSafeQty = toNumber(payload.colorSafeQty ?? payload.colorsafeqty);

  return (
    whitePrice +
    fabconQty * toNumber(pricing.fabconPrice) +
    detergentQty * toNumber(pricing.detergentPrice) +
    colorSafeQty * toNumber(pricing.colorSafePrice)
  );
};

export const getLoadTotal = (
  rows: Array<{ price?: number | string | null }>,
): number => {
  return rows.reduce((sum, row) => sum + toNumber(row.price), 0);
};

export const getStoredSnapshots = (payload: {
  grandTotal?: number | string | null;
  grandtotal?: number | string | null;
  loadSubtotal?: number | string | null;
  loadsubtotal?: number | string | null;
  addonsSubtotal?: number | string | null;
  addonssubtotal?: number | string | null;
}) => {
  const grandTotal = toNumber(payload.grandTotal ?? payload.grandtotal);
  const loadSubtotal = toNumber(payload.loadSubtotal ?? payload.loadsubtotal);
  const addonsSubtotal = toNumber(
    payload.addonsSubtotal ?? payload.addonssubtotal,
  );

  return {
    grandTotal,
    loadSubtotal,
    addonsSubtotal,
    hasGrandTotal:
      payload.grandTotal !== undefined || payload.grandtotal !== undefined,
  };
};
