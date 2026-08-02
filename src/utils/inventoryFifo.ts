import dayjs from "dayjs";
import type { InventoryRecord } from "../services/inventoryRecordService";

export type InventoryConsumptionRecord = {
  id: string;
  itemId: string;
  date: string;
  pieces: number;
  isExternalUsage: boolean;
};

export type FifoLot = {
  inventoryRecordId: string;
  itemId: string;
  dateOfPrice: string;
  pricePerPiece: number;
  remainingPieces: number;
};

export type UsageCostResult = {
  usageId: string;
  itemId: string;
  pieces: number;
  totalPrice: number;
};

export type LotConsumptionInfo = {
  originalPieces: number;
  consumedPieces: number;
  remainingPieces: number;
};

export type FifoExpenseLotLine = {
  inventoryRecordId: string;
  dateOfPrice: string;
  pricePerPiece: number;
  piecesTaken: number;
  total: number;
};

export const FIFO_PREVIEW_EXPENSE_ID = "__fifo-preview__";

const toTime = (value?: string | null): number => {
  if (!value) return 0;
  const d = dayjs(value);
  return d.isValid() ? d.valueOf() : 0;
};

const sortInventoryRecords = (records: InventoryRecord[]): InventoryRecord[] =>
  [...records].sort((a, b) => {
    const byPriceDate = toTime(a.dateOfPrice) - toTime(b.dateOfPrice);
    if (byPriceDate !== 0) return byPriceDate;
    const byDate = toTime(a.date) - toTime(b.date);
    if (byDate !== 0) return byDate;
    const byCreated = toTime(a.createdAt) - toTime(b.createdAt);
    if (byCreated !== 0) return byCreated;
    return a.id.localeCompare(b.id);
  });

/**
 * FIFO costing:
 * - Inventory lots are ordered by dateOfPrice, then date, then createdAt.
 * - Consumption records are ordered by date ascending.
 */
export function computeFifoUsageCosts(params: {
  inventoryRecords: InventoryRecord[];
  consumptionRecords: InventoryConsumptionRecord[];
}): {
  usageCostsById: Map<string, UsageCostResult>;
  usageLotLinesById: Map<string, FifoExpenseLotLine[]>;
  remainingLotsByItemId: Map<string, FifoLot[]>;
} {
  const lotsByItemId = new Map<string, FifoLot[]>();
  const recordsByItem = new Map<string, InventoryRecord[]>();

  params.inventoryRecords.forEach((r) => {
    const arr = recordsByItem.get(r.itemId) || [];
    arr.push(r);
    recordsByItem.set(r.itemId, arr);
  });

  recordsByItem.forEach((records, itemId) => {
    const lots = sortInventoryRecords(records).map((r) => ({
      inventoryRecordId: r.id,
      itemId,
      dateOfPrice: r.dateOfPrice,
      pricePerPiece: Number(r.pricePerPiece) || 0,
      remainingPieces: Number(r.pieces) || 0,
    }));
    lotsByItemId.set(itemId, lots);
  });

  const usages = [...params.consumptionRecords].sort((a, b) => {
    const byDate = toTime(a.date) - toTime(b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });

  const usageCostsById = new Map<string, UsageCostResult>();
  const usageLotLinesById = new Map<string, FifoExpenseLotLine[]>();

  usages.forEach((u) => {
    const itemId = u.itemId;
    let remainingToConsume = Math.max(0, Number(u.pieces) || 0);
    let cost = 0;
    const lines: FifoExpenseLotLine[] = [];

    const lots = lotsByItemId.get(itemId) || [];

    for (const lot of lots) {
      if (remainingToConsume <= 0) break;
      if (lot.remainingPieces <= 0) continue;

      const take = Math.min(lot.remainingPieces, remainingToConsume);
      lot.remainingPieces -= take;
      remainingToConsume -= take;
      const pricePerPiece = Number(lot.pricePerPiece) || 0;
      cost += take * pricePerPiece;
      if (take > 0) {
        lines.push({
          inventoryRecordId: lot.inventoryRecordId,
          dateOfPrice: lot.dateOfPrice,
          pricePerPiece,
          piecesTaken: take,
          total: Number((take * pricePerPiece).toFixed(2)),
        });
      }
    }

    usageCostsById.set(u.id, {
      usageId: u.id,
      itemId,
      pieces: Math.max(0, Number(u.pieces) || 0),
      totalPrice: cost,
    });
    usageLotLinesById.set(u.id, lines);
  });

  const remainingLotsByItemId = new Map<string, FifoLot[]>();
  lotsByItemId.forEach((arr, itemId) => {
    remainingLotsByItemId.set(
      itemId,
      arr.map((l) => ({ ...l })),
    );
  });

  return { usageCostsById, usageLotLinesById, remainingLotsByItemId };
}

export function inventoryConsumptionFromExpenses(
  expenseRecords: Array<{
    id: string;
    source: string;
    inventoryItemId?: string | null;
    date: string;
    pieces?: number | null;
    isExternalUsage?: boolean | null;
  }>,
): InventoryConsumptionRecord[] {
  return expenseRecords
    .filter((r) => r.source === "inventory" && r.inventoryItemId)
    .map((r) => ({
      id: r.id,
      itemId: r.inventoryItemId as string,
      date: r.date,
      pieces: Number(r.pieces) || 0,
      isExternalUsage: Boolean(r.isExternalUsage),
    }));
}

export function getLotConsumptionByRecordId(params: {
  inventoryRecords: InventoryRecord[];
  consumptionRecords: InventoryConsumptionRecord[];
}): Map<string, LotConsumptionInfo> {
  const originalById = new Map<string, number>();
  params.inventoryRecords.forEach((r) => {
    originalById.set(r.id, Number(r.pieces) || 0);
  });

  const { remainingLotsByItemId } = computeFifoUsageCosts(params);
  const result = new Map<string, LotConsumptionInfo>();

  remainingLotsByItemId.forEach((lots) => {
    lots.forEach((lot) => {
      const original = originalById.get(lot.inventoryRecordId) ?? 0;
      const remaining = lot.remainingPieces;
      result.set(lot.inventoryRecordId, {
        originalPieces: original,
        consumedPieces: Math.max(0, original - remaining),
        remainingPieces: remaining,
      });
    });
  });

  params.inventoryRecords.forEach((r) => {
    if (!result.has(r.id)) {
      const original = Number(r.pieces) || 0;
      result.set(r.id, {
        originalPieces: original,
        consumedPieces: 0,
        remainingPieces: original,
      });
    }
  });

  return result;
}

export function computeInventoryExpenseLotAllocation(params: {
  inventoryRecords: InventoryRecord[];
  consumptionRecords: InventoryConsumptionRecord[];
  inventoryItemId: string;
  pieces: number;
  expenseDate: string;
  expenseId?: string;
  excludeExpenseId?: string;
}): {
  lines: FifoExpenseLotLine[];
  totalAmount: number | null;
} {
  const pieces = Math.floor(Number(params.pieces));
  if (!Number.isFinite(pieces) || pieces < 1) {
    return { lines: [], totalAmount: null };
  }

  const filtered = params.consumptionRecords.filter(
    (r) => r.id !== params.excludeExpenseId,
  );
  const targetId = params.expenseId ?? FIFO_PREVIEW_EXPENSE_ID;

  const { usageCostsById, usageLotLinesById } = computeFifoUsageCosts({
    inventoryRecords: params.inventoryRecords,
    consumptionRecords: [
      ...filtered,
      {
        id: targetId,
        itemId: params.inventoryItemId,
        date: params.expenseDate,
        pieces,
        isExternalUsage: false,
      },
    ],
  });

  const result = usageCostsById.get(targetId);
  if (!result) return { lines: [], totalAmount: null };
  return {
    lines: usageLotLinesById.get(targetId) ?? [],
    totalAmount: Number(result.totalPrice.toFixed(2)),
  };
}

export function computeInventoryExpenseAmount(params: {
  inventoryRecords: InventoryRecord[];
  consumptionRecords: InventoryConsumptionRecord[];
  inventoryItemId: string;
  pieces: number;
  expenseDate: string;
  expenseId?: string;
  excludeExpenseId?: string;
}): number | null {
  return computeInventoryExpenseLotAllocation(params).totalAmount;
}
