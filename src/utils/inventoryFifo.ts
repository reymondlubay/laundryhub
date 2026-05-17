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

const toTime = (value?: string | null): number => {
  if (!value) return 0;
  const d = dayjs(value);
  return d.isValid() ? d.valueOf() : 0;
};

/**
 * FIFO costing:
 * - Inventory lots are ordered by `dateOfPrice` ascending (then by record `date`).
 * - Consumption records are ordered by `date` ascending.
 * Each consumption consumes the oldest remaining lots first.
 */
export function computeFifoUsageCosts(params: {
  inventoryRecords: InventoryRecord[];
  consumptionRecords: InventoryConsumptionRecord[];
}): {
  usageCostsById: Map<string, UsageCostResult>;
  remainingLotsByItemId: Map<string, FifoLot[]>;
} {
  const lotsByItemId = new Map<string, FifoLot[]>();

  params.inventoryRecords.forEach((r) => {
    const itemId = r.itemId;
    const lot: FifoLot = {
      inventoryRecordId: r.id,
      itemId,
      dateOfPrice: r.dateOfPrice,
      pricePerPiece: Number(r.pricePerPiece) || 0,
      remainingPieces: Number(r.pieces) || 0,
    };
    const arr = lotsByItemId.get(itemId) || [];
    arr.push(lot);
    lotsByItemId.set(itemId, arr);
  });

  lotsByItemId.forEach((arr) => {
    arr.sort((a, b) => {
      const byPriceDate = toTime(a.dateOfPrice) - toTime(b.dateOfPrice);
      if (byPriceDate !== 0) return byPriceDate;
      return a.inventoryRecordId.localeCompare(b.inventoryRecordId);
    });
  });

  const usages = [...params.consumptionRecords].sort((a, b) => {
    const byDate = toTime(a.date) - toTime(b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });

  const usageCostsById = new Map<string, UsageCostResult>();

  usages.forEach((u) => {
    const itemId = u.itemId;
    let remainingToConsume = Math.max(0, Number(u.pieces) || 0);
    let cost = 0;

    const lots = lotsByItemId.get(itemId) || [];

    for (const lot of lots) {
      if (remainingToConsume <= 0) break;
      if (lot.remainingPieces <= 0) continue;

      const take = Math.min(lot.remainingPieces, remainingToConsume);
      lot.remainingPieces -= take;
      remainingToConsume -= take;
      cost += take * (Number(lot.pricePerPiece) || 0);
    }

    usageCostsById.set(u.id, {
      usageId: u.id,
      itemId,
      pieces: Math.max(0, Number(u.pieces) || 0),
      totalPrice: cost,
    });
  });

  const remainingLotsByItemId = new Map<string, FifoLot[]>();
  lotsByItemId.forEach((arr, itemId) => {
    remainingLotsByItemId.set(
      itemId,
      arr.map((l) => ({ ...l })),
    );
  });

  return { usageCostsById, remainingLotsByItemId };
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
