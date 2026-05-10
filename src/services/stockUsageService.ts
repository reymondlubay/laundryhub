import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export interface StockUsageRecord {
  id: string;
  itemId: string;
  date: string;
  pieces: number;
  isExternalUsage?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStockUsagePayload {
  itemId: string;
  date: string;
  pieces: number;
  isExternalUsage?: boolean;
}

export interface UpdateStockUsagePayload {
  itemId?: string;
  date?: string;
  pieces?: number;
  isExternalUsage?: boolean;
}

const normalize = (raw: unknown): StockUsageRecord => {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    itemId: String(item.itemId ?? item.itemid ?? ""),
    date: String(item.date ?? ""),
    pieces: Number(item.pieces ?? 0),
    isExternalUsage: Boolean(
      item.isExternalUsage ?? item.isexternalusage ?? false,
    ),
    createdAt: String(item.createdAt ?? item.createdat ?? ""),
    updatedAt: String(item.updatedAt ?? item.updatedat ?? ""),
  };
};

const stockUsageService = {
  getAll: async (): Promise<StockUsageRecord[]> => {
    try {
      const { data } = await axiosClient.get(API_ROUTES.STOCK_USAGE_RECORDS);
      const rows = Array.isArray(data.records)
        ? data.records
        : Array.isArray(data.data)
          ? data.data
          : [];
      return rows.map(normalize);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : API_ERRORS.SAVE_FAILED;
      throw new Error(message);
    }
  },

  create: async (payload: CreateStockUsagePayload): Promise<StockUsageRecord> => {
    try {
      const { data } = await axiosClient.post(API_ROUTES.STOCK_USAGE_RECORDS, payload);
      return normalize(data.record);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.SAVE_FAILED
          : API_ERRORS.SAVE_FAILED;
      throw new Error(message);
    }
  },

  update: async (
    id: string,
    payload: UpdateStockUsagePayload,
  ): Promise<StockUsageRecord> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.STOCK_USAGE_RECORDS}/${id}`,
        payload,
      );
      return normalize(data.record);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.SAVE_FAILED
          : API_ERRORS.SAVE_FAILED;
      throw new Error(message);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_ROUTES.STOCK_USAGE_RECORDS}/${id}`);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.SAVE_FAILED
          : API_ERRORS.SAVE_FAILED;
      throw new Error(message);
    }
  },
};

export default stockUsageService;

