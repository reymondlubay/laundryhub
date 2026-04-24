import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export interface Customer {
  id: string;
  name: string;
  address?: string;
  mobileNumber?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerPayload {
  name: string;
  address?: string;
  mobileNumber?: string;
  notes?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  address?: string;
  mobileNumber?: string;
  notes?: string;
}

const normalizeCustomer = (raw: unknown): Customer => {
  const item = raw as Record<string, unknown>;

  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    address: String(item.address ?? ""),
    mobileNumber: String(item.mobileNumber ?? item.mobilenumber ?? ""),
    notes: String(item.notes ?? ""),
    createdAt: String(item.createdAt ?? item.createdat ?? ""),
    updatedAt: String(item.updatedAt ?? item.updatedat ?? ""),
  };
};

type LookupListener = (customers: Customer[]) => void;
const customerLookupListeners = new Set<LookupListener>();

let lookupLoadGen = 0;
let lookupListCache: Customer[] | null = null;
let lookupInFlight: Promise<Customer[]> | null = null;

const notifyCustomerLookup = () => {
  if (!lookupListCache) return;
  const snapshot = [...lookupListCache];
  customerLookupListeners.forEach((l) => l(snapshot));
};

const invalidateCustomerLookup = () => {
  lookupLoadGen += 1;
  lookupListCache = null;
};

/** Full customer list (no `search` param). Feeds the lookup cache. */
const fetchUnfilteredListFromApi = async (): Promise<Customer[]> => {
  const { data } = await axiosClient.get(API_ROUTES.CUSTOMERS);
  const customers = Array.isArray(data.customers)
    ? data.customers
    : Array.isArray(data.data)
      ? data.data
      : [];
  return customers.map(normalizeCustomer);
};

/**
 * Unfiltered list for autocomplete, dropdowns, and any `getAll()` call without a search.
 * Reuses a session cache, coalesces concurrent fetches, and refetches when the customer
 * table changes (create/update/delete).
 */
const getAllForLookup = async (): Promise<Customer[]> => {
  if (lookupListCache) return lookupListCache;
  if (lookupInFlight) return lookupInFlight;

  const gen = lookupLoadGen;
  lookupInFlight = (async () => {
    try {
      const list = await fetchUnfilteredListFromApi();
      if (gen === lookupLoadGen) {
        lookupListCache = list;
        notifyCustomerLookup();
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
              ?.data?.message || API_ERRORS.FETCH_CUSTOMERS_FAILED
          : error instanceof Error
            ? error.message
            : API_ERRORS.FETCH_CUSTOMERS_FAILED;
      throw new Error(message);
    } finally {
      lookupInFlight = null;
    }
  })();

  return lookupInFlight;
};

/**
 * Receives updates whenever the unfiltered list cache is refreshed. Calls back immediately
 * with the current list if cached. Unsubscribe in useEffect cleanup.
 */
const subscribeToCustomerLookup = (listener: LookupListener) => {
  customerLookupListeners.add(listener);
  if (lookupListCache) listener([...lookupListCache]);
  else void getAllForLookup().catch(() => {
    /* listener not notified; UX still allows typing */
  });
  return () => {
    customerLookupListeners.delete(listener);
  };
};

const customerService = {
  getAll: async (search?: string): Promise<Customer[]> => {
    const normalizedSearch = search?.trim();
    if (!normalizedSearch) {
      return getAllForLookup();
    }

    try {
      const { data } = await axiosClient.get(API_ROUTES.CUSTOMERS, {
        params: { search: normalizedSearch },
      });
      const customers = Array.isArray(data.customers)
        ? data.customers
        : Array.isArray(data.data)
          ? data.data
          : [];
      return customers.map(normalizeCustomer);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.FETCH_CUSTOMERS_FAILED
          : error instanceof Error
            ? error.message
            : API_ERRORS.FETCH_CUSTOMERS_FAILED;

      throw new Error(message);
    }
  },

  create: async (payload: CreateCustomerPayload): Promise<Customer> => {
    try {
      const { data } = await axiosClient.post(API_ROUTES.CUSTOMERS, payload);
      const created = normalizeCustomer(data.customer);
      invalidateCustomerLookup();
      void getAllForLookup().catch(() => {
        /* cache refresh best-effort */
      });
      return created;
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.CREATE_CUSTOMER_FAILED
          : API_ERRORS.CREATE_CUSTOMER_FAILED;

      throw new Error(message);
    }
  },

  update: async (
    id: string,
    payload: UpdateCustomerPayload,
  ): Promise<Customer> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.CUSTOMERS}/${id}`,
        payload,
      );
      const updated = normalizeCustomer(data.customer);
      invalidateCustomerLookup();
      void getAllForLookup().catch(() => {
        /* cache refresh best-effort */
      });
      return updated;
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.UPDATE_CUSTOMER_FAILED
          : API_ERRORS.UPDATE_CUSTOMER_FAILED;

      throw new Error(message);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_ROUTES.CUSTOMERS}/${id}`);
      invalidateCustomerLookup();
      void getAllForLookup().catch(() => {
        /* cache refresh best-effort */
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.DELETE_CUSTOMER_FAILED
          : API_ERRORS.DELETE_CUSTOMER_FAILED;

      throw new Error(message);
    }
  },

  getAllForLookup,
  subscribeToCustomerLookup,
};

export default customerService;
export { getAllForLookup, subscribeToCustomerLookup };
