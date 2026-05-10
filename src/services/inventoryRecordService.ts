import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export interface InventoryRecord {
  id: string;
  itemId: string;
  date: string;
  pieces: number;
  pricePerPiece: number;
  dateOfPrice: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInventoryRecordPayload {
  itemId: string;
  date: string;
  pieces: number;
  pricePerPiece: number;
  dateOfPrice: string;
}

export interface UpdateInventoryRecordPayload {
  itemId?: string;
  date?: string;
  pieces?: number;
  pricePerPiece?: number;
  dateOfPrice?: string;
}

const normalize = (raw: unknown): InventoryRecord => {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    itemId: String(item.itemId ?? item.itemid ?? ""),
    date: String(item.date ?? ""),
    pieces: Number(item.pieces ?? 0),
    pricePerPiece: Number(item.pricePerPiece ?? item.priceperpiece ?? 0),
    dateOfPrice: String(item.dateOfPrice ?? item.dateofprice ?? ""),
    createdAt: String(item.createdAt ?? item.createdat ?? ""),
    updatedAt: String(item.updatedAt ?? item.updatedat ?? ""),
  };
};

const inventoryRecordService = {
  getAll: async (): Promise<InventoryRecord[]> => {
    try {
      const { data } = await axiosClient.get(API_ROUTES.INVENTORY_RECORDS);
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

  create: async (
    payload: CreateInventoryRecordPayload,
  ): Promise<InventoryRecord> => {
    try {
      const { data } = await axiosClient.post(API_ROUTES.INVENTORY_RECORDS, payload);
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
    payload: UpdateInventoryRecordPayload,
  ): Promise<InventoryRecord> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.INVENTORY_RECORDS}/${id}`,
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
      await axiosClient.delete(`${API_ROUTES.INVENTORY_RECORDS}/${id}`);
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

export default inventoryRecordService;

