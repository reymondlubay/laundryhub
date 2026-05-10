import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export interface InventoryItem {
  id: string;
  name: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInventoryItemPayload {
  name: string;
  notes?: string;
}

export interface UpdateInventoryItemPayload {
  name?: string;
  notes?: string;
}

const normalize = (raw: unknown): InventoryItem => {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    notes: String(item.notes ?? ""),
    createdAt: String(item.createdAt ?? item.createdat ?? ""),
    updatedAt: String(item.updatedAt ?? item.updatedat ?? ""),
  };
};

type LookupListener = (items: InventoryItem[]) => void;
const listeners = new Set<LookupListener>();

let lookupLoadGen = 0;
let cache: InventoryItem[] | null = null;
let inFlight: Promise<InventoryItem[]> | null = null;

const notify = () => {
  if (!cache) return;
  const snapshot = [...cache];
  listeners.forEach((l) => l(snapshot));
};

const invalidate = () => {
  lookupLoadGen += 1;
  cache = null;
};

const fetchUnfilteredListFromApi = async (): Promise<InventoryItem[]> => {
  const { data } = await axiosClient.get(API_ROUTES.INVENTORY_ITEMS);
  const rows = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.data)
      ? data.data
      : [];
  return rows.map(normalize);
};

const getAllForLookup = async (): Promise<InventoryItem[]> => {
  if (cache) return cache;
  if (inFlight) return inFlight;

  const gen = lookupLoadGen;
  inFlight = (async () => {
    try {
      const list = await fetchUnfilteredListFromApi();
      if (gen === lookupLoadGen) {
        cache = list;
        notify();
      }
      return list;
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.SAVE_FAILED
          : error instanceof Error
            ? error.message
            : API_ERRORS.SAVE_FAILED;
      throw new Error(message);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};

const subscribeToLookup = (listener: LookupListener) => {
  listeners.add(listener);
  if (cache) listener([...cache]);
  else void getAllForLookup().catch(() => {});
  return () => {
    listeners.delete(listener);
  };
};

const inventoryItemService = {
  getAll: async (): Promise<InventoryItem[]> => {
    try {
      return await getAllForLookup();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : API_ERRORS.SAVE_FAILED;
      throw new Error(message);
    }
  },

  create: async (payload: CreateInventoryItemPayload): Promise<InventoryItem> => {
    try {
      const { data } = await axiosClient.post(API_ROUTES.INVENTORY_ITEMS, payload);
      const created = normalize(data.item);
      invalidate();
      void getAllForLookup().catch(() => {});
      return created;
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
    payload: UpdateInventoryItemPayload,
  ): Promise<InventoryItem> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.INVENTORY_ITEMS}/${id}`,
        payload,
      );
      const updated = normalize(data.item);
      invalidate();
      void getAllForLookup().catch(() => {});
      return updated;
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
      await axiosClient.delete(`${API_ROUTES.INVENTORY_ITEMS}/${id}`);
      invalidate();
      void getAllForLookup().catch(() => {});
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

  getAllForLookup,
  subscribeToLookup,
};

export default inventoryItemService;
export { getAllForLookup, subscribeToLookup };

