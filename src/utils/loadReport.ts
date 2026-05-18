import dayjs, { type Dayjs } from "dayjs";
import type { Transaction } from "../services/transactionService";

export type LoadLike = {
  type?: string | null;
  kg?: number | string | null;
  loads?: number | string | null;
  price?: number | string | null;
};

type TransactionWithLegacyFields = Transaction & {
  dateloaded?: string;
  loaddetails?: LoadLike[];
  load_details?: LoadLike[];
};

export type LoadTypeTotals = {
  clothesKg: number;
  clothesLoads: number;
  beddingsKg: number;
  beddingsLoads: number;
  comforterLoads: number;
  totalKgLoad: number;
  totalKgLoads: number;
  totalLoads: number;
  clothesAvgKg: number;
  beddingsAvgKg: number;
  totalKgLoadAvg: number;
};

export const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

export const formatCount = (value: number): string =>
  Math.round(value).toLocaleString("en-US");

export const formatKg = (value: number): string =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const normalizeLoadType = (type: unknown): string =>
  String(type ?? "Clothes")
    .trim()
    .toLowerCase();

export const getLoadDetails = (transaction: Transaction): LoadLike[] => {
  const tx = transaction as TransactionWithLegacyFields;

  if (
    Array.isArray(transaction.loadDetails) &&
    transaction.loadDetails.length > 0
  ) {
    return transaction.loadDetails as LoadLike[];
  }
  if (Array.isArray(tx.loaddetails) && tx.loaddetails.length > 0) {
    return tx.loaddetails;
  }
  if (Array.isArray(tx.load_details) && tx.load_details.length > 0) {
    return tx.load_details;
  }

  return [];
};

export const getDateLoaded = (transaction: Transaction): string | undefined => {
  const tx = transaction as TransactionWithLegacyFields;
  return transaction.dateLoaded || tx.dateloaded;
};

export const normalizeRange = (from: Dayjs, to: Dayjs): { from: Dayjs; to: Dayjs } => {
  if (from.isAfter(to)) return { from: to, to: from };
  return { from, to };
};

export const isWithinRange = (
  dateValue: string | undefined,
  from: Dayjs,
  to: Dayjs,
): boolean => {
  if (!dateValue) return false;
  const date = dayjs(dateValue);
  if (!date.isValid()) return false;
  return (
    !date.isBefore(from.startOf("day")) && !date.isAfter(to.endOf("day"))
  );
};

export const sumLoadByType = (rows: Transaction[]): LoadTypeTotals => {
  let clothesKg = 0;
  let clothesLoads = 0;
  let beddingsKg = 0;
  let beddingsLoads = 0;
  let comforterLoads = 0;
  let totalLoads = 0;

  for (const transaction of rows) {
    for (const row of getLoadDetails(transaction)) {
      const loadType = normalizeLoadType(row.type);
      const kg = toNumber(row.kg);
      const loads = toNumber(row.loads);
      totalLoads += loads;

      if (loadType === "comforter") {
        comforterLoads += loads;
      } else if (loadType === "beddings") {
        beddingsKg += kg;
        beddingsLoads += loads;
      } else {
        clothesKg += kg;
        clothesLoads += loads;
      }
    }
  }

  const totalKgLoad = clothesKg + beddingsKg;
  const totalKgLoads = clothesLoads + beddingsLoads;

  return {
    clothesKg,
    clothesLoads,
    beddingsKg,
    beddingsLoads,
    comforterLoads,
    totalKgLoad,
    totalKgLoads,
    totalLoads,
    clothesAvgKg: clothesLoads > 0 ? clothesKg / clothesLoads : 0,
    beddingsAvgKg: beddingsLoads > 0 ? beddingsKg / beddingsLoads : 0,
    totalKgLoadAvg: totalKgLoads > 0 ? totalKgLoad / totalKgLoads : 0,
  };
};

export const formatKgWithAvg = (
  label: string,
  totalKg: number,
  loadCount: number,
  avgKg: number,
): string => {
  const avgText = loadCount > 0 ? `${formatKg(avgKg)} KG` : "-";
  return `${label} - ${formatCount(loadCount)} Loads | ${formatKg(totalKg)} KG | Avg. ${avgText}`;
};

export const filterTransactionsByDateLoaded = (
  transactions: Transaction[],
  from: Dayjs,
  to: Dayjs,
): Transaction[] => {
  const range = normalizeRange(from, to);
  return transactions.filter((transaction) => {
    if (transaction.isDeleted) return false;
    return isWithinRange(getDateLoaded(transaction), range.from, range.to);
  });
};

export const hasLoadActivity = (totals: LoadTypeTotals): boolean =>
  totals.totalLoads > 0 ||
  totals.totalKgLoad > 0 ||
  totals.comforterLoads > 0;
