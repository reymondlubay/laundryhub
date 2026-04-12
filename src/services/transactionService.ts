import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export interface LoadDetail {
  id: string;
  transactionId: string;
  type: string;
  kg: number;
  loads: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDetail {
  id: string;
  transactionId: string;
  paymentDate: string;
  amount: number;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    mobileNumber: string;
  };
  releasedByUser?: {
    id: string;
    userName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  dateReceived: string;
  dateLoaded?: string;
  estimatedPickup?: string;
  datePickup?: string;
  whitePrice?: number;
  fabconQty?: number;
  detergentQty?: number;
  colorSafeQty?: number;
  loadSubtotal?: number;
  addonsSubtotal?: number;
  grandTotal?: number;
  isDelivered: boolean;
  notes?: string;
  isDeleted: boolean;
  deleteReason?: string;
  createdAt: string;
  updatedAt: string;
  loadDetails: LoadDetail[];
  paymentDetails: PaymentDetail[];
}

export interface CreateTransactionRequest {
  customerId: string;
  dateReceived: string;
  dateLoaded?: string;
  estimatedPickup?: string;
  datePickup?: string;
  isDelivered?: boolean;
  whitePrice?: number;
  fabconQty?: number;
  detergentQty?: number;
  colorSafeQty?: number;
  releasedBy?: string;
  notes?: string;
  loadDetails: Array<{
    type: string;
    kg: number;
    loads: number;
    price: number;
  }>;
  paymentDetails?: Array<{
    paymentDate: string;
    amount: number;
    mode: string;
  }>;
}

export interface UpdateTransactionRequest {
  customerId?: string;
  dateReceived?: string;
  isDelivered?: boolean;
  dateLoaded?: string;
  estimatedPickup?: string;
  datePickup?: string;
  whitePrice?: number;
  fabconQty?: number;
  detergentQty?: number;
  colorSafeQty?: number;
  releasedBy?: string;
  notes?: string;
  loadDetails?: Array<{
    type: string;
    kg: number;
    loads: number;
    price: number;
  }>;
  paymentDetails?: Array<{
    paymentDate: string;
    amount: number;
    mode: string;
  }>;
}

const transactionService = {
  // Get all transactions, optionally filtered
  getAll: async (params?: {
    customer?: string;
    fromDate?: string;
    toDate?: string;
    date?: string;
    includeDeleted?: boolean;
  }): Promise<Transaction[]> => {
    try {
      const response = await axiosClient.get(API_ROUTES.TRANSACTIONS, {
        params,
      });
      const { data } = response;

      if (!data || response.status === 204) {
        return [];
      }

      return data.data || data.transactions || [];
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { status?: number } }).response?.status === 204
      ) {
        return [];
      }
      throw new Error(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.FETCH_TRANSACTIONS_FAILED
          : API_ERRORS.FETCH_TRANSACTIONS_FAILED,
      );
    }
  },

  // Get transaction by ID
  getById: async (id: string): Promise<Transaction> => {
    try {
      const { data } = await axiosClient.get(
        `${API_ROUTES.TRANSACTIONS}/${id}`,
      );
      return data.data || data.transaction;
    } catch (error: unknown) {
      throw new Error(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.FETCH_TRANSACTION_FAILED
          : API_ERRORS.FETCH_TRANSACTION_FAILED,
      );
    }
  },

  // Create transaction
  create: async (
    transaction: CreateTransactionRequest,
  ): Promise<Transaction> => {
    try {
      const { data } = await axiosClient.post(
        API_ROUTES.TRANSACTIONS,
        transaction,
      );
      return data.data || data.transaction;
    } catch (error: unknown) {
      throw new Error(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.CREATE_TRANSACTION_FAILED
          : API_ERRORS.CREATE_TRANSACTION_FAILED,
      );
    }
  },

  // Update transaction
  update: async (
    id: string,
    transaction: UpdateTransactionRequest,
  ): Promise<Transaction> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.TRANSACTIONS}/${id}`,
        transaction,
      );
      return data.data || data.transaction;
    } catch (error: unknown) {
      throw new Error(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.UPDATE_TRANSACTION_FAILED
          : API_ERRORS.UPDATE_TRANSACTION_FAILED,
      );
    }
  },

  // Delete transaction
  delete: async (id: string, deleteReason?: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_ROUTES.TRANSACTIONS}/${id}`, {
        data: { deleteReason },
      });
    } catch (error: unknown) {
      throw new Error(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.DELETE_TRANSACTION_FAILED
          : API_ERRORS.DELETE_TRANSACTION_FAILED,
      );
    }
  },
};

export default transactionService;
