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
  TextField,
  Typography,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
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
import { ignoreBackdropClose } from "../../../utils/muiDialogClose";

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
import userService from "../../../services/userService";
import authService from "../../../services/authService";
import { USER_STATUS_ACTIVE } from "../../../constants/status";
import {
  buildEmployeeDisplayName,
  mapUsersToEmployeeOptions,
  mergeEmployeeOptions,
  type EmployeeOption,
} from "../../../utils/employeeOptions";
import type { UserStatusValue } from "../../../constants/status";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../../services/addonsPricingService";
import {
  CONFIRM_MESSAGES,
  EMPTY_STATES,
  FORM_ERRORS,
  UI_TEXT,
} from "../../../constants/messages";
import { USER_ROLE_EMPLOYEE } from "../../../constants/roles";
import { toBackendPaymentMode } from "../../../constants/payment";
import TransactionDeleteDialog, {
  type DeleteReason,
} from "../../../components/TransactionDeleteDialog/TransactionDeleteDialog";
import {
  getTransactionAmountDue,
  getTransactionDiscount,
} from "../../../utils/pricing";
import { pickTransactionNum } from "../../../utils/normalizeTransaction";
import { getTransactionNoteDetailLines } from "../../../utils/transactionNoteDetails";
import {
  getEstimatedPickupTooltipParts,
  getTransactionEstimatedPickupIso,
} from "../utils/transactionListFilters";
import {
  clampPickupLoadsValue,
  getPickupHistoryLines,
  getLoadsPickedUp,
  getRemainingLoads,
  getTotalLoads,
  hasPartialPickup,
  isFullyPickedUp,
} from "../../../utils/transactionPickup";
import "./TransactionTable.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const isTransactionLoaded = (transaction: Transaction): boolean => {
  const tx = transaction as Transaction & { dateloaded?: string };
  const dateLoaded = transaction.dateLoaded || tx.dateloaded;
  if (!dateLoaded) return false;
  return dayjs(dateLoaded).isValid();
};

interface FlatTransactionRow {
  id: string;
  transactionId: string;
  isFirstRow: boolean;
  isLastRow: boolean;
  hasDateLoaded: boolean;
  hasDatePickup: boolean;
  isFullyPickedUp: boolean;
  hasPartialPickup: boolean;
  totalLoads: number;
  loadsPickedUp: number;
  remainingLoads: number;
  pickupEventCount: number;
  latestPickupLoads: number;
  pickupHistoryLines: string[];
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
  discount: number;
  isDelivered: boolean;
  receivedBy: string;
  releasedBy: string;
  action: string;
  /** One entry per load line; used to stack Customer / KG / Load in a single grid row. */
  loadLines: Array<{
    loadType: string;
    kg: number;
    loads: number;
    nickname?: string;
  }>;
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

const numberInputSx = {
  "& input[type=number]::-webkit-outer-spin-button": {
    WebkitAppearance: "none",
    margin: 0,
  },
  "& input[type=number]::-webkit-inner-spin-button": {
    WebkitAppearance: "none",
    margin: 0,
  },
  "& input[type=number]": {
    MozAppearance: "textfield",
  },
} as const;

const TX_TABLE_STATUS_ICON_SIZE = 22;

const TX_ESTIMATED_PICKUP_TIME_SX = {
  color: "#ff5252",
  fontWeight: 700,
  fontSize: "1.08rem",
  letterSpacing: "0.03em",
  textShadow: "0 0 8px rgba(255, 82, 82, 0.45)",
} as const;

const TX_TABLE_TOOLTIP_SLOT_PROPS = {
  tooltip: {
    sx: {
      fontSize: "0.95rem",
      lineHeight: 1.45,
      maxWidth: 380,
      py: 0.75,
      px: 1.25,
    },
  },
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
      sum += countWrappedLines(name, CUSTOMER_WRAP_CHARS);
      if (line.nickname) {
        sum += countWrappedLines(`(${line.nickname})`, CUSTOMER_WRAP_CHARS);
      }
      sum += countWrappedLines(`(${line.loadType})`, CUSTOMER_WRAP_CHARS);
    }
    return Math.max(sum, loads.length * 2);
  }
  const singleNickname = data.loadLines?.[0]?.nickname;
  let lines = countWrappedLines(name, CUSTOMER_WRAP_CHARS);
  if (singleNickname) {
    lines += countWrappedLines(`(${singleNickname})`, CUSTOMER_WRAP_CHARS);
  }
  if (data.loadType) {
    lines += countWrappedLines(`(${data.loadType})`, CUSTOMER_WRAP_CHARS);
  }
  return lines;
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
  if (row.isFullyPickedUp) return STATUS_CELL_STYLES.picked;
  if (row.hasDateLoaded) return STATUS_CELL_STYLES.loaded;
  return undefined;
};

const formatAmount = (amount: number): string => {
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
};

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function toMixedFraction(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const frac = abs - whole;

  // Prefer common denominators used for weights.
  const candidates = [2, 4, 8, 16];
  let best: { num: number; den: number; err: number } | null = null;

  for (const den of candidates) {
    const num = Math.round(frac * den);
    const err = Math.abs(frac - num / den);
    if (best == null || err < best.err) best = { num, den, err };
  }

  if (!best) return `${value}`;

  // If fraction rounds to whole, carry to integer.
  if (best.num === best.den) {
    return `${sign}${whole + 1}`;
  }

  // If close enough to 0, show integer.
  if (best.num === 0 || best.err > 1e-6) {
    return `${sign}${whole}`;
  }

  const g = gcd(best.num, best.den);
  const num = best.num / g;
  const den = best.den / g;

  if (whole === 0) return `${sign}${num}/${den}`;
  return `${sign}${whole} ${num}/${den}`;
}

const getTransactionTotals = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): { totalPrice: number; totalPaid: number; balance: number } => {
  const loadDetails = transaction.loadDetails || [];

  const payments = transaction.paymentDetails || [];
  const totalPaid = payments.reduce(
    (sum: number, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const totalPrice = getTransactionAmountDue(
    { ...transaction, loadDetails },
    addonsPricing,
  );

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

const getNoteDetails = (row?: FlatTransactionRow): string[] =>
  getTransactionNoteDetailLines(row);

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
  const hasEstimatedPickup =
    Boolean(estimatedPickup) &&
    dayjs(estimatedPickup).isValid() &&
    !hasDateLoaded;
  const hasDatePickup = Boolean(datePickup);
  const totalLoadsCount = getTotalLoads(transaction);
  const loadsPickedUpCount = getLoadsPickedUp(transaction);
  const remainingLoadsCount = getRemainingLoads(transaction);
  const fullyPickedUp = isFullyPickedUp(transaction);
  const partialPickup = hasPartialPickup(transaction);
  const pickupEventCount = transaction.pickupDetails?.length ?? 0;
  const latestPickupLoads =
    transaction.pickupDetails?.[transaction.pickupDetails.length - 1]
      ?.loadsCount ?? 0;
  const pickupHistoryLines = getPickupHistoryLines(transaction);
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
  // Get latest payment date if payments exist
  const payments = transaction.paymentDetails || [];
  const totalPaid = payments.reduce(
    (sum: number, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const txRecord = transaction as unknown as Record<string, unknown>;
  const whitePrice = pickTransactionNum(txRecord, "whiteprice", "whitePrice");
  const fabconQty = pickTransactionNum(txRecord, "fabconqty", "fabconQty");
  const detergentQty = pickTransactionNum(
    txRecord,
    "detergentqty",
    "detergentQty",
  );
  const colorSafeQty = pickTransactionNum(
    txRecord,
    "colorsafeqty",
    "colorSafeQty",
  );
  const discount = getTransactionDiscount(transaction);
  const totalPrice = getTransactionAmountDue(
    { ...transaction, loadDetails },
    addonsPricing,
  );
  const balance =
    totalPaid > 0 && totalPaid < totalPrice ? totalPrice - totalPaid : 0;

  const datePaid =
    payments.length > 0 ? payments[payments.length - 1].paymentDate : null;
  const paymentHistory = payments.map((payment) => {
    const paidAt = dayjs(payment.paymentDate).format("MM-DD-YY h:mm A");
    return `${paidAt} - ${formatAmount(Number(payment.amount || 0))} ${payment.mode}`;
  });

  const formatEmployeeName = (
    user?: {
      firstName?: string;
      lastName?: string;
      userName?: string;
    } | null,
  ): string => {
    if (!user) return "-";
    const name = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || user.userName || "-";
  };

  const receivedBy = formatEmployeeName(transaction.receivedByUser);
  const releasedBy = formatEmployeeName(transaction.releasedByUser);

  const loadLines =
    loadDetails.length === 0
      ? []
      : loadDetails.map((load) => ({
          loadType: load.type || "Load",
          kg: Number(load.kg || 0),
          loads: Number(load.loads || 0),
          nickname: load.nickname || "",
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
        isFullyPickedUp: fullyPickedUp,
        hasPartialPickup: partialPickup,
        totalLoads: totalLoadsCount,
        loadsPickedUp: loadsPickedUpCount,
        remainingLoads: remainingLoadsCount,
        pickupEventCount,
        latestPickupLoads,
        pickupHistoryLines,
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
        discount,
        isDelivered,
        receivedBy,
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
      isFullyPickedUp: fullyPickedUp,
      hasPartialPickup: partialPickup,
      totalLoads: totalLoadsCount,
      loadsPickedUp: loadsPickedUpCount,
      remainingLoads: remainingLoadsCount,
      pickupEventCount,
      latestPickupLoads,
      pickupHistoryLines,
      dateReceived,
      dateLoaded,
      estimatedPickup,
      customer: customerName,
      loadType: first.loadType,
      kg: first.kg,
      loads: totalLoadsCount,
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
      discount,
      isDelivered,
      receivedBy,
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
  onToast?: (payload: {
    severity: "success" | "error" | "warning";
    message: string;
  }) => void;
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
  const [notLoadedDialogOpen, setNotLoadedDialogOpen] = useState(false);
  const [pickupConfirmOpen, setPickupConfirmOpen] = useState(false);
  const [pendingPickupTransaction, setPendingPickupTransaction] =
    useState<Transaction | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [releaseBy, setReleaseBy] = useState<string>("");
  const [pickupLoads, setPickupLoads] = useState<number>(1);
  const [pickupLoadsInput, setPickupLoadsInput] = useState("1");
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
          message: `${toPascalCase(
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
      if (type === "pickup" && !isTransactionLoaded(transaction)) {
        setNotLoadedDialogOpen(true);
        return;
      }
      setSelectedTransactionForMark(transaction);
      setMarkModalType(type);
      setMarkDateTime(dayjs());
      setActionError(null);
      setReleaseBy("");
      const remaining = getRemainingLoads(transaction) || 1;
      setPickupLoads(remaining);
      setPickupLoadsInput(String(remaining));
      setMarkModalOpen(true);
    },
    [],
  );

  const handlePickupClick = useCallback(
    (transaction: Transaction) => {
      if (!isTransactionLoaded(transaction)) {
        setNotLoadedDialogOpen(true);
        return;
      }
      const { totalPaid, balance, totalPrice } = getTransactionTotals(
        transaction,
        addonsPricing,
      );
      const notYetPaid = totalPrice > 0 && totalPaid === 0;
      const hasBalance = balance > 0;
      if (hasBalance || notYetPaid) {
        setPendingPickupTransaction(transaction);
        setPickupConfirmOpen(true);
        return;
      }
      handleOpenMarkModal(transaction, "pickup");
    },
    [addonsPricing, handleOpenMarkModal],
  );

  const handlePickupConfirmYes = useCallback(() => {
    if (pendingPickupTransaction) {
      handleOpenMarkModal(pendingPickupTransaction, "pickup");
    }
    setPickupConfirmOpen(false);
    setPendingPickupTransaction(null);
  }, [handleOpenMarkModal, pendingPickupTransaction]);

  const handlePickupConfirmNo = useCallback(() => {
    setPickupConfirmOpen(false);
    setPendingPickupTransaction(null);
  }, []);

  const pickupConfirmMessage = useMemo(() => {
    if (!pendingPickupTransaction) return "";
    const { totalPaid, balance, totalPrice } = getTransactionTotals(
      pendingPickupTransaction,
      addonsPricing,
    );
    if (totalPrice > 0 && totalPaid === 0) {
      return CONFIRM_MESSAGES.PICKUP_NOT_YET_PAID;
    }
    if (balance > 0) {
      return CONFIRM_MESSAGES.PICKUP_WITH_BALANCE;
    }
    return CONFIRM_MESSAGES.PICKUP_WITH_BALANCE;
  }, [addonsPricing, pendingPickupTransaction]);

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
        setEmployees(
          mergeEmployeeOptions(
            mapUsersToEmployeeOptions(users),
            selectedTransactionForMark?.releasedByUser ?? undefined,
          ),
        );
      } catch {
        const currentUser = authService.getCurrentUser();
        if (currentUser?.role === USER_ROLE_EMPLOYEE && currentUser.id) {
          setEmployees(
            mergeEmployeeOptions(
              [
                {
                  id: currentUser.id,
                  name: buildEmployeeDisplayName(currentUser),
                  status:
                    (currentUser as { status?: UserStatusValue }).status ??
                    USER_STATUS_ACTIVE,
                },
              ],
              selectedTransactionForMark?.releasedByUser ?? undefined,
            ),
          );
        } else {
          setEmployees(
            mergeEmployeeOptions(
              [],
              selectedTransactionForMark?.releasedByUser ?? undefined,
            ),
          );
        }
      }
    };

    if (markModalOpen && markModalType === "pickup") {
      loadEmployees();
    }
  }, [markModalOpen, markModalType, selectedTransactionForMark]);

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
        transactionUpdate.estimatedPickup = null;
      } else {
        if (!isTransactionLoaded(selectedTransactionForMark)) {
          handleCloseMarkModal();
          setNotLoadedDialogOpen(true);
          return;
        }
        if (!markDateTime?.isValid()) {
          setActionError("Pickup date is required.");
          return;
        }
        if (!releaseBy) {
          setActionError("Release By is required.");
          return;
        }
        const maxPickupLoads = getRemainingLoads(selectedTransactionForMark);
        const loadsToPick = clampPickupLoadsValue(
          pickupLoadsInput,
          maxPickupLoads,
        );
        if (loadsToPick < 1 || loadsToPick > maxPickupLoads) {
          setActionError(`Enter between 1 and ${maxPickupLoads} load(s).`);
          return;
        }
        setPickupLoads(loadsToPick);
        setPickupLoadsInput(String(loadsToPick));
        transactionUpdate.datePickup = toApiDateTimeString(markDateTime);
        transactionUpdate.releasedBy = releaseBy;
        transactionUpdate.pickupLoads = loadsToPick;
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
        const remainingBefore = getRemainingLoads(selectedTransactionForMark);
        const pickedCount = Number(
          transactionUpdate.pickupLoads ?? pickupLoads,
        );
        onToast?.({
          severity: "success",
          message: `${toPascalCase(
            selectedTransactionForMark.customer?.name || "Customer",
          )} — ${pickedCount} load(s) picked up${
            pickedCount < remainingBefore
              ? ` (${remainingBefore - pickedCount} remaining)`
              : ""
          }.`,
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
    pickupLoads,
    pickupLoadsInput,
    releaseBy,
    selectedTransactionForMark,
  ]);

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
      transactions.flatMap((transaction) =>
        flattenTransactionRows(transaction, addonsPricing),
      ),
    [addonsPricing, transactions],
  );

  // Row heights are cached by AG-Grid; recompute them when the data changes
  // (e.g. editing a transaction so a nickname now wraps to a new line).
  React.useEffect(() => {
    const api = gridApiRef.current;
    if (!api) return;
    try {
      api.resetRowHeights?.();
    } catch {
      // ignore
    }
  }, [rowData]);

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
                      {line.nickname ? (
                        <Box
                          component="span"
                          sx={{
                            display: "block",
                            color: "#f44336",
                            fontWeight: "bold",
                            ...TX_CUSTOMER_TEXT_WRAP_SX,
                          }}
                        >
                          ({line.nickname})
                        </Box>
                      ) : null}
                      <Box
                        component="span"
                        sx={{
                          display: "block",
                          opacity: 0.75,
                          ...TX_CUSTOMER_TEXT_WRAP_SX,
                        }}
                      >
                        ({line.loadType})
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <>
                  <Box
                    component="span"
                    sx={{ display: "block", ...TX_CUSTOMER_TEXT_WRAP_SX }}
                  >
                    {params.data?.customer || "-"}
                  </Box>
                  {params.data?.loadLines?.[0]?.nickname ? (
                    <Box
                      component="span"
                      sx={{
                        display: "block",
                        color: "#f44336",
                        fontWeight: "bold",
                        ...TX_CUSTOMER_TEXT_WRAP_SX,
                      }}
                    >
                      ({params.data.loadLines[0].nickname})
                    </Box>
                  ) : null}
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
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "stretch",
                gap: 0.25,
                flexShrink: 0,
              }}
            >
              {params.data?.isFirstRow && params.data?.hasEstimatedPickup ? (
                <Tooltip
                  title={(() => {
                    const pickupTooltip = getEstimatedPickupTooltipParts(
                      params.data.estimatedPickup,
                    );
                    if (!pickupTooltip) return "";
                    return (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.25,
                          fontSize: "0.95rem",
                        }}
                      >
                        <span>Scheduled Pick Up</span>
                        <Box component="span" sx={{ lineHeight: 1.5 }}>
                          {pickupTooltip.isToday ? (
                            <>
                              Today,{" "}
                              <Box
                                component="span"
                                sx={TX_ESTIMATED_PICKUP_TIME_SX}
                              >
                                {pickupTooltip.timePart}
                              </Box>
                              , {pickupTooltip.datePart}
                            </>
                          ) : pickupTooltip.isTomorrow ? (
                            <>
                              Tomorrow,{" "}
                              <Box
                                component="span"
                                sx={TX_ESTIMATED_PICKUP_TIME_SX}
                              >
                                {pickupTooltip.timePart}
                              </Box>
                              , {pickupTooltip.datePart}
                            </>
                          ) : (
                            <>
                              <Box
                                component="span"
                                sx={TX_ESTIMATED_PICKUP_TIME_SX}
                              >
                                {pickupTooltip.timePart}
                              </Box>
                              , {pickupTooltip.datePart}
                            </>
                          )}
                        </Box>
                      </Box>
                    );
                  })()}
                  arrow
                  placement="right"
                  slotProps={TX_TABLE_TOOLTIP_SLOT_PROPS}
                >
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      color: "#f44336",
                      flexShrink: 0,
                    }}
                  >
                    <HourglassTopIcon
                      sx={{ fontSize: TX_TABLE_STATUS_ICON_SIZE }}
                    />
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
                              fontSize: "0.95rem",
                            }}
                          >
                            {details.map((line) => (
                              <span key={line}>{line}</span>
                            ))}
                          </Box>
                        }
                        arrow
                        placement="right"
                        slotProps={TX_TABLE_TOOLTIP_SLOT_PROPS}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            color: "#f44336",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <InfoOutlinedIcon
                            sx={{ fontSize: TX_TABLE_STATUS_ICON_SIZE }}
                          />
                        </Box>
                      </Tooltip>
                    );
                  })()
                : null}
            </Box>
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
                    {toMixedFraction(line.kg)}
                  </Box>
                ))}
              </Box>
            );
          }
          return typeof params.value === "number"
            ? toMixedFraction(params.value)
            : (params.value ?? "");
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
          const balanceAmount = Number(params.data.balance || 0);
          const showBalanceLine = balanceAmount > 0;
          return (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                textAlign: "center",
                lineHeight: 1.45,
              }}
            >
              <span>₱{Number(params.value).toFixed(2)}</span>
              {showBalanceLine ? (
                <span style={{ color: "#f44336" }}>
                  (₱{balanceAmount.toFixed(2)})
                </span>
              ) : null}
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
        cellClass: "tx-date-paid-cell",
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow) return "";

          const totalPrice = Number(params.data.price || 0);
          const totalPaid = Number(params.data.totalPaid || 0);
          const balanceAmount = Number(params.data.balance || 0);
          const discountAmount = Number(params.data.discount || 0);
          const notYetPaid = totalPrice > 0 && totalPaid === 0;
          const hasPartialBalance =
            totalPaid > 0 && totalPaid < totalPrice && totalPrice > 0;
          const hasPaidOrOver = totalPaid >= totalPrice && totalPrice > 0;
          const overAmount = Math.max(totalPaid - totalPrice, 0);
          const showPaymentDate =
            Boolean(params.value) && !notYetPaid && !hasPartialBalance;
          const showWarningIcon = hasPartialBalance;

          const tooltipTitle = (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.25,
                fontSize: "0.95rem",
              }}
            >
              {params.data.paymentHistory.map((paymentLine, index) => (
                <span key={`${params.data?.transactionId}-payment-${index}`}>
                  {paymentLine}
                </span>
              ))}
              {discountAmount > 0 ? (
                <span style={{ color: "#f44336", fontWeight: 600 }}>
                  Discount - {formatAmount(discountAmount)}
                </span>
              ) : null}
              {notYetPaid ? (
                <span style={{ color: "#f44336", fontWeight: 600 }}>
                  Unpaid
                </span>
              ) : null}
              {hasPartialBalance ? (
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

          const showIcons = showWarningIcon || hasPaidOrOver;

          const iconCluster = showIcons ? (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.25,
                flexShrink: 0,
              }}
            >
              {showWarningIcon ? (
                <Tooltip
                  title={tooltipTitle}
                  arrow
                  slotProps={TX_TABLE_TOOLTIP_SLOT_PROPS}
                >
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: TX_TABLE_STATUS_ICON_SIZE + 4,
                    }}
                  >
                    <WarningAmberIcon
                      sx={{
                        color: "#f44336",
                        fontSize: TX_TABLE_STATUS_ICON_SIZE,
                        display: "block",
                      }}
                    />
                  </Box>
                </Tooltip>
              ) : null}
              {hasPaidOrOver ? (
                <Tooltip
                  title={tooltipTitle}
                  arrow
                  slotProps={TX_TABLE_TOOLTIP_SLOT_PROPS}
                >
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: TX_TABLE_STATUS_ICON_SIZE + 4,
                    }}
                  >
                    <HistoryIcon
                      sx={{
                        color: "#4caf50",
                        fontSize: TX_TABLE_STATUS_ICON_SIZE,
                        display: "block",
                      }}
                    />
                  </Box>
                </Tooltip>
              ) : null}
            </Box>
          ) : null;

          const statusLabel = notYetPaid
            ? "UNPAID"
            : hasPartialBalance
              ? "BALANCE"
              : null;

          if (statusLabel) {
            return (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.25,
                  py: 0.25,
                  px: 0,
                  width: "100%",
                  lineHeight: 1.45,
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    color: "#f44336",
                    fontWeight: 700,
                    letterSpacing: 0.4,
                  }}
                >
                  {statusLabel}
                </span>
                {showWarningIcon ? iconCluster : null}
              </Box>
            );
          }

          if (!showPaymentDate && !showIcons) return "";

          const dateTimeStack = showPaymentDate ? (
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
          ) : null;

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
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow) return "";
          if (!params.value && !params.data.hasPartialPickup) return "";

          const showHistory =
            params.data.hasPartialPickup ||
            (params.data.isFullyPickedUp && params.data.pickupEventCount > 1);

          const pickupHistoryTooltip = (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.25,
                fontSize: "0.95rem",
              }}
            >
              {params.data.pickupHistoryLines.map((line, index) => (
                <span key={`${params.data?.transactionId}-pickup-${index}`}>
                  {line}
                </span>
              ))}
            </Box>
          );

          const pickupHistoryIcon = (
            <Tooltip
              title={pickupHistoryTooltip}
              arrow
              slotProps={TX_TABLE_TOOLTIP_SLOT_PROPS}
            >
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: TX_TABLE_STATUS_ICON_SIZE + 4,
                }}
              >
                <HistoryIcon
                  sx={{
                    color: "#4caf50",
                    fontSize: TX_TABLE_STATUS_ICON_SIZE,
                    display: "block",
                  }}
                />
              </Box>
            </Tooltip>
          );

          if (params.data.hasPartialPickup) {
            return (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.5,
                  width: "100%",
                  padding: 0.5,
                  lineHeight: 1.5,
                  textAlign: "center",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "#4caf50", fontWeight: 600 }}>
                    IN - {params.data.remainingLoads}
                  </span>
                  <span style={{ color: "#f44336", fontWeight: 600 }}>
                    OUT - {params.data.loadsPickedUp}
                  </span>
                </Box>
                {pickupHistoryIcon}
              </Box>
            );
          }

          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                width: "100%",
                padding: 0.5,
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <span>{dayjs(params.value).format("MM-DD-YY")}</span>
                <span>{dayjs(params.value).format("h:mm A")}</span>
              </Box>
              {showHistory ? pickupHistoryIcon : null}
            </Box>
          );
        },
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
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.25,
                fontSize: "0.95rem",
              }}
            >
              {details.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </Box>
          );

          return (
            <Tooltip
              title={tooltipTitle}
              arrow
              slotProps={TX_TABLE_TOOLTIP_SLOT_PROPS}
            >
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
                <InfoOutlinedIcon
                  sx={{ fontSize: TX_TABLE_STATUS_ICON_SIZE, color: "#f44336" }}
                />
                <span style={{ color: "#f44336", fontWeight: 600 }}>
                  {UI_TEXT.READ_NOTES}
                </span>
              </Stack>
            </Tooltip>
          );
        },
      },
      {
        headerName: "Receive By",
        field: "receivedBy",
        width: 120,
        suppressMovable: true,
        sortable: false,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) =>
          params.data?.isFirstRow ? params.value : "",
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
          const pickupDisabled = Boolean(params.data?.isFullyPickedUp);

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
                        handlePickupClick(transaction);
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
      handlePickupClick,
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

  const getRowClass = (params: {
    data?: FlatTransactionRow;
    node?: { rowIndex?: number | null };
  }) => {
    const classes: string[] = [];

    if (
      highlightTransactionId &&
      params.data?.transactionId === highlightTransactionId
    ) {
      classes.push("tx-highlight-fade");
    }

    if ((params.node?.rowIndex ?? 0) % 2 === 0) {
      classes.push("tx-row-alt-even");
    } else {
      classes.push("tx-row-alt-odd");
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
        className={`transaction-grouped-grid ${darkMode ? "tx-grid-dark" : "tx-grid-light"}`}
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
        onClose={ignoreBackdropClose(handleCloseMarkModal)}
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
          {markModalType === "loaded" && selectedTransactionForMark
            ? (() => {
                const noteLines = getTransactionNoteDetailLines(
                  selectedTransactionForMark,
                );
                const estimatedIso = getTransactionEstimatedPickupIso(
                  selectedTransactionForMark,
                );
                const pickupTooltip = estimatedIso
                  ? getEstimatedPickupTooltipParts(estimatedIso)
                  : null;
                if (noteLines.length === 0 && !pickupTooltip) return null;
                return (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.75,
                      color: "#d32f2f",
                      fontSize: "0.95rem",
                      lineHeight: 1.45,
                      fontWeight: 500,
                    }}
                  >
                    {noteLines.map((line) => (
                      <Typography key={line} component="span" variant="body2">
                        {line}
                      </Typography>
                    ))}
                    {pickupTooltip ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.25,
                        }}
                      >
                        <Typography component="span" variant="body2">
                          Scheduled Pick Up
                        </Typography>
                        <Typography component="span" variant="body2">
                          {pickupTooltip.isToday ? (
                            <>
                              Today,{" "}
                              <Box
                                component="span"
                                sx={{
                                  ...TX_ESTIMATED_PICKUP_TIME_SX,
                                  fontSize: "0.95rem",
                                }}
                              >
                                {pickupTooltip.timePart}
                              </Box>
                              , {pickupTooltip.datePart}
                            </>
                          ) : pickupTooltip.isTomorrow ? (
                            <>
                              Tomorrow,{" "}
                              <Box
                                component="span"
                                sx={{
                                  ...TX_ESTIMATED_PICKUP_TIME_SX,
                                  fontSize: "0.95rem",
                                }}
                              >
                                {pickupTooltip.timePart}
                              </Box>
                              , {pickupTooltip.datePart}
                            </>
                          ) : (
                            <>
                              <Box
                                component="span"
                                sx={{
                                  ...TX_ESTIMATED_PICKUP_TIME_SX,
                                  fontSize: "0.95rem",
                                }}
                              >
                                {pickupTooltip.timePart}
                              </Box>
                              , {pickupTooltip.datePart}
                            </>
                          )}
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                );
              })()
            : null}
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
            <>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Number of loads"
                value={pickupLoadsInput}
                sx={numberInputSx}
                inputProps={{
                  min: 1,
                  max: selectedTransactionForMark
                    ? getRemainingLoads(selectedTransactionForMark)
                    : 1,
                  inputMode: "numeric",
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d+$/.test(raw)) {
                    setPickupLoadsInput(raw);
                  }
                }}
                onBlur={() => {
                  const max = selectedTransactionForMark
                    ? getRemainingLoads(selectedTransactionForMark)
                    : 1;
                  const clamped = clampPickupLoadsValue(pickupLoadsInput, max);
                  setPickupLoads(clamped);
                  setPickupLoadsInput(String(clamped));
                }}
                helperText={
                  selectedTransactionForMark
                    ? `Enter 1 to ${getRemainingLoads(selectedTransactionForMark)} load(s)`
                    : undefined
                }
              />
              <Stack direction="row" spacing={0.5} alignItems="flex-start">
                <FormControl fullWidth size="small" required>
                  <InputLabel id="mark-pickup-release-by-label" shrink>
                    Release By
                  </InputLabel>
                  <Select
                    labelId="mark-pickup-release-by-label"
                    label="Release By"
                    displayEmpty
                    value={releaseBy}
                    onChange={(e) => setReleaseBy(String(e.target.value))}
                    inputRef={releaseByInputRef}
                    renderValue={(selected) => {
                      if (!selected) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            Select employee
                          </Typography>
                        );
                      }
                      const emp = employees.find(
                        (e) => String(e.id) === String(selected),
                      );
                      return emp?.name ?? "";
                    }}
                  >
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
            </>
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
                (!markDateTime?.isValid() ||
                  !releaseBy ||
                  !pickupLoadsInput.trim() ||
                  clampPickupLoadsValue(
                    pickupLoadsInput,
                    selectedTransactionForMark
                      ? getRemainingLoads(selectedTransactionForMark)
                      : 1,
                  ) < 1))
            }
          >
            {UI_TEXT.SAVE}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pickupConfirmOpen}
        onClose={ignoreBackdropClose(handlePickupConfirmNo)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Mark as Pickup</DialogTitle>
        <DialogContent>
          <Typography>{pickupConfirmMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="contained"
            onClick={handlePickupConfirmYes}
            autoFocus
          >
            Yes
          </Button>
          <Button variant="outlined" onClick={handlePickupConfirmNo}>
            No
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={notLoadedDialogOpen}
        onClose={ignoreBackdropClose(() => setNotLoadedDialogOpen(false))}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Mark as Pickup</DialogTitle>
        <DialogContent>
          <Typography>{FORM_ERRORS.TRANSACTION_NOT_YET_LOADED}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => setNotLoadedDialogOpen(false)}
            autoFocus
          >
            OK
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
