import { DEFAULT_ADDONS_PRICING } from "../services/addonsPricingService";
import type { AddonsPricing } from "../services/addonsPricingService";
import {
  pickOptionalTransactionNum,
  pickTransactionNum,
} from "./normalizeTransaction";

const asRecord = (value: object): Record<string, unknown> =>
  value as Record<string, unknown>;

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
  const row = asRecord(payload);
  const whitePrice = pickTransactionNum(row, "whiteprice", "whitePrice");
  const fabconQty = pickTransactionNum(row, "fabconqty", "fabconQty");
  const detergentQty = pickTransactionNum(row, "detergentqty", "detergentQty");
  const colorSafeQty = pickTransactionNum(row, "colorsafeqty", "colorSafeQty");

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
  const row = asRecord(payload);
  const grandTotal = pickTransactionNum(row, "grandtotal", "grandTotal");
  const loadSubtotal = pickTransactionNum(row, "loadsubtotal", "loadSubtotal");
  const addonsSubtotal = pickTransactionNum(
    row,
    "addonssubtotal",
    "addonsSubtotal",
  );

  const hasGrandTotal =
    row.grandTotal !== undefined || row.grandtotal !== undefined;
  const hasLoadSubtotal =
    row.loadSubtotal !== undefined || row.loadsubtotal !== undefined;
  const hasAddonsSubtotal =
    row.addonsSubtotal !== undefined || row.addonssubtotal !== undefined;

  const hasPersistedSnapshots =
    grandTotal > 0 || loadSubtotal > 0 || addonsSubtotal > 0;

  return {
    grandTotal,
    loadSubtotal,
    addonsSubtotal,
    hasGrandTotal,
    hasLoadSubtotal,
    hasAddonsSubtotal,
    hasPersistedSnapshots,
  };
};

/**
 * Reconstruct per-addon unit prices from a frozen addonsSubtotal when possible.
 * Used so old transactions do not pick up today's global addon prices.
 */
export const inferAddonPricingFromSnapshots = (
  transaction: Record<string, unknown>,
  fallback: AddonsPricing = DEFAULT_ADDONS_PRICING,
): AddonsPricing | null => {
  const addonsSubtotal = pickTransactionNum(
    transaction,
    "addonssubtotal",
    "addonsSubtotal",
  );
  if (addonsSubtotal <= 0) return null;

  const whitePrice = pickTransactionNum(transaction, "whiteprice", "whitePrice");
  const fabconQty = pickTransactionNum(transaction, "fabconqty", "fabconQty");
  const detergentQty = pickTransactionNum(
    transaction,
    "detergentqty",
    "detergentQty",
  );
  const colorSafeQty = pickTransactionNum(
    transaction,
    "colorsafeqty",
    "colorSafeQty",
  );

  const addonRemainder = Math.max(0, addonsSubtotal - whitePrice);
  const pricedQty = [
    { qty: fabconQty, key: "fabcon" as const },
    { qty: detergentQty, key: "detergent" as const },
    { qty: colorSafeQty, key: "colorSafe" as const },
  ].filter((entry) => entry.qty > 0);

  if (pricedQty.length === 0) {
    return { ...fallback };
  }

  if (pricedQty.length === 1) {
    const unit = addonRemainder / pricedQty[0].qty;
    return {
      fabconPrice: pricedQty[0].key === "fabcon" ? unit : 0,
      detergentPrice: pricedQty[0].key === "detergent" ? unit : 0,
      colorSafePrice: pricedQty[0].key === "colorSafe" ? unit : 0,
    };
  }

  const stored: AddonsPricing = {
    fabconPrice: pickTransactionNum(
      transaction,
      "fabconunitprice",
      "fabconUnitPrice",
    ),
    detergentPrice: pickTransactionNum(
      transaction,
      "detergentunitprice",
      "detergentUnitPrice",
    ),
    colorSafePrice: pickTransactionNum(
      transaction,
      "colorsafeunitprice",
      "colorSafeUnitPrice",
    ),
  };

  const fromStored =
    fabconQty * stored.fabconPrice +
    detergentQty * stored.detergentPrice +
    colorSafeQty * stored.colorSafePrice;

  if (fromStored > 0 && Math.abs(fromStored - addonRemainder) < 0.02) {
    return stored;
  }

  if (fromStored > 0) {
    const scale = addonRemainder / fromStored;
    return {
      fabconPrice: stored.fabconPrice * scale,
      detergentPrice: stored.detergentPrice * scale,
      colorSafePrice: stored.colorSafePrice * scale,
    };
  }

  const perUnit = addonRemainder / pricedQty.reduce((sum, e) => sum + e.qty, 0);
  return {
    fabconPrice: fabconQty > 0 ? perUnit : 0,
    detergentPrice: detergentQty > 0 ? perUnit : 0,
    colorSafePrice: colorSafeQty > 0 ? perUnit : 0,
  };
};

export const getTransactionAddonPricing = (
  transaction: Record<string, unknown>,
  currentPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): AddonsPricing => {
  const inferred = inferAddonPricingFromSnapshots(transaction, currentPricing);
  if (inferred) {
    return inferred;
  }

  const hasStored =
    transaction.fabconUnitPrice != null ||
    transaction.fabconunitprice != null ||
    transaction.detergentUnitPrice != null ||
    transaction.detergentunitprice != null ||
    transaction.colorSafeUnitPrice != null ||
    transaction.colorsafeunitprice != null;

  if (!hasStored) {
    return currentPricing;
  }

  return {
    fabconPrice:
      pickOptionalTransactionNum(
        transaction,
        "fabconunitprice",
        "fabconUnitPrice",
      ) ?? currentPricing.fabconPrice,
    detergentPrice:
      pickOptionalTransactionNum(
        transaction,
        "detergentunitprice",
        "detergentUnitPrice",
      ) ?? currentPricing.detergentPrice,
    colorSafePrice:
      pickOptionalTransactionNum(
        transaction,
        "colorsafeunitprice",
        "colorSafeUnitPrice",
      ) ?? currentPricing.colorSafePrice,
  };
};

/** Prefer frozen snapshot totals; only recalculate when no persisted snapshot exists. */
export const getTransactionGrandTotal = (
  transaction: {
    whitePrice?: number | string | null;
    whiteprice?: number | string | null;
    fabconQty?: number | string | null;
    fabconqty?: number | string | null;
    detergentQty?: number | string | null;
    detergentqty?: number | string | null;
    colorSafeQty?: number | string | null;
    colorsafeqty?: number | string | null;
    grandTotal?: number | string | null;
    grandtotal?: number | string | null;
    loadSubtotal?: number | string | null;
    loadsubtotal?: number | string | null;
    addonsSubtotal?: number | string | null;
    addonssubtotal?: number | string | null;
    loadDetails?: Array<{ price?: number | string | null }>;
  },
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): number => {
  const stored = getStoredSnapshots(transaction);
  const loads = Array.isArray(transaction.loadDetails)
    ? transaction.loadDetails
    : [];
  const loadFromLines = getLoadTotal(loads);

  if (stored.grandTotal > 0) {
    return stored.grandTotal;
  }

  if (stored.addonsSubtotal > 0 || stored.loadSubtotal > 0) {
    const loadPart =
      stored.loadSubtotal > 0 ? stored.loadSubtotal : loadFromLines;
    return loadPart + stored.addonsSubtotal;
  }

  const loadTotal = loadFromLines;
  const effectivePricing = getTransactionAddonPricing(
    transaction as Record<string, unknown>,
    addonsPricing,
  );
  return loadTotal + getAddonsTotal(transaction, effectivePricing);
};

/** Per-transaction discount (money), floored at 0. Handles lowercase PG key. */
export const getTransactionDiscount = (transaction: object): number => {
  const discount = pickTransactionNum(
    asRecord(transaction),
    "discount",
    "discount",
  );
  return discount > 0 ? discount : 0;
};

/**
 * Amount the customer owes after discount: max(0, grandTotal - discount).
 * Use this anywhere "price / amount owed / balance / net sales" is meant.
 */
export const getTransactionAmountDue = (
  transaction: Parameters<typeof getTransactionGrandTotal>[0],
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): number => {
  const gross = getTransactionGrandTotal(transaction, addonsPricing);
  const discount = getTransactionDiscount(transaction as object);
  return Math.max(0, gross - discount);
};

/** Grand total stored on the row (for edit UI), ignoring live addon settings. */
export const getFrozenTransactionGrandTotal = (
  transaction: Record<string, unknown>,
): number | null => {
  const stored = getStoredSnapshots(transaction);
  if (stored.grandTotal > 0) return stored.grandTotal;
  if (stored.addonsSubtotal > 0 || stored.loadSubtotal > 0) {
    const loads = Array.isArray(transaction.loadDetails)
      ? (transaction.loadDetails as Array<{ price?: number | string | null }>)
      : [];
    const loadPart =
      stored.loadSubtotal > 0 ? stored.loadSubtotal : getLoadTotal(loads);
    return loadPart + stored.addonsSubtotal;
  }
  return null;
};
