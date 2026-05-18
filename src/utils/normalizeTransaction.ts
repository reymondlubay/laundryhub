import type { Transaction } from "../services/transactionService";

const pickNum = (row: Record<string, unknown>, ...keys: string[]): number => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
};

/** Normalize PostgreSQL lowercase columns onto the Transaction shape used by the UI. */
export const normalizeTransactionRow = (
  raw: Transaction | Record<string, unknown>,
): Transaction => {
  const row = raw as Record<string, unknown>;
  const base = { ...raw } as Transaction;

  const loadSubtotal = pickNum(row, "loadSubtotal", "loadsubtotal");
  const addonsSubtotal = pickNum(row, "addonsSubtotal", "addonssubtotal");
  const grandTotal = pickNum(row, "grandTotal", "grandtotal");

  return {
    ...base,
    whitePrice: pickNum(row, "whitePrice", "whiteprice") || base.whitePrice,
    fabconQty: pickNum(row, "fabconQty", "fabconqty") || base.fabconQty,
    detergentQty:
      pickNum(row, "detergentQty", "detergentqty") || base.detergentQty,
    colorSafeQty:
      pickNum(row, "colorSafeQty", "colorsafeqty") || base.colorSafeQty,
    loadSubtotal: loadSubtotal || base.loadSubtotal,
    addonsSubtotal: addonsSubtotal || base.addonsSubtotal,
    grandTotal: grandTotal || base.grandTotal,
    fabconUnitPrice:
      pickNum(row, "fabconUnitPrice", "fabconunitprice") || base.fabconUnitPrice,
    detergentUnitPrice:
      pickNum(row, "detergentUnitPrice", "detergentunitprice") ||
      base.detergentUnitPrice,
    colorSafeUnitPrice:
      pickNum(row, "colorSafeUnitPrice", "colorsafeunitprice") ||
      base.colorSafeUnitPrice,
  };
};
