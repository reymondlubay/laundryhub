import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  Tooltip,
  Stack,
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import HistoryIcon from "@mui/icons-material/History";
import PaymentsIcon from "@mui/icons-material/Payments";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import { toApiDateTimeString } from "../../../utils/dateTimeApi";

import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, colorSchemeLightWarm } from "ag-grid-community";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { toPascalCase } from "../../../utils/stringUtils";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";

import { useThemeContext } from "../../../components/ThemeContext/ThemeContext";
import transactionService from "../../../services/transactionService";
import type { Transaction } from "../../../services/transactionService";
import type { Payment } from "../../../services/apiTypes";
import { PaymentModal } from "../../../components/Payment/PaymentModal";
import userService, { type UserItem } from "../../../services/userService";
import authService from "../../../services/authService";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../../services/addonsPricingService";
import { EMPTY_STATES, UI_TEXT } from "../../../constants/messages";
import { USER_ROLE_EMPLOYEE } from "../../../constants/roles";
import { toBackendPaymentMode } from "../../../constants/payment";
import TransactionDeleteDialog, {
  type DeleteReason,
} from "../../../components/TransactionDeleteDialog/TransactionDeleteDialog";
import { getAddonsTotal, getStoredSnapshots } from "../../../utils/pricing";
import "./TransactionTable.css";

ModuleRegistry.registerModules([AllCommunityModule]);

type EmployeeOption = { id: string; name: string };

interface FlatTransactionRow {
  id: string;
  transactionId: string;
  isFirstRow: boolean;
  isLastRow: boolean;
  hasDateLoaded: boolean;
  hasDatePickup: boolean;
  hasEstimatedPickup: boolean;
  dateReceived: string | null;
  dateLoaded: string | null;
  estimatedPickup: string | null;
  customer: string;
  loadType: string;
  kg: number;
  loads: number;
  price: number | null;
  totalPaid: number | null;
  balance: number | null;
  paymentHistory: string[];
  datePaid: string | null;
  datePickup: string | null;
  notes: string;
  whitePrice: number;
  fabconQty: number;
  detergentQty: number;
  colorSafeQty: number;
  isDelivered: boolean;
  releasedBy: string;
  action: string;
  /** One entry per load line; used to stack Customer / KG / Load in a single grid row. */
  loadLines: Array<{ loadType: string; kg: number; loads: number }>;
}

/** Shared layout so Customer, KG, and Load rows line up for multi-load cells. */
const TX_MULTI_LOAD_STACK_SX = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 1.5,
  justifyContent: "center",
  width: "100%",
};

/** Compact action icons: smaller hit target and glyph size for a narrow pinned column. */
const TX_ACTION_ICON_BUTTON_SX = {
  p: 0.35,
  minWidth: 30,
  width: 30,
  height: 30,
  "& .MuiSvgIcon-root": { fontSize: 20 },
} as const;

const TX_CUSTOMER_TEXT_WRAP_SX = {
  overflowWrap: "anywhere" as const,
  wordBreak: "break-word" as const,
  whiteSpace: "normal" as const,
  maxWidth: "100%",
};

/** One load block in Customer column: name, then load type on next line. */
const txMultiLoadCustomerLineSx = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
  justifyContent: "center",
  minHeight: 0,
  lineHeight: 1.25,
  gap: 0.15,
  ...TX_CUSTOMER_TEXT_WRAP_SX,
};

/** One load line in KG / Load columns (single value, aligns with customer block). */
const txMultiLoadMetricLineSx = {
  display: "flex",
  alignItems: "center",
  minHeight: 40,
  lineHeight: 1.3,
};

/** ~chars per line in the customer text area (column minus icons). Used for row height. */
const CUSTOMER_WRAP_CHARS = 18;

function countWrappedLines(text: string, charsPerLine: number): number {
  const t = text || "";
  if (t.length === 0) return 0;
  return Math.max(1, Math.ceil(t.length / charsPerLine));
}

function estimateCustomerContentLines(data: FlatTransactionRow): number {
  const name = data.customer || "";
  const loads = data.loadLines;
  if (loads && loads.length > 1) {
    let sum = 0;
    for (const line of loads) {
      sum +=
        countWrappedLines(name, CUSTOMER_WRAP_CHARS) +
        countWrappedLines(`(${line.loadType})`, CUSTOMER_WRAP_CHARS);
    }
    return Math.max(sum, loads.length * 2);
  }
  const typePart = data.loadType ? `(${data.loadType})` : "";
  return (
    countWrappedLines(name, CUSTOMER_WRAP_CHARS) +
    (typePart ? countWrappedLines(typePart, CUSTOMER_WRAP_CHARS) : 0)
  );
}

const STATUS_CELL_STYLES = {
  loaded: {
    backgroundColor: "#d8f0d2",
    color: "#111111",
  },
  picked: {
    backgroundColor: "#ffe7b3",
    color: "#111111",
  },
} as const;

const getStatusCellStyle = (row?: FlatTransactionRow) => {
  if (!row) return undefined;
  if (row.hasDatePickup) return STATUS_CELL_STYLES.picked;
  if (row.hasDateLoaded) return STATUS_CELL_STYLES.loaded;
  return undefined;
};

const formatAmount = (amount: number): string => {
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
};

const getTransactionTotals = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): { totalPrice: number; totalPaid: number; balance: number } => {
  const loadDetails = transaction.loadDetails || [];
  const loadTotal = loadDetails.reduce(
    (sum: number, load: { price?: number | string | null }) =>
      sum + Number(load.price || 0),
    0,
  );

  const payments = transaction.paymentDetails || [];
  const totalPaid = payments.reduce(
    (sum: number, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const tx2 = transaction as Transaction & {
    whiteprice?: number;
    fabconqty?: number;
    detergentqty?: number;
    colorsafeqty?: number;
    grandtotal?: number;
  };

  const whitePrice = Number(transaction.whitePrice ?? tx2.whiteprice ?? 0);
  const fabconQty = Number(transaction.fabconQty ?? tx2.fabconqty ?? 0);
  const detergentQty = Number(
    transaction.detergentQty ?? tx2.detergentqty ?? 0,
  );
  const colorSafeQty = Number(
    transaction.colorSafeQty ?? tx2.colorsafeqty ?? 0,
  );

  const stored = getStoredSnapshots({
    grandTotal: transaction.grandTotal,
    grandtotal: tx2.grandtotal,
  });

  const addonsTotal = getAddonsTotal(
    { whitePrice, fabconQty, detergentQty, colorSafeQty },
    addonsPricing,
  );

  const totalPrice = stored.hasGrandTotal
    ? stored.grandTotal
    : loadTotal + addonsTotal;

  const balance = Math.max(totalPrice - totalPaid, 0);

  return { totalPrice, totalPaid, balance };
};

/** Disable "Mark as paid" when balance is settled, or when total is ₱0 but payments exist (overpayment). */
const isAddPaymentDisabled = (row?: FlatTransactionRow): boolean => {
  if (!row) return false;
  const totalPrice = Number(row.price || 0);
  const totalPaid = Number(row.totalPaid || 0);
  if (totalPrice > 0 && totalPaid >= totalPrice) return true;
  if (totalPrice <= 0 && totalPaid > 0) return true;
  return false;
};

const getNoteDetails = (row?: FlatTransactionRow): string[] => {
  if (!row) return [];
  const noteText = row.notes && row.notes !== "-" ? String(row.notes) : "";
  const details: string[] = [];

  if (row.isDelivered) details.push("Delivery");
  if (row.whitePrice > 0)
    details.push(`Add White +${formatAmount(row.whitePrice)}`);
  if (row.fabconQty > 0) details.push(`Fabcon x${row.fabconQty}`);
  if (row.detergentQty > 0) details.push(`Detergent x${row.detergentQty}`);
  if (row.colorSafeQty > 0) details.push(`Color Safe x${row.colorSafeQty}`);
  if (noteText) details.push(`Notes ${noteText}`);

  return details;
};

/**
 * One grid row per transaction. Multiple load details are stacked in Customer / KG / Load cells.
 */
function flattenTransactionRows(
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): FlatTransactionRow[] {
  const tx = transaction as Transaction & {
    datereceived?: string;
    dateloaded?: string;
    estimatedpickup?: string;
    isdelivered?: boolean;
    datepickup?: string;
  };

  const isDelivered = Boolean(transaction.isDelivered ?? tx.isdelivered);

  const transactionId = transaction.id;
  const dateReceived = tx.dateReceived || tx.datereceived || null;
  const dateLoaded = tx.dateLoaded || tx.dateloaded || null;
  const estimatedPickup = tx.estimatedPickup || tx.estimatedpickup || null;
  const datePickup = tx.datePickup || tx.datepickup || null;
  const hasDateLoaded = Boolean(dateLoaded);
  const hasEstimatedPickup = Boolean(estimatedPickup);
  const hasDatePickup = Boolean(datePickup);
  const customerName = toPascalCase(transaction.customer?.name || "Unknown");

  const loadDetails = transaction.loadDetails || [];
  const totalKg = loadDetails.reduce(
    (sum: number, load: { kg?: number | string | null }) =>
      sum + Number(load.kg || 0),
    0,
  );
  const totalLoads = loadDetails.reduce(
    (sum: number, load: { loads?: number | string | null }) =>
      sum + Number(load.loads || 0),
    0,
  );
  const loadTotal = loadDetails.reduce(
    (sum: number, load: { price?: number | string | null }) =>
      sum + Number(load.price || 0),
    0,
  );

  // Get latest payment date if payments exist
  const payments = transaction.paymentDetails || [];
  const totalPaid = payments.reduce(
    (sum: number, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const tx2 = transaction as Transaction & {
    whiteprice?: number;
    fabconqty?: number;
    detergentqty?: number;
    colorsafeqty?: number;
    grandtotal?: number;
  };
  const whitePrice = Number(transaction.whitePrice ?? tx2.whiteprice ?? 0);
  const fabconQty = Number(transaction.fabconQty ?? tx2.fabconqty ?? 0);
  const detergentQty = Number(
    transaction.detergentQty ?? tx2.detergentqty ?? 0,
  );
  const colorSafeQty = Number(
    transaction.colorSafeQty ?? tx2.colorsafeqty ?? 0,
  );

  const stored = getStoredSnapshots({
    grandTotal: transaction.grandTotal,
    grandtotal: tx2.grandtotal,
  });
  const addonsTotal = getAddonsTotal(
    {
      whitePrice,
      fabconQty,
      detergentQty,
      colorSafeQty,
    },
    addonsPricing,
  );
  const totalPrice = stored.hasGrandTotal
    ? stored.grandTotal
    : loadTotal + addonsTotal;
  const balance =
    payments.length > 0 && totalPaid < totalPrice ? totalPrice - totalPaid : 0;

  const datePaid =
    payments.length > 0 ? payments[payments.length - 1].paymentDate : null;
  const paymentHistory = payments.map((payment) => {
    const paidAt = dayjs(payment.paymentDate).format("MM-DD-YY h:mm A");
    return `${paidAt} - ${formatAmount(Number(payment.amount || 0))} ${payment.mode}`;
  });

  const releasedBy = transaction.releasedByUser
    ? [
        transaction.releasedByUser.firstName,
        transaction.releasedByUser.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      transaction.releasedByUser.userName ||
      "-"
    : "-";

  const loadLines =
    loadDetails.length === 0
      ? []
      : loadDetails.map((load) => ({
          loadType: load.type || "Load",
          kg: Number(load.kg || 0),
          loads: Number(load.loads || 0),
        }));

  if (loadDetails.length === 0) {
    return [
      {
        id: `${transactionId}-0`,
        transactionId,
        isFirstRow: true,
        isLastRow: true,
        hasDateLoaded,
        hasEstimatedPickup,
        hasDatePickup,
        dateReceived,
        dateLoaded,
        estimatedPickup,
        customer: customerName,
        loadType: "",
        kg: totalKg,
        loads: totalLoads,
        price: totalPrice,
        totalPaid,
        balance,
        paymentHistory,
        datePaid,
        datePickup,
        notes: transaction.notes || "-",
        whitePrice,
        fabconQty,
        detergentQty,
        colorSafeQty,
        isDelivered,
        releasedBy,
        action: "",
        loadLines,
      },
    ];
  }

  const first = loadLines[0]!;

  return [
    {
      id: `${transactionId}-0`,
      transactionId,
      isFirstRow: true,
      isLastRow: true,
      hasDateLoaded,
      hasEstimatedPickup,
      hasDatePickup,
      dateReceived,
      dateLoaded,
      estimatedPickup,
      customer: customerName,
      loadType: first.loadType,
      kg: first.kg,
      loads: first.loads,
      price: totalPrice,
      totalPaid,
      balance,
      paymentHistory,
      datePaid,
      datePickup,
      notes: transaction.notes || "-",
      whitePrice,
      fabconQty,
      detergentQty,
      colorSafeQty,
      isDelivered,
      releasedBy,
      action: "",
      loadLines,
    },
  ];
}

export type TransactionTableProps = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEditTransaction?: (transaction: Transaction) => void;
  /** Merge one row from API after mark / pay / inline edit (no full list refetch). */
  onTransactionSynced?: (transaction: Transaction) => void;
  onTransactionDeleted?: (transactionId: string) => void;
  onToast?: (payload: { severity: "success" | "error"; message: string }) => void;
  /** Increment after a new transaction is saved and list refetched — grid goes to page 1 / top. */
  jumpToFirstPageNonce?: number;
  /** Set after create/edit save so the row highlight animation runs (AG Grid may not pick up class changes otherwise). */
  flashRowRequest?: { transactionId: string; nonce: number } | null;
};

function TransactionTableInner({
  transactions,
  loading,
  error,
  onEditTransaction,
  onTransactionSynced,
  onTransactionDeleted,
  onToast,
  jumpToFirstPageNonce = 0,
  flashRowRequest = null,
}: TransactionTableProps) {
  const { darkMode } = useThemeContext();
  const [addonsPricing, setAddonsPricing] = useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(
    null,
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedTransactionForPayment, setSelectedTransactionForPayment] =
    useState<Transaction | null>(null);
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [markModalType, setMarkModalType] = useState<
    "loaded" | "pickup" | null
  >(null);
  const [selectedTransactionForMark, setSelectedTransactionForMark] =
    useState<Transaction | null>(null);
  const [markDateTime, setMarkDateTime] = useState<Dayjs | null>(dayjs());
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [releaseBy, setReleaseBy] = useState<string>("");
  const releaseByInputRef = useRef<HTMLInputElement | null>(null);
  const gridApiRef = useRef<any>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const [highlightTransactionId, setHighlightTransactionId] = useState<
    string | null
  >(null);

  const flashTransactionHighlight = useCallback((transactionId: string) => {
    setHighlightTransactionId(transactionId);
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightTransactionId(null);
      highlightTimerRef.current = null;
    }, 5200);
  }, []);

  const lastJumpNonceRef = useRef(0);
  React.useEffect(() => {
    const n = jumpToFirstPageNonce ?? 0;
    if (n <= 0 || n === lastJumpNonceRef.current) return;
    lastJumpNonceRef.current = n;

    const scrollToTop = () => {
      const api = gridApiRef.current;
      if (!api) return;
      try {
        if (typeof api.paginationGoToPage === "function") {
          api.paginationGoToPage(0);
        }
        if (typeof api.ensureIndexVisible === "function") {
          api.ensureIndexVisible(0, "top");
        }
        api.refreshCells?.({ force: true });
      } catch {
        // ignore
      }
    };

    scrollToTop();
    const raf = window.requestAnimationFrame(() => scrollToTop());
    const tmo = window.setTimeout(scrollToTop, 80);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(tmo);
    };
  }, [jumpToFirstPageNonce]);

  const lastFlashNonceRef = useRef(0);
  React.useEffect(() => {
    if (!flashRowRequest?.transactionId) return;
    if (flashRowRequest.nonce === lastFlashNonceRef.current) return;
    lastFlashNonceRef.current = flashRowRequest.nonce;

    flashTransactionHighlight(flashRowRequest.transactionId);
    queueMicrotask(() => {
      try {
        const api = gridApiRef.current;
        api?.refreshCells?.({ force: true });
        api?.redrawRows?.();
      } catch {
        // ignore
      }
    });
  }, [flashRowRequest, flashTransactionHighlight]);

  const handleDeleteTransactionClick = useCallback((transactionId: string) => {
    setDeleteError(null);
    setDeleteTransactionId(transactionId);
  }, []);

  const handleDeleteTransactionConfirm = useCallback(
    async (deleteReason: DeleteReason) => {
      if (!deleteTransactionId) return;

      try {
        await transactionService.delete(deleteTransactionId, deleteReason);
        setDeleteTransactionId(null);
        onTransactionDeleted?.(deleteTransactionId);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete transaction";
        setDeleteError(message);
      }
    },
    [deleteTransactionId, onTransactionDeleted],
  );

  const handleOpenPaymentModal = useCallback((transaction: Transaction) => {
    setSelectedTransactionForPayment(transaction);
    setPaymentModalOpen(true);
  }, []);

  const handleClosePaymentModal = useCallback(() => {
    setSelectedTransactionForPayment(null);
    setPaymentModalOpen(false);
    setActionError(null);
  }, []);

  const handleSavePayment = useCallback(
    async (payment: Omit<Payment, "id">) => {
      if (!selectedTransactionForPayment) return;
      setActionLoading(true);
      setActionError(null);

      try {
        const existingPayments =
          selectedTransactionForPayment.paymentDetails || [];
        const updatedPaymentDetails = [...existingPayments, payment].map(
          (paymentItem) => {
            const p = paymentItem as {
              paymentDate: string | Date;
              amount: number;
              mode: string;
              createdAt?: string;
            };
            const row: {
              paymentDate: string;
              amount: number;
              mode: string;
              createdAt?: string;
            } = {
              paymentDate:
                toApiDateTimeString(
                  p.paymentDate instanceof Date
                    ? dayjs(p.paymentDate)
                    : dayjs(p.paymentDate),
                ) ?? String(p.paymentDate),
              amount: Number(p.amount),
              mode: toBackendPaymentMode(
                p.mode == null ? undefined : String(p.mode),
              ),
            };
            if (p.createdAt) {
              row.createdAt = p.createdAt;
            }
            return row;
          },
        );

        // Only send paymentDetails, no loadDetails since we're just updating payments
        const updated = await transactionService.update(
          selectedTransactionForPayment.id,
          {
            paymentDetails: updatedPaymentDetails,
          },
          selectedTransactionForPayment,
        );

        onTransactionSynced?.(updated);
        flashTransactionHighlight(updated.id);
        onToast?.({
          severity: "success",
          message:
          `${toPascalCase(
            selectedTransactionForPayment.customer?.name || "Customer",
          )} payment of ₱${Number(payment.amount || 0).toFixed(2)} has been saved.`,
        });
        handleClosePaymentModal();
      } catch (err: unknown) {
        setActionError(
          err instanceof Error ? err.message : "Failed to save payment",
        );
      } finally {
        setActionLoading(false);
      }
    },
    [
      flashTransactionHighlight,
      handleClosePaymentModal,
      onToast,
      onTransactionSynced,
      selectedTransactionForPayment,
    ],
  );

  const handleOpenMarkModal = useCallback(
    (transaction: Transaction, type: "loaded" | "pickup") => {
      setSelectedTransactionForMark(transaction);
      setMarkModalType(type);
      setMarkDateTime(dayjs());
      setActionError(null);
      setReleaseBy("");
      setMarkModalOpen(true);
    },
    [],
  );

  const handleCloseMarkModal = useCallback(() => {
    setSelectedTransactionForMark(null);
    setMarkModalType(null);
    setMarkModalOpen(false);
    setActionError(null);
    setReleaseBy("");
  }, []);

  React.useEffect(() => {
    const loadEmployees = async () => {
      try {
        const users = await userService.getAll();
        const employeeUsers = users
          .filter((user) => user.role === USER_ROLE_EMPLOYEE)
          .map((user: UserItem) => ({
            id: user.id,
            name:
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.userName ||
              USER_ROLE_EMPLOYEE,
          }));
        setEmployees(employeeUsers);
      } catch {
        const currentUser = authService.getCurrentUser();
        if (currentUser?.role === USER_ROLE_EMPLOYEE && currentUser.id) {
          const fallbackName =
            [currentUser.firstName, currentUser.lastName]
              .filter(Boolean)
              .join(" ") ||
            currentUser.userName ||
            currentUser.username ||
            USER_ROLE_EMPLOYEE;
          setEmployees([{ id: currentUser.id, name: fallbackName }]);
        } else {
          setEmployees([]);
        }
      }
    };

    if (markModalOpen && markModalType === "pickup") {
      loadEmployees();
    }
  }, [markModalOpen, markModalType]);

  React.useEffect(() => {
    if (!(markModalOpen && markModalType === "pickup")) return;

    const timer = window.setTimeout(() => {
      releaseByInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [markModalOpen, markModalType]);

  const handleSaveMark = useCallback(async () => {
    if (!selectedTransactionForMark || !markModalType) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const transactionUpdate: Record<string, unknown> = {};

      if (markModalType === "loaded") {
        if (!markDateTime?.isValid()) {
          setActionError("Loaded date is required.");
          return;
        }
        transactionUpdate.dateLoaded = toApiDateTimeString(markDateTime);
      } else {
        if (!markDateTime?.isValid()) {
          setActionError("Pickup date is required.");
          return;
        }
        if (!releaseBy) {
          setActionError("Release By is required.");
          return;
        }
        transactionUpdate.datePickup = toApiDateTimeString(markDateTime);
        transactionUpdate.releasedBy = releaseBy;
      }

      const updated = await transactionService.update(
        selectedTransactionForMark.id,
        transactionUpdate,
        selectedTransactionForMark,
      );

      if (markModalType === "pickup" && releaseBy) {
        const emp = employees.find((e) => e.id === releaseBy);
        if (emp) {
          const parts = emp.name.trim().split(/\s+/);
          updated.releasedByUser = {
            id: emp.id,
            userName: emp.name,
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" ") || "",
          };
        }
      }

      onTransactionSynced?.(updated);
      flashTransactionHighlight(updated.id);
      if (markModalType === "pickup") {
        onToast?.({
          severity: "success",
          message: `${toPascalCase(
            selectedTransactionForMark.customer?.name || "Customer",
          )} record has been picked up.`,
        });
      } else {
        onToast?.({
          severity: "success",
          message: `${toPascalCase(
            selectedTransactionForMark.customer?.name || "Customer",
          )} transaction has been loaded.`,
        });
      }
      handleCloseMarkModal();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to save status update",
      );
    } finally {
      setActionLoading(false);
    }
  }, [
    employees,
    flashTransactionHighlight,
    handleCloseMarkModal,
    markDateTime,
    markModalType,
    onToast,
    onTransactionSynced,
    releaseBy,
    selectedTransactionForMark,
  ]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTx = a as Transaction & {
        datereceived?: string;
        dateloaded?: string;
        estimatedpickup?: string;
        datepickup?: string;
      };
      const bTx = b as Transaction & {
        datereceived?: string;
        dateloaded?: string;
        estimatedpickup?: string;
        datepickup?: string;
      };

      const aEstimated = dayjs(a.estimatedPickup || aTx.estimatedpickup);
      const bEstimated = dayjs(b.estimatedPickup || bTx.estimatedpickup);
      const aLoaded = Boolean(a.dateLoaded || aTx.dateloaded);
      const bLoaded = Boolean(b.dateLoaded || bTx.dateloaded);
      const aPriority = !aLoaded && aEstimated.isValid();
      const bPriority = !bLoaded && bEstimated.isValid();

      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;

      if (aPriority && bPriority) {
        const pickupDiff = aEstimated.valueOf() - bEstimated.valueOf();
        if (pickupDiff !== 0) return pickupDiff;
      }

      const aDate = dayjs(a.dateReceived || aTx.datereceived);
      const bDate = dayjs(b.dateReceived || bTx.datereceived);

      if (!aDate.isValid() && !bDate.isValid()) return 0;
      if (!aDate.isValid()) return 1;
      if (!bDate.isValid()) return -1;

      return bDate.valueOf() - aDate.valueOf();
    });
  }, [transactions]);

  React.useEffect(() => {
    const loadPricing = async () => {
      try {
        const pricing = await addonsPricingService.get();
        setAddonsPricing(pricing);
      } catch {
        setAddonsPricing(DEFAULT_ADDONS_PRICING);
      }
    };

    void loadPricing();
  }, []);

  const rowData = useMemo<FlatTransactionRow[]>(
    () =>
      sortedTransactions.flatMap((transaction) =>
        flattenTransactionRows(transaction, addonsPricing),
      ),
    [addonsPricing, sortedTransactions],
  );

  const themeDarkWarm = themeQuartz.withPart(
    darkMode ? colorSchemeDark : colorSchemeLightWarm,
  );

  const columnDefs = useMemo<ColDef<FlatTransactionRow>[]>(
    () => [
      {
        headerName: "Date Received",
        field: "dateReceived",
        width: 140,
        cellClass: "tx-cell-center",

        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) =>
          params.data?.isFirstRow && params.value ? (
            <Box
              sx={{
                ...getStatusCellStyle(params.data),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: 0.5,
                px: 1,
                lineHeight: 1.5,
                borderRadius: 0,
                textAlign: "center",
              }}
            >
              <span>{dayjs(params.value).format("MM-DD-YY")}</span>
              <span>{dayjs(params.value).format("h:mm A")}</span>
            </Box>
          ) : (
            ""
          ),
      },
      {
        headerName: "Customer",
        field: "customer",
        width: 172,
        minWidth: 150,
        cellClass: "tx-customer-cell",

        filter: true,
        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 0.5,
              lineHeight: 1.25,
              py: 0.25,
              width: "100%",
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                flex: 1,
                minWidth: 0,
                gap: 0,
                ...TX_CUSTOMER_TEXT_WRAP_SX,
              }}
            >
              {params.data?.loadLines && params.data.loadLines.length > 1 ? (
                <Box sx={TX_MULTI_LOAD_STACK_SX}>
                  {params.data.loadLines.map((line, i) => (
                    <Box
                      key={`${params.data?.transactionId}-load-${i}`}
                      sx={txMultiLoadCustomerLineSx}
                    >
                      <Box
                        component="span"
                        sx={{ display: "block", ...TX_CUSTOMER_TEXT_WRAP_SX }}
                      >
                        {params.data?.customer || "-"}
                      </Box>
                      <Box
                        component="span"
                        sx={{ display: "block", opacity: 0.75, ...TX_CUSTOMER_TEXT_WRAP_SX }}
                      >
                        ({line.loadType})
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <>
                  <Box component="span" sx={{ display: "block", ...TX_CUSTOMER_TEXT_WRAP_SX }}>
                    {params.data?.customer || "-"}
                  </Box>
                  {params.data?.loadType ? (
                    <Box
                      component="span"
                      sx={{
                        display: "block",
                        opacity: 0.7,
                        ...TX_CUSTOMER_TEXT_WRAP_SX,
                      }}
                    >
                      ({params.data.loadType})
                    </Box>
                  ) : null}
                </>
              )}
            </Box>
            {params.data?.isFirstRow && params.data?.estimatedPickup ? (
              <Tooltip
                title={dayjs(params.data.estimatedPickup).format(
                  "MM-DD-YY h:mm A",
                )}
                arrow
              >
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    mt: 0.125,
                    color: "#f44336",
                    flexShrink: 0,
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 15 }} />
                </Box>
              </Tooltip>
            ) : null}
            {params.data?.isFirstRow
              ? (() => {
                  const details = getNoteDetails(params.data);
                  if (details.length === 0) return null;

                  return (
                    <Tooltip
                      title={
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.25,
                          }}
                        >
                          {details.map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </Box>
                      }
                      arrow
                    >
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          alignSelf: "flex-start",
                          mt: 0.125,
                          color: "#f44336",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 15 }} />
                      </Box>
                    </Tooltip>
                  );
                })()
              : null}
          </Box>
        ),
      },
      {
        headerName: "KG",
        field: "kg",
        width: 60,

        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          const lines = params.data?.loadLines;
          if (lines && lines.length > 1) {
            return (
              <Box sx={TX_MULTI_LOAD_STACK_SX}>
                {lines.map((line, i) => (
                  <Box
                    key={`kg-${params.data?.transactionId}-${i}`}
                    sx={txMultiLoadMetricLineSx}
                  >
                    {line.kg}
                  </Box>
                ))}
              </Box>
            );
          }
          return params.value ?? "";
        },
      },
      {
        headerName: "Load",
        field: "loads",
        width: 70,

        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          const lines = params.data?.loadLines;
          if (lines && lines.length > 1) {
            return (
              <Box sx={TX_MULTI_LOAD_STACK_SX}>
                {lines.map((line, i) => (
                  <Box
                    key={`ld-${params.data?.transactionId}-${i}`}
                    sx={txMultiLoadMetricLineSx}
                  >
                    {line.loads}
                  </Box>
                ))}
              </Box>
            );
          }
          return params.value ?? "";
        },
      },
      {
        headerName: "Price",
        field: "price",
        width: 100,
        cellClass: "tx-cell-center",

        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow || params.value == null) return "";
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                textAlign: "center",
              }}
            >
              ₱{Number(params.value).toFixed(2)}
            </Box>
          );
        },
      },
      {
        headerName: "Date Loaded",
        field: "dateLoaded",
        width: 130,
        cellClass: "tx-cell-center",
        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) =>
          params.data?.isFirstRow && params.value ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: 0.5,
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              <span>{dayjs(params.value).format("MM-DD-YY")}</span>
              <span>{dayjs(params.value).format("h:mm A")}</span>
            </Box>
          ) : (
            ""
          ),
      },
      {
        headerName: "Date Paid",
        field: "datePaid",
        width: 112,
        minWidth: 100,
        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow || !params.value) return "";

          const totalPrice = Number(params.data.price || 0);
          const totalPaid = Number(params.data.totalPaid || 0);
          const hasBalance = totalPaid > 0 && totalPaid < totalPrice;
          const hasPaidOrOver = totalPaid >= totalPrice;
          const balanceAmount = Math.max(totalPrice - totalPaid, 0);
          const overAmount = Math.max(totalPaid - totalPrice, 0);

          const tooltipTitle = (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              {params.data.paymentHistory.map((paymentLine, index) => (
                <span key={`${params.data?.transactionId}-payment-${index}`}>
                  {paymentLine}
                </span>
              ))}
              {hasBalance ? (
                <span style={{ color: "#f44336", fontWeight: 600 }}>
                  Balance - {formatAmount(balanceAmount)}
                </span>
              ) : null}
              {hasPaidOrOver && overAmount > 0 ? (
                <span style={{ color: "#4caf50", fontWeight: 600 }}>
                  Over - {formatAmount(overAmount)}
                </span>
              ) : null}
            </Box>
          );

          const showIcons = hasBalance || hasPaidOrOver;

          const iconCluster = showIcons ? (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.25,
                flexShrink: 0,
              }}
            >
              {hasBalance ? (
                <Tooltip title={tooltipTitle} arrow>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 20,
                    }}
                  >
                    <WarningAmberIcon
                      sx={{
                        color: "#f44336",
                        fontSize: 16,
                        display: "block",
                      }}
                    />
                  </Box>
                </Tooltip>
              ) : null}
              {hasPaidOrOver ? (
                <Tooltip title={tooltipTitle} arrow>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 20,
                    }}
                  >
                    <HistoryIcon
                      sx={{
                        color: "#4caf50",
                        fontSize: 16,
                        display: "block",
                      }}
                    />
                  </Box>
                </Tooltip>
              ) : null}
            </Box>
          ) : null;

          const dateTimeStack = (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: showIcons ? "flex-start" : "center",
                justifyContent: "center",
                minWidth: 0,
                ...(showIcons ? { flex: 1 } : { width: "100%" }),
                textAlign: showIcons ? "left" : "center",
              }}
            >
              <span>{dayjs(params.value).format("MM-DD-YY")}</span>
              <span>{dayjs(params.value).format("h:mm A")}</span>
            </Box>
          );

          return (
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: showIcons ? "space-between" : "center",
                gap: 0.5,
                py: 0.25,
                px: 0,
                width: "100%",
                lineHeight: 1.45,
              }}
            >
              {dateTimeStack}
              {iconCluster}
            </Box>
          );
        },
      },
      {
        headerName: "Date Pickup",
        field: "datePickup",
        sortable: false,
        width: 130,
        cellClass: "tx-cell-center",
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) =>
          params.data?.isFirstRow && params.value ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: 0.5,
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              <span>{dayjs(params.value).format("MM-DD-YY")}</span>
              <span>{dayjs(params.value).format("h:mm A")}</span>
            </Box>
          ) : (
            ""
          ),
      },
      {
        headerName: "Notes",
        field: "notes",
        sortable: false,
        width: 200,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow) return "";
          const details = getNoteDetails(params.data);

          if (details.length === 0) return "-";

          const tooltipTitle = (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              {details.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </Box>
          );

          return (
            <Tooltip title={tooltipTitle} arrow>
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                  color: "#f44336",
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 16, color: "#f44336" }} />
                <span style={{ color: "#f44336", fontWeight: 600 }}>
                  {UI_TEXT.READ_NOTES}
                </span>
              </Stack>
            </Tooltip>
          );
        },
      },
      {
        headerName: "Released By",
        field: "releasedBy",
        width: 120,
        suppressMovable: true,
        sortable: false,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) =>
          params.data?.isFirstRow ? params.value : "",
      },
      {
        headerName: "Action",
        field: "action",
        sortable: false,
        pinned: "right",
        width: 182,
        minWidth: 172,
        cellClass: "tx-cell-center",
        suppressMovable: true,
        cellStyle: {
          alignContent: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: 2,
          paddingRight: 2,
        },
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow) return "";

          const payDisabled = isAddPaymentDisabled(params.data);
          const loadDisabled = Boolean(params.data?.hasDateLoaded);
          const pickupDisabled = Boolean(params.data?.hasDatePickup);

          return (
            <Stack
              direction="row"
              spacing={0.125}
              justifyContent="center"
              alignItems="center"
              alignContent="center"
              sx={{ width: "100%", flexWrap: "nowrap" }}
            >
              <Tooltip
                title={loadDisabled ? "Already loaded" : "Mark as loaded"}
              >
                <span>
                  <IconButton
                    aria-label="mark-loaded"
                    size="small"
                    color="secondary"
                    disabled={loadDisabled}
                    sx={TX_ACTION_ICON_BUTTON_SX}
                    onClick={() => {
                      const transaction = transactions.find(
                        (t) => t.id === params.data?.transactionId,
                      );
                      if (transaction) {
                        handleOpenMarkModal(transaction, "loaded");
                      }
                    }}
                  >
                    <Inventory2Icon fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  payDisabled
                    ? Number(params.data?.price || 0) <= 0 &&
                      Number(params.data?.totalPaid || 0) > 0
                      ? "No amount due"
                      : "Fully paid"
                    : "Mark as paid"
                }
              >
                <span>
                  <IconButton
                    aria-label="mark-paid"
                    size="small"
                    color="primary"
                    disabled={payDisabled}
                    sx={TX_ACTION_ICON_BUTTON_SX}
                    onClick={() => {
                      const transaction = transactions.find(
                        (t) => t.id === params.data?.transactionId,
                      );
                      if (transaction) {
                        handleOpenPaymentModal(transaction);
                      }
                    }}
                  >
                    <PaymentsIcon fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip
                title={pickupDisabled ? "Already picked up" : "Mark as pickup"}
              >
                <span>
                  <IconButton
                    aria-label="mark-pickup"
                    size="small"
                    color="info"
                    disabled={pickupDisabled}
                    sx={TX_ACTION_ICON_BUTTON_SX}
                    onClick={() => {
                      const transaction = transactions.find(
                        (t) => t.id === params.data?.transactionId,
                      );
                      if (transaction) {
                        handleOpenMarkModal(transaction, "pickup");
                      }
                    }}
                  >
                    <LocalShippingIcon fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>

              <Divider
                orientation="vertical"
                flexItem
                sx={{ my: 0.25, mx: 0, borderColor: "divider" }}
              />

              <Tooltip title="Edit">
                <IconButton
                  aria-label="edit"
                  size="small"
                  color="success"
                  sx={TX_ACTION_ICON_BUTTON_SX}
                  onClick={() => {
                    const transaction = transactions.find(
                      (t) => t.id === params.data?.transactionId,
                    );

                    if (transaction && onEditTransaction) {
                      onEditTransaction(transaction);
                    }
                  }}
                >
                  <EditIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete">
                <IconButton
                  aria-label="delete"
                  size="small"
                  color="error"
                  sx={TX_ACTION_ICON_BUTTON_SX}
                  onClick={() => {
                    if (params.data?.transactionId) {
                      handleDeleteTransactionClick(params.data.transactionId);
                    }
                  }}
                >
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [
      handleOpenMarkModal,
      handleOpenPaymentModal,
      onEditTransaction,
      transactions,
      handleDeleteTransactionClick,
    ],
  );

  const defaultColDef = useMemo<ColDef<FlatTransactionRow>>(
    () => ({
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "left",
      },
    }),
    [],
  );

  const getRowClass = (params: { data?: FlatTransactionRow }) => {
    const classes: string[] = [];

    if (
      highlightTransactionId &&
      params.data?.transactionId === highlightTransactionId
    ) {
      classes.push("tx-highlight-fade");
    }

    if (params.data?.isFirstRow) {
      classes.push("tx-main-row");
    } else {
      classes.push("tx-child-row");
    }

    if (params.data?.isLastRow) {
      classes.push("tx-last-row");
    }

    return classes.join(" ");
  };

  const getRowHeight = useCallback((params: { data?: FlatTransactionRow }) => {
    const data = params.data;
    if (!data) return 72;
    const textLines = estimateCustomerContentLines(data);
    const nLoads = data.loadLines?.length ?? 0;
    const stackGapPx = nLoads > 1 ? (nLoads - 1) * 12 : 0;
    const h = 36 + textLines * 16 + stackGapPx;
    return Math.min(300, Math.max(72, h));
  }, []);

  // Show error state
  if (error || deleteError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || deleteError}</Alert>
      </Box>
    );
  }

  return (
    <>
      <div
        className="transaction-grouped-grid"
        style={{
          height: "calc(100vh - 200px)",
          minHeight: 400,
          width: "100%",
          position: "relative",
        }}
      >
        {loading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.15)",
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {!loading && rowData.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "calc(100vh - 200px)",
              minHeight: 400,
              opacity: 0.6,
            }}
          >
            {EMPTY_STATES.NO_TRANSACTIONS}
          </Box>
        ) : (
          <AgGridReact<FlatTransactionRow>
            theme={themeDarkWarm}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data?.id ?? ""}
            getRowClass={getRowClass}
            getRowHeight={getRowHeight}
            animateRows
            pagination={true}
            onGridReady={(params) => {
              gridApiRef.current = params.api;
            }}
          />
        )}
      </div>

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={handleClosePaymentModal}
        onSave={handleSavePayment}
        customerName={selectedTransactionForPayment?.customer?.name}
        balance={
          selectedTransactionForPayment
            ? getTransactionTotals(selectedTransactionForPayment, addonsPricing)
                .balance
            : undefined
        }
        history={selectedTransactionForPayment?.paymentDetails || []}
        positionTop
      />

      <Dialog
        open={markModalOpen}
        onClose={handleCloseMarkModal}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              position: "fixed",
              top: 20,
              margin: 0,
              maxHeight: "calc(100vh - 40px)",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <DialogTitle>
          {markModalType === "loaded" ? "Mark as Loaded" : "Mark as Pickup"}
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "auto",
          }}
        >
          {selectedTransactionForMark?.customer?.name ? (
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {markModalType === "loaded"
                ? `Mark ${toPascalCase(
                    selectedTransactionForMark.customer.name,
                  )} as loaded?`
                : `Mark ${toPascalCase(
                    selectedTransactionForMark.customer.name,
                  )} as picked up?`}
            </Typography>
          ) : null}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label={markModalType === "loaded" ? "Loaded Date" : "Pickup Date"}
              value={markDateTime}
              onChange={(value) => {
                if (markModalType === "pickup") {
                  setMarkDateTime(value);
                } else {
                  setMarkDateTime(value ?? dayjs());
                }
              }}
              maxDate={dayjs()}
              timeSteps={{ minutes: 1 }}
              slotProps={{
                actionBar: { actions: ["today", "cancel", "accept"] },
                field: {
                  clearable: markModalType === "pickup",
                  onClear: () => {
                    if (markModalType === "pickup") {
                      setMarkDateTime(null);
                      setReleaseBy("");
                    } else {
                      setMarkDateTime(dayjs());
                    }
                  },
                },
                popper: {
                  modifiers: [
                    {
                      name: "flip",
                      enabled: true,
                    },
                    {
                      name: "preventOverflow",
                      enabled: true,
                      options: {
                        padding: 8,
                      },
                    },
                  ],
                },
                textField: { size: "small", fullWidth: true },
              }}
            />
          </LocalizationProvider>

          {markModalType === "pickup" ? (
            <Stack direction="row" spacing={0.5} alignItems="flex-start">
              <FormControl fullWidth size="small" required>
                <InputLabel>Release By</InputLabel>
                <Select
                  label="Release By"
                  displayEmpty
                  value={releaseBy}
                  onChange={(e) => setReleaseBy(String(e.target.value))}
                  inputRef={releaseByInputRef}
                >
                  <MenuItem value="">
                    <em>Select employee</em>
                  </MenuItem>
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {releaseBy ? (
                <Tooltip title="Clear release by">
                  <IconButton
                    aria-label="clear release by"
                    size="small"
                    sx={{ mt: 0.25 }}
                    onClick={() => setReleaseBy("")}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          ) : null}

          {actionError ? <Alert severity="error">{actionError}</Alert> : null}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" onClick={handleCloseMarkModal}>
            {UI_TEXT.CANCEL}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveMark}
            disabled={
              actionLoading ||
              (markModalType === "pickup" &&
                (!markDateTime?.isValid() || !releaseBy))
            }
          >
            {UI_TEXT.SAVE}
          </Button>
        </DialogActions>
      </Dialog>

      <TransactionDeleteDialog
        open={Boolean(deleteTransactionId)}
        onClose={() => setDeleteTransactionId(null)}
        onConfirm={handleDeleteTransactionConfirm}
      />
    </>
  );
}

const TransactionTable = React.memo(TransactionTableInner);
export default TransactionTable;
