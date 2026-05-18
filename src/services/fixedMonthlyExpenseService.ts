import dayjs from "dayjs";
import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export interface FixedMonthlyExpense {
  id: string;
  name: string;
  monthlyAmount: number;
  isActive: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFixedMonthlyExpensePayload {
  name: string;
  monthlyAmount: number;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateFixedMonthlyExpensePayload {
  name?: string;
  monthlyAmount?: number;
  isActive?: boolean;
  notes?: string | null;
}

const normalize = (raw: unknown): FixedMonthlyExpense => {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    monthlyAmount: Number(item.monthlyAmount ?? item.monthlyamount ?? 0),
    isActive: Boolean(item.isActive ?? item.isactive ?? true),
    notes: item.notes == null ? null : String(item.notes),
    createdAt: String(item.createdAt ?? item.createdat ?? ""),
    updatedAt: String(item.updatedAt ?? item.updatedat ?? ""),
  };
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response
      ?.data?.message === "string"
  ) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message || fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

/** Sum of `monthlyAmount` for active items (current month and forward). */
export const getActiveFixedMonthlyTotal = (
  items: FixedMonthlyExpense[],
): number =>
  items
    .filter((i) => i.isActive)
    .reduce((s, i) => s + (Number.isFinite(i.monthlyAmount) ? i.monthlyAmount : 0), 0);

export type FixedMonthlyExpenseBundle = {
  items: FixedMonthlyExpense[];
  monthSnapshots: Record<string, number>;
};

const normalizeMonthSnapshots = (raw: unknown): Record<string, number> => {
  if (!raw || typeof raw !== "object") return {};
  const map: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const amount = Number(value);
    map[key] = Number.isFinite(amount) ? amount : 0;
  }
  return map;
};

/**
 * Past months use frozen snapshot totals; current month and future use live active items.
 */
export const getFixedMonthlyTotalForMonth = (
  items: FixedMonthlyExpense[],
  monthKey: string,
  monthSnapshots: Record<string, number>,
): number => {
  const currentMonthKey = dayjs().format("YYYY-MM");
  if (monthKey >= currentMonthKey) {
    return getActiveFixedMonthlyTotal(items);
  }
  if (Object.prototype.hasOwnProperty.call(monthSnapshots, monthKey)) {
    return monthSnapshots[monthKey];
  }
  return getActiveFixedMonthlyTotal(items);
};

const fixedMonthlyExpenseService = {
  getAll: async (): Promise<FixedMonthlyExpense[]> => {
    const bundle = await fixedMonthlyExpenseService.getAllWithSnapshots();
    return bundle.items;
  },

  getAllWithSnapshots: async (): Promise<FixedMonthlyExpenseBundle> => {
    try {
      const { data } = await axiosClient.get(API_ROUTES.FIXED_MONTHLY_EXPENSES);
      const rows = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data?.items)
          ? data.data.items
          : Array.isArray(data.data)
            ? data.data
            : [];
      const snapshots =
        data.monthSnapshots != null
          ? normalizeMonthSnapshots(data.monthSnapshots)
          : data.data?.monthSnapshots != null
            ? normalizeMonthSnapshots(data.data.monthSnapshots)
            : {};
      return {
        items: rows.map(normalize),
        monthSnapshots: snapshots,
      };
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  create: async (
    payload: CreateFixedMonthlyExpensePayload,
  ): Promise<FixedMonthlyExpense> => {
    try {
      const { data } = await axiosClient.post(
        API_ROUTES.FIXED_MONTHLY_EXPENSES,
        payload,
      );
      return normalize(data.item);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  update: async (
    id: string,
    payload: UpdateFixedMonthlyExpensePayload,
  ): Promise<FixedMonthlyExpense> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.FIXED_MONTHLY_EXPENSES}/${id}`,
        payload,
      );
      return normalize(data.item);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_ROUTES.FIXED_MONTHLY_EXPENSES}/${id}`);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },
};

export default fixedMonthlyExpenseService;
export { normalize as normalizeFixedMonthlyExpense };
