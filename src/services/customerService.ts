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

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
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

const customerService = {
  getPage: async (params: {
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<CustomerListResponse> => {
    try {
      const normalizedSearch = params.search?.trim();
      const { data } = await axiosClient.get(API_ROUTES.CUSTOMERS, {
        params: {
          page: params.page,
          pageSize: params.pageSize,
          ...(normalizedSearch ? { search: normalizedSearch } : {}),
        },
      });

      const customers = Array.isArray(data.customers)
        ? data.customers
        : Array.isArray(data.data)
          ? data.data
          : [];

      const items = customers.map(normalizeCustomer);

      return {
        items,
        total: Number(data.total || items.length || 0),
        page: Number(data.page || params.page || 1),
        pageSize: Number(data.pageSize || params.pageSize || items.length || 1),
      };
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

  getAll: async (search?: string): Promise<Customer[]> => {
    try {
      const normalizedSearch = search?.trim();
      const { data } = await axiosClient.get(API_ROUTES.CUSTOMERS, {
        params: normalizedSearch ? { search: normalizedSearch } : undefined,
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
      return normalizeCustomer(data.customer);
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
      return normalizeCustomer(data.customer);
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
};

export default customerService;
