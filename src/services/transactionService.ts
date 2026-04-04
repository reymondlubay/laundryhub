import axiosClient from "./axiosClient";

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
  datePickup?: string;
  whitePrice?: number;
  fabconQty?: number;
  detergentQty?: number;
  colorSafeQty?: number;
  isDelivered: boolean;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  loadDetails: LoadDetail[];
  paymentDetails: PaymentDetail[];
}

export interface CreateTransactionRequest {
  customerId: string;
  dateReceived: string;
  isDelivered?: boolean;
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
  isDelivered?: boolean;
  dateLoaded?: string;
  datePickup?: string;
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
  }): Promise<Transaction[]> => {
    try {
      const response = await axiosClient.get("/transactions", { params });
      const { data } = response;

      if (!data || response.status === 204) {
        return [];
      }

      return data.data || data.transactions || [];
    } catch (error: any) {
      if (error?.response?.status === 204) {
        return [];
      }
      throw new Error(
        error?.response?.data?.message || "Failed to fetch transactions",
      );
    }
  },

  // Get transaction by ID
  getById: async (id: string): Promise<Transaction> => {
    try {
      const { data } = await axiosClient.get(`/transactions/${id}`);
      return data.data || data.transaction;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to fetch transaction",
      );
    }
  },

  // Create transaction
  create: async (
    transaction: CreateTransactionRequest,
  ): Promise<Transaction> => {
    try {
      const { data } = await axiosClient.post("/transactions", transaction);
      return data.data || data.transaction;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to create transaction",
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
        `/transactions/${id}`,
        transaction,
      );
      return data.data || data.transaction;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to update transaction",
      );
    }
  },

  // Delete transaction
  delete: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`/transactions/${id}`);
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to delete transaction",
      );
    }
  },
};

export default transactionService;
