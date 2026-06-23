import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";
import { toBackendPaymentMode } from "../constants/payment";
import { normalizeTransactionRow } from "../utils/normalizeTransaction";

export interface LoadDetail {
  id: string;
  transactionId: string;
  type: string;
  kg: number;
  loads: number;
  price: number;
  nickname?: string;
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

export interface TransactionPickup {
  id: string;
  transactionId: string;
  pickupDate: string;
  loadsCount: number;
  releasedBy?: string;
  releasedByUser?: {
    id: string;
    userName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  datePickupModifiedAt?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    mobileNumber: string;
    address?: string;
  };
  receivedByUser?: {
    id: string;
    userName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
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
  datePickupModifiedAt?: string;
  whitePrice?: number;
  fabconQty?: number;
  detergentQty?: number;
  colorSafeQty?: number;
  discount?: number;
  loadSubtotal?: number;
  addonsSubtotal?: number;
  grandTotal?: number;
  fabconUnitPrice?: number;
  detergentUnitPrice?: number;
  colorSafeUnitPrice?: number;
  isDelivered: boolean;
  receivedBy?: string;
  releasedBy?: string;
  notes?: string;
  isDeleted: boolean;
  deleteReason?: string;
  deletedDate?: string;
  createdAt: string;
  updatedAt: string;
  loadDetails: LoadDetail[];
  paymentDetails: PaymentDetail[];
  pickupDetails?: TransactionPickup[];
}

export interface CreateTransactionRequest {
  customerId: string;
  dateReceived: string;
  dateLoaded?: string | null;
  estimatedPickup?: string | null;
  datePickup?: string | null;
  isDelivered?: boolean;
  whitePrice?: number;
  fabconQty?: number;
  detergentQty?: number;
  colorSafeQty?: number;
  discount?: number;
  receivedBy: string;
  releasedBy?: string | null;
  notes?: string;
  loadDetails: Array<{
    type: string;
    kg: number;
    loads: number;
    price: number;
    nickname?: string;
  }>;
  paymentDetails?: Array<{
    paymentDate: string;
    amount: number;
    mode: string;
    createdAt?: string;
  }>;
}

type ApiWriteBody = {
  transaction?: Partial<Transaction>;
  loadDetails?: unknown;
  paymentDetails?: unknown;
};

function unwrapWriteBody(raw: unknown): ApiWriteBody {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const inner = obj.data;
  if (
    inner &&
    typeof inner === "object" &&
    "transaction" in (inner as object)
  ) {
    return inner as ApiWriteBody;
  }
  return obj as ApiWriteBody;
}

function pickField(
  row: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
}

function serializeApiDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}

function normalizeLoadDetailRow(row: Record<string, unknown>): LoadDetail {
  return {
    id: String(pickField(row, "id") ?? ""),
    transactionId: String(
      pickField(row, "transactionId", "transactionid") ?? "",
    ),
    type: String(pickField(row, "type") ?? "Clothes"),
    kg: Number(pickField(row, "kg") ?? 0),
    loads: Number(pickField(row, "loads") ?? 0),
    price: Number(pickField(row, "price") ?? 0),
    nickname:
      pickField(row, "nickname") != null
        ? String(pickField(row, "nickname"))
        : "",
    createdAt: serializeApiDate(pickField(row, "createdAt", "createdat")),
    updatedAt: serializeApiDate(pickField(row, "updatedAt", "updatedat")),
  };
}

function normalizePaymentDetailRow(
  row: Record<string, unknown>,
): PaymentDetail {
  const rawMode = pickField(row, "mode");
  return {
    id: String(pickField(row, "id") ?? ""),
    transactionId: String(
      pickField(row, "transactionId", "transactionid") ?? "",
    ),
    paymentDate: serializeApiDate(
      pickField(row, "paymentDate", "paymentdate"),
    ),
    amount: Number(pickField(row, "amount") ?? 0),
    mode: toBackendPaymentMode(rawMode == null ? undefined : String(rawMode)),
    createdAt: serializeApiDate(pickField(row, "createdAt", "createdat")),
    updatedAt: serializeApiDate(pickField(row, "updatedAt", "updatedat")),
  };
}

function mapLoadDetails(
  raw: unknown,
  prev: Transaction | undefined,
): LoadDetail[] {
  if (raw === undefined) return prev?.loadDetails ?? [];
  if (!Array.isArray(raw)) return prev?.loadDetails ?? [];
  return raw.map((item) =>
    normalizeLoadDetailRow(item as Record<string, unknown>),
  );
}

function mapPaymentDetails(
  raw: unknown,
  prev: Transaction | undefined,
): PaymentDetail[] {
  if (raw === undefined) return prev?.paymentDetails ?? [];
  if (!Array.isArray(raw)) return prev?.paymentDetails ?? [];
  return raw.map((item) =>
    normalizePaymentDetailRow(item as Record<string, unknown>),
  );
}

function normalizePickupDetailRow(
  row: Record<string, unknown>,
): TransactionPickup {
  const releasedByUserRaw = pickField(row, "releasedByUser", "releasedbyuser");
  const releasedByUser =
    releasedByUserRaw && typeof releasedByUserRaw === "object"
      ? {
          id: String(
            pickField(releasedByUserRaw as Record<string, unknown>, "id") ?? "",
          ),
          userName: String(
            pickField(
              releasedByUserRaw as Record<string, unknown>,
              "userName",
              "username",
            ) ?? "",
          ),
          firstName: String(
            pickField(
              releasedByUserRaw as Record<string, unknown>,
              "firstName",
              "firstname",
            ) ?? "",
          ),
          lastName: String(
            pickField(
              releasedByUserRaw as Record<string, unknown>,
              "lastName",
              "lastname",
            ) ?? "",
          ),
        }
      : null;

  return {
    id: String(pickField(row, "id") ?? ""),
    transactionId: String(
      pickField(row, "transactionId", "transactionid") ?? "",
    ),
    pickupDate: serializeApiDate(pickField(row, "pickupDate", "pickupdate")),
    loadsCount: Number(pickField(row, "loadsCount", "loadscount") ?? 0),
    releasedBy:
      pickField(row, "releasedBy", "releasedby") != null
        ? String(pickField(row, "releasedBy", "releasedby"))
        : undefined,
    releasedByUser,
    datePickupModifiedAt:
      pickField(row, "datePickupModifiedAt", "datepickupmodifiedat") != null
        ? serializeApiDate(
            pickField(row, "datePickupModifiedAt", "datepickupmodifiedat"),
          )
        : undefined,
    createdAt: serializeApiDate(pickField(row, "createdAt", "createdat")),
  };
}

function mapPickupDetails(
  raw: unknown,
  prev: Transaction | undefined,
): TransactionPickup[] {
  if (raw === undefined) return prev?.pickupDetails ?? [];
  if (!Array.isArray(raw)) return prev?.pickupDetails ?? [];
  return raw.map((item) =>
    normalizePickupDetailRow(item as Record<string, unknown>),
  );
}

/**
 * Build a list-shaped Transaction from POST/PUT responses that return
 * { transaction, loadDetails, paymentDetails } separately.
 * Normalizes PostgreSQL snake_case rows to the camelCase shape used by the grid and modals.
 */
export function mergeServerWritePayload(
  rawBody: unknown,
  prev?: Transaction,
): Transaction {
  const body = unwrapWriteBody(rawBody);
  const txRow = (body.transaction ?? body) as Partial<Transaction> &
    Record<string, unknown>;
  const loadDetails = mapLoadDetails(
    body.loadDetails ?? txRow.loadDetails,
    prev,
  );
  const paymentDetails = mapPaymentDetails(
    body.paymentDetails ?? txRow.paymentDetails,
    prev,
  );
  const pickupDetails = mapPickupDetails(
    txRow.pickupDetails ?? (body as Record<string, unknown>).pickupDetails,
    prev,
  );

  const normalized = normalizeTransactionRow(txRow);

  return {
    ...normalized,
    loadDetails,
    paymentDetails,
    pickupDetails,
    customer: normalized.customer ?? prev?.customer,
    receivedByUser:
      normalized.receivedByUser !== undefined
        ? normalized.receivedByUser
        : prev?.receivedByUser,
    releasedByUser:
      normalized.releasedByUser !== undefined
        ? normalized.releasedByUser
        : prev?.releasedByUser,
  };
}

export interface UpdateTransactionRequest {
  customerId?: string;
  dateReceived?: string;
  isDelivered?: boolean;
  dateLoaded?: string | null;
  estimatedPickup?: string | null;
  datePickup?: string | null;
  whitePrice?: number;
  fabconQty?: number;
  detergentQty?: number;
  colorSafeQty?: number;
  discount?: number;
  receivedBy?: string;
  releasedBy?: string | null;
  notes?: string;
  loadDetails?: Array<{
    type: string;
    kg: number;
    loads: number;
    price: number;
    nickname?: string;
  }>;
  paymentDetails?: Array<{
    paymentDate: string;
    amount: number;
    mode: string;
    createdAt?: string;
  }>;
  replacePaymentDetails?: boolean;
  pickupLoads?: number;
}

const transactionService = {
  // Get all transactions, optionally filtered
  getAll: async (params?: {
    customer?: string;
    customerId?: string;
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

      const rows = data.data || data.transactions || [];
      return Array.isArray(rows)
        ? rows.map((row: Transaction) => {
            const normalized = normalizeTransactionRow(row);
            const raw = row as unknown as Record<string, unknown>;
            return {
              ...normalized,
              loadDetails: mapLoadDetails(raw.loadDetails, normalized),
              paymentDetails: mapPaymentDetails(raw.paymentDetails, normalized),
              pickupDetails: mapPickupDetails(raw.pickupDetails, normalized),
            };
          })
        : [];
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
      return mergeServerWritePayload(data, undefined);
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
      return mergeServerWritePayload(data, undefined);
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
    mergeSource?: Transaction,
  ): Promise<Transaction> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.TRANSACTIONS}/${id}`,
        transaction,
      );
      return mergeServerWritePayload(data, mergeSource);
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

  deletePickup: async (
    transactionId: string,
    pickupId: string,
    mergeSource?: Transaction,
  ): Promise<Transaction> => {
    try {
      const { data } = await axiosClient.delete(
        `${API_ROUTES.TRANSACTIONS}/${transactionId}/pickups/${pickupId}`,
      );
      return mergeServerWritePayload(data, mergeSource);
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

  getDeleted: async (): Promise<Transaction[]> => {
    try {
      const response = await axiosClient.get(API_ROUTES.TRANSACTIONS_DELETED);
      const { data } = response;
      const rows = data.data?.transactions || data.transactions || [];
      return Array.isArray(rows)
        ? rows.map((row: Transaction) => normalizeTransactionRow(row))
        : [];
    } catch (error: unknown) {
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

  restore: async (id: string): Promise<void> => {
    try {
      await axiosClient.patch(`${API_ROUTES.TRANSACTIONS}/${id}/restore`);
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

  permanentDelete: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_ROUTES.TRANSACTIONS}/${id}/permanent`);
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

  getArchiveCandidates: async (year: number): Promise<Transaction[]> => {
    try {
      const response = await axiosClient.get(
        API_ROUTES.TRANSACTIONS_ARCHIVE_CANDIDATES,
        { params: { year } },
      );
      const { data } = response;
      const rows = data.data?.transactions || data.transactions || [];
      return Array.isArray(rows)
        ? rows.map((row: Transaction) => normalizeTransactionRow(row))
        : [];
    } catch (error: unknown) {
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

  archiveByYear: async (
    year: number,
  ): Promise<{ archivedCount: number }> => {
    try {
      const { data } = await axiosClient.post(API_ROUTES.TRANSACTIONS_ARCHIVE, {
        year,
      });
      const payload = data.data || data;
      return {
        archivedCount: Number(payload.archivedCount ?? 0),
      };
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

  getArchived: async (
    year: number,
    customer?: string,
  ): Promise<Transaction[]> => {
    try {
      const response = await axiosClient.get(API_ROUTES.ARCHIVED_TRANSACTIONS, {
        params: {
          year,
          customer: customer?.trim() || undefined,
        },
      });
      const { data } = response;
      const rows = data.data?.transactions || data.transactions || [];
      return Array.isArray(rows)
        ? rows.map((row: Transaction) => normalizeTransactionRow(row))
        : [];
    } catch (error: unknown) {
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
};

export default transactionService;
