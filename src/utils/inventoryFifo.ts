import dayjs from "dayjs";
import type { InventoryRecord } from "../services/inventoryRecordService";
import type { StockUsageRecord } from "../services/stockUsageService";

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
 * - Stock usage is ordered by `date` ascending.
 * Each usage consumes the oldest remaining lots first.
 */
export function computeFifoUsageCosts(params: {
  inventoryRecords: InventoryRecord[];
  stockUsageRecords: StockUsageRecord[];
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

  // sort lots FIFO
  lotsByItemId.forEach((arr) => {
    arr.sort((a, b) => {
      const byPriceDate = toTime(a.dateOfPrice) - toTime(b.dateOfPrice);
      if (byPriceDate !== 0) return byPriceDate;
      return a.inventoryRecordId.localeCompare(b.inventoryRecordId);
    });
  });

  const usages = [...params.stockUsageRecords].sort((a, b) => {
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

  // return deep-ish copies of remaining lots (so callers can't mutate internal)
  const remainingLotsByItemId = new Map<string, FifoLot[]>();
  lotsByItemId.forEach((arr, itemId) => {
    remainingLotsByItemId.set(
      itemId,
      arr.map((l) => ({ ...l })),
    );
  });

  return { usageCostsById, remainingLotsByItemId };
}

