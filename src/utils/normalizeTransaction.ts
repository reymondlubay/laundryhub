import type { Transaction } from "../services/transactionService";

/** Read a numeric field; prefers API lowercase keys when both casings exist. */
export const pickTransactionNum = (
  row: Record<string, unknown>,
  ...keys: string[]
): number => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
};

/** Like pickTransactionNum but returns undefined when no key is present. */
export const pickOptionalTransactionNum = (
  row: Record<string, unknown>,
  ...keys: string[]
): number | undefined => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

/** Normalize PostgreSQL lowercase columns onto the Transaction shape used by the UI. */
export const normalizeTransactionRow = (
  raw: Transaction | Record<string, unknown>,
): Transaction => {
  const row = raw as Record<string, unknown>;
  const base = { ...raw } as Transaction;

  return {
    ...base,
    whitePrice: pickTransactionNum(row, "whiteprice", "whitePrice"),
    fabconQty: pickTransactionNum(row, "fabconqty", "fabconQty"),
    detergentQty: pickTransactionNum(row, "detergentqty", "detergentQty"),
    colorSafeQty: pickTransactionNum(row, "colorsafeqty", "colorSafeQty"),
    loadSubtotal: pickTransactionNum(row, "loadsubtotal", "loadSubtotal"),
    addonsSubtotal: pickTransactionNum(row, "addonssubtotal", "addonsSubtotal"),
    grandTotal: pickTransactionNum(row, "grandtotal", "grandTotal"),
    fabconUnitPrice: pickTransactionNum(
      row,
      "fabconunitprice",
      "fabconUnitPrice",
    ),
    detergentUnitPrice: pickTransactionNum(
      row,
      "detergentunitprice",
      "detergentUnitPrice",
    ),
    colorSafeUnitPrice: pickTransactionNum(
      row,
      "colorsafeunitprice",
      "colorSafeUnitPrice",
    ),
  };
};
