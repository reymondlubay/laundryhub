/**
 * Same detail lines as the Transaction table Customer column info tooltip
 * (delivery, add-ons, notes).
 */
const formatAmount = (amount: number): string =>
  Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);

export type TransactionNoteDetailSource = {
  notes?: string | null;
  isDelivered?: boolean;
  whitePrice?: number;
  fabconQty?: number;
  detergentQty?: number;
  colorSafeQty?: number;
  isdelivered?: boolean;
  whiteprice?: number;
  fabconqty?: number;
  detergentqty?: number;
  colorsafeqty?: number;
};

export function getTransactionNoteDetailLines(
  row: TransactionNoteDetailSource | null | undefined,
): string[] {
  if (!row) return [];
  const noteText = row.notes && row.notes !== "-" ? String(row.notes) : "";
  const isDelivered = Boolean(row.isDelivered ?? row.isdelivered);
  const whitePrice = Number(row.whitePrice ?? row.whiteprice ?? 0);
  const fabconQty = Number(row.fabconQty ?? row.fabconqty ?? 0);
  const detergentQty = Number(row.detergentQty ?? row.detergentqty ?? 0);
  const colorSafeQty = Number(row.colorSafeQty ?? row.colorsafeqty ?? 0);

  const details: string[] = [];
  if (isDelivered) details.push("Delivery");
  if (whitePrice > 0)
    details.push(`Add White +${formatAmount(whitePrice)}`);
  if (fabconQty > 0) details.push(`Fabcon x${fabconQty}`);
  if (detergentQty > 0) details.push(`Detergent x${detergentQty}`);
  if (colorSafeQty > 0) details.push(`Color Safe x${colorSafeQty}`);
  if (noteText) details.push(`Notes ${noteText}`);

  return details;
}
