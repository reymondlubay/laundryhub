import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export type ExpenseSource = "inventory" | "expense";

export interface ExpenseRecord {
  id: string;
  source: ExpenseSource;
  inventoryItemId?: string | null;
  expenseItemId?: string | null;
  date: string;
  pieces?: number | null;
  amount?: number | null;
  isExternalUsage?: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInventoryExpensePayload {
  source: "inventory";
  inventoryItemId: string;
  date: string;
  pieces: number;
  isExternalUsage?: boolean;
  notes?: string;
}

export interface CreateExpenseItemExpensePayload {
  source: "expense";
  expenseItemId: string;
  date: string;
  amount: number;
  isExternalUsage?: boolean;
  notes?: string;
}

export type CreateExpenseRecordPayload =
  | CreateInventoryExpensePayload
  | CreateExpenseItemExpensePayload;

export interface UpdateExpenseRecordPayload {
  source?: ExpenseSource;
  inventoryItemId?: string | null;
  expenseItemId?: string | null;
  date?: string;
  pieces?: number | null;
  amount?: number | null;
  isExternalUsage?: boolean;
  notes?: string | null;
}

const toOptionalString = (value: unknown): string | null => {
  if (value == null) return null;
  const s = String(value);
  return s === "" ? null : s;
};

const toOptionalNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalize = (raw: unknown): ExpenseRecord => {
  const item = raw as Record<string, unknown>;
  const source =
    item.source === "expense" ? "expense" : ("inventory" as ExpenseSource);
  return {
    id: String(item.id ?? ""),
    source,
    inventoryItemId: toOptionalString(
      item.inventoryItemId ?? item.inventoryitemid,
    ),
    expenseItemId: toOptionalString(item.expenseItemId ?? item.expenseitemid),
    date: String(item.date ?? ""),
    pieces: toOptionalNumber(item.pieces),
    amount: toOptionalNumber(item.amount),
    isExternalUsage: Boolean(
      item.isExternalUsage ?? item.isexternalusage ?? false,
    ),
    notes:
      item.notes == null
        ? null
        : String(item.notes) === ""
          ? null
          : String(item.notes),
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

const expenseRecordService = {
  getAll: async (): Promise<ExpenseRecord[]> => {
    try {
      const { data } = await axiosClient.get(API_ROUTES.EXPENSE_RECORDS);
      const rows = Array.isArray(data.records)
        ? data.records
        : Array.isArray(data.data)
          ? data.data
          : [];
      return rows.map(normalize);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  create: async (
    payload: CreateExpenseRecordPayload,
  ): Promise<ExpenseRecord> => {
    try {
      const { data } = await axiosClient.post(
        API_ROUTES.EXPENSE_RECORDS,
        payload,
      );
      return normalize(data.record);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  update: async (
    id: string,
    payload: UpdateExpenseRecordPayload,
  ): Promise<ExpenseRecord> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.EXPENSE_RECORDS}/${id}`,
        payload,
      );
      return normalize(data.record);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_ROUTES.EXPENSE_RECORDS}/${id}`);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },
};

export default expenseRecordService;
