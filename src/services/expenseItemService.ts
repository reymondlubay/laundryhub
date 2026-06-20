import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export interface ExpenseItem {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  isAdminOnly: boolean;
  piecesRequired: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenseItemPayload {
  name: string;
  description?: string;
  notes?: string;
  isAdminOnly?: boolean;
  piecesRequired?: boolean;
}

export interface UpdateExpenseItemPayload {
  name?: string;
  description?: string;
  notes?: string;
  isAdminOnly?: boolean;
  piecesRequired?: boolean;
}

const normalize = (raw: unknown): ExpenseItem => {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    description: String(item.description ?? ""),
    notes: String(item.notes ?? ""),
    isAdminOnly: Boolean(item.isAdminOnly ?? item.isadminonly ?? false),
    piecesRequired: Boolean(item.piecesRequired ?? item.piecesrequired ?? false),
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

type LookupListener = (items: ExpenseItem[]) => void;
const listeners = new Set<LookupListener>();

let lookupLoadGen = 0;
let cache: ExpenseItem[] | null = null;
let inFlight: Promise<ExpenseItem[]> | null = null;

const notify = () => {
  if (!cache) return;
  const snapshot = [...cache];
  listeners.forEach((l) => l(snapshot));
};

const invalidate = () => {
  lookupLoadGen += 1;
  cache = null;
};

const fetchListFromApi = async (): Promise<ExpenseItem[]> => {
  const { data } = await axiosClient.get(API_ROUTES.EXPENSE_ITEMS);
  const rows = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.data)
      ? data.data
      : [];
  return rows.map(normalize);
};

const getAllForLookup = async (): Promise<ExpenseItem[]> => {
  if (cache) return cache;
  if (inFlight) return inFlight;

  const gen = lookupLoadGen;
  inFlight = (async () => {
    try {
      const list = await fetchListFromApi();
      if (gen === lookupLoadGen) {
        cache = list;
        notify();
      }
      return list;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
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

const expenseItemService = {
  getAll: async (): Promise<ExpenseItem[]> => {
    try {
      return await getAllForLookup();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : API_ERRORS.SAVE_FAILED;
      throw new Error(message);
    }
  },

  create: async (payload: CreateExpenseItemPayload): Promise<ExpenseItem> => {
    try {
      const { data } = await axiosClient.post(
        API_ROUTES.EXPENSE_ITEMS,
        payload,
      );
      const created = normalize(data.item);
      invalidate();
      void getAllForLookup().catch(() => {});
      return created;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  update: async (
    id: string,
    payload: UpdateExpenseItemPayload,
  ): Promise<ExpenseItem> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.EXPENSE_ITEMS}/${id}`,
        payload,
      );
      const updated = normalize(data.item);
      invalidate();
      void getAllForLookup().catch(() => {});
      return updated;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_ROUTES.EXPENSE_ITEMS}/${id}`);
      invalidate();
      void getAllForLookup().catch(() => {});
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, API_ERRORS.SAVE_FAILED));
    }
  },

  getAllForLookup,
  subscribeToLookup,
};

export default expenseItemService;
export { getAllForLookup, subscribeToLookup };
