import React from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import transactionService, {
  type Transaction,
} from "../../services/transactionService";
import customerService, { type Customer } from "../../services/customerService";
import { toPascalCase } from "../../utils/stringUtils";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../services/addonsPricingService";
import {
  getTransactionAmountDue as resolveTransactionAmountDue,
  getTransactionDiscount,
} from "../../utils/pricing";
import {
  getLoadsPickedUp,
  getRemainingLoads,
  hasAnyPickup,
  hasPartialPickup,
  isFullyPickedUp,
} from "../../utils/transactionPickup";

type TransactionWithLegacyFields = Transaction & {
  customerid?: string;
  datereceived?: string;
  dateloaded?: string;
  datepickup?: string;
  grandtotal?: number | string | null;
  loadsubtotal?: number | string | null;
  addonssubtotal?: number | string | null;
  deletereason?: string | null;
};

type PaymentWithLegacyFields = {
  amount?: number | string | null;
  mode?: string;
  paymentDate?: string;
  paymentdate?: string;
  createdAt?: string;
  createdat?: string;
};

const getTransactionFieldDate = (
  transaction: Transaction,
  field: "dateReceived" | "dateLoaded" | "datePickup",
): string | undefined => {
  const tx = transaction as TransactionWithLegacyFields;

  if (field === "dateReceived") {
    return transaction.dateReceived || tx.datereceived;
  }

  if (field === "dateLoaded") {
    return transaction.dateLoaded || tx.dateloaded;
  }

  return transaction.datePickup || tx.datepickup;
};

type RecordTypeFilter =
  | "all"
  | "with-balance"
  | "withdrawn"
  | "wrong-record"
  | "backdate-payment"
  | "backdate-pickup";

type StatusIncludeFilters = {
  pending: boolean;
  paid: boolean;
  unpaid: boolean;
  pickup: boolean;
  notPickup: boolean;
};

const DEFAULT_STATUS_INCLUDES: StatusIncludeFilters = {
  pending: true,
  paid: true,
  unpaid: true,
  pickup: true,
  notPickup: true,
};

type ExportColumnKey =
  | "dateReceived"
  | "customer"
  | "kg"
  | "load"
  | "price"
  | "dateLoaded"
  | "datePaid"
  | "datePickup";

const EXPORT_COLUMNS: Array<{ key: ExportColumnKey; label: string }> = [
  { key: "dateReceived", label: "Date Received" },
  { key: "customer", label: "Customer" },
  { key: "kg", label: "KG" },
  { key: "load", label: "Load" },
  { key: "price", label: "Price" },
  { key: "dateLoaded", label: "Date Loaded" },
  { key: "datePaid", label: "Date Paid (Latest)" },
  { key: "datePickup", label: "Date Pickup" },
];

const DEFAULT_EXPORT_COLUMNS: Record<ExportColumnKey, boolean> =
  EXPORT_COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = true;
      return acc;
    },
    {} as Record<ExportColumnKey, boolean>,
  );

const getTotalPaidAmount = (transaction: Transaction): number =>
  (transaction.paymentDetails ?? []).reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

const isPending = (transaction: Transaction): boolean =>
  !getTransactionFieldDate(transaction, "dateLoaded");

const isPickup = (transaction: Transaction): boolean =>
  hasAnyPickup(transaction);

/** Still has loads waiting to be picked up (includes partial pickup). */
const isNotPickup = (transaction: Transaction): boolean =>
  !isFullyPickedUp(transaction);

const isUnpaid = (transaction: Transaction): boolean => {
  const paymentRows = transaction.paymentDetails?.length ?? 0;
  if (paymentRows === 0) return true;
  return getTotalPaidAmount(transaction) === 0;
};

const isPaid = (
  transaction: Transaction,
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): boolean => {
  const totalPaid = getTotalPaidAmount(transaction);
  const total = getTransactionGrandTotal(transaction, addonsPricing);
  if (total <= 0) return totalPaid > 0;
  return totalPaid >= total;
};

const matchesStatusIncludes = (
  transaction: Transaction,
  filters: StatusIncludeFilters,
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): boolean => {
  if (isPending(transaction) && !filters.pending) return false;
  if (isPaid(transaction, addonsPricing) && !filters.paid) return false;
  if (isUnpaid(transaction) && !filters.unpaid) return false;

  if (filters.pickup || filters.notPickup) {
    const matchesPickupFilter =
      (isPickup(transaction) && filters.pickup) ||
      (isNotPickup(transaction) && filters.notPickup);
    if (!matchesPickupFilter) return false;
  }

  return true;
};

const hasAnyStatusInclude = (filters: StatusIncludeFilters): boolean =>
  filters.pending ||
  filters.paid ||
  filters.unpaid ||
  filters.pickup ||
  filters.notPickup;

const parseAmountFilter = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
};

const matchesAmountRange = (
  transaction: Transaction,
  amountMin: number | null,
  amountMax: number | null,
  addonsPricing: AddonsPricing,
): boolean => {
  const total = getTransactionGrandTotal(transaction, addonsPricing);
  if (amountMin != null && total < amountMin) return false;
  if (amountMax != null && total > amountMax) return false;
  return true;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  return dayjs(value).isValid() ? dayjs(value).format("MM-DD-YY h:mm A") : "-";
};

const getPaymentDate = (
  payment: PaymentWithLegacyFields,
): string | undefined => {
  return payment.paymentDate || payment.paymentdate;
};

const getPaymentCreatedDate = (
  payment: PaymentWithLegacyFields,
): string | undefined => {
  return payment.createdAt || payment.createdat || getPaymentDate(payment);
};

const isSameCalendarDay = (first?: string, second?: string): boolean => {
  if (!first || !second) return true;
  const firstDate = dayjs(first);
  const secondDate = dayjs(second);
  if (!firstDate.isValid() || !secondDate.isValid()) return true;
  return firstDate.format("YYYY-MM-DD") === secondDate.format("YYYY-MM-DD");
};

const formatAmount = (amount: number): string => {
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
};

const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getBalance = (
  transaction: Transaction,
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): number => {
  const total = getTransactionGrandTotal(transaction, addonsPricing);
  const paid =
    transaction.paymentDetails?.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    ) || 0;
  return Math.max(0, total - paid);
};

const getTotalKg = (transaction: Transaction): number => {
  return (
    transaction.loadDetails?.reduce(
      (sum, load) => sum + Number(load.kg || 0),
      0,
    ) || 0
  );
};

const getTotalLoads = (transaction: Transaction): number => {
  return (
    transaction.loadDetails?.reduce(
      (sum, load) => sum + Number(load.loads || 0),
      0,
    ) || 0
  );
};

const formatSummaryLoadDisplay = (transaction: Transaction): string => {
  if (hasPartialPickup(transaction)) {
    return `${getRemainingLoads(transaction)} (${getLoadsPickedUp(transaction)})`;
  }
  return String(getTotalLoads(transaction));
};

const renderSummaryLoadCell = (transaction: Transaction): React.ReactNode => {
  if (hasPartialPickup(transaction)) {
    return (
      <>
        {getRemainingLoads(transaction)}{" "}
        <Box component="span" sx={{ color: "#f44336" }}>
          ({getLoadsPickedUp(transaction)})
        </Box>
      </>
    );
  }
  return getTotalLoads(transaction);
};

// Returns the amount the customer owes after discount (net). Named
// "grandTotal" for historical call sites; every consumer here wants net.
const getTransactionGrandTotal = (
  transaction: Transaction,
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): number => {
  const tx = transaction as TransactionWithLegacyFields;
  return resolveTransactionAmountDue(
    {
      ...transaction,
      grandtotal: tx.grandtotal,
      loadsubtotal: tx.loadsubtotal,
      addonssubtotal: tx.addonssubtotal,
    },
    addonsPricing,
  );
};

const getDeleteReason = (transaction: Transaction): string => {
  const tx = transaction as TransactionWithLegacyFields;
  return (transaction.deleteReason || tx.deletereason || "").trim();
};

const getLatestPaymentDate = (transaction: Transaction): string | null => {
  if (!transaction.paymentDetails || transaction.paymentDetails.length === 0) {
    return null;
  }
  const latest = transaction.paymentDetails.reduce((prev, current) => {
    const currentDate = getPaymentDate(current as PaymentWithLegacyFields);
    const prevDate = getPaymentDate(prev as PaymentWithLegacyFields);
    return dayjs(currentDate).isAfter(dayjs(prevDate)) ? current : prev;
  });
  return getPaymentDate(latest as PaymentWithLegacyFields) || null;
};

const getPaymentHistory = (transaction: Transaction): string[] => {
  const payments = transaction.paymentDetails || [];
  return payments.map((payment) => {
    const p = payment as PaymentWithLegacyFields;
    const paidAt = dayjs(getPaymentDate(p)).format("MM-DD-YY h:mm A");
    return `${paidAt} - ${formatAmount(Number(p.amount || 0))} ${p.mode || ""}`.trim();
  });
};

const getTotalPaid = (transaction: Transaction): number => {
  const payments = transaction.paymentDetails || [];
  return payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
};

const hasBackdatePayment = (transaction: Transaction): boolean => {
  const payments = transaction.paymentDetails || [];
  return payments.some((payment) => {
    const datePaid = getPaymentDate(payment as PaymentWithLegacyFields);
    const createdDate = getPaymentCreatedDate(
      payment as PaymentWithLegacyFields,
    );
    if (!datePaid || !createdDate) return false;
    return !isSameCalendarDay(datePaid, createdDate);
  });
};

const hasBackdatePickup = (transaction: Transaction): boolean => {
  const pickupEvents =
    transaction.pickupDetails && transaction.pickupDetails.length > 0
      ? transaction.pickupDetails.map((pickup) => ({
          datePickup: pickup.pickupDate,
          datePickupModifiedAt: pickup.datePickupModifiedAt,
        }))
      : [
          {
            datePickup: getTransactionFieldDate(transaction, "datePickup"),
            datePickupModifiedAt: transaction.datePickupModifiedAt,
          },
        ];

  return pickupEvents.some((event) => {
    const { datePickup, datePickupModifiedAt } = event;
    if (!datePickup || !datePickupModifiedAt) return false;
    const pickupDate = dayjs(datePickup).startOf("day");
    const modifiedDate = dayjs(datePickupModifiedAt).startOf("day");
    return pickupDate.isBefore(modifiedDate);
  });
};

const matchesRecordTypeFilter = (
  transaction: Transaction,
  recordType: RecordTypeFilter,
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): boolean => {
  if (recordType === "all") return true;

  switch (recordType) {
    case "with-balance": {
      const total = getTransactionGrandTotal(transaction, addonsPricing);
      const totalPaid = getTotalPaidAmount(transaction);
      const paymentRows = transaction.paymentDetails?.length ?? 0;
      if (paymentRows < 1 || totalPaid <= 0) return false;
      return totalPaid < total;
    }
    case "backdate-payment":
      return hasBackdatePayment(transaction);
    case "backdate-pickup":
      return hasBackdatePickup(transaction);
    case "withdrawn":
      return getDeleteReason(transaction).toLowerCase() === "withdrawn";
    case "wrong-record":
      return getDeleteReason(transaction).toLowerCase() === "wrong record";
    default:
      return true;
  }
};

const TransactionSummary = () => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [addonsPricing, setAddonsPricing] = React.useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = React.useState<string | null>(
    null,
  );
  const [dateFrom, setDateFrom] = React.useState<Dayjs>(
    dayjs().subtract(30, "days"),
  );
  const [dateTo, setDateTo] = React.useState<Dayjs>(dayjs());
  const [allTime, setAllTime] = React.useState(false);
  const [recordTypeFilter, setRecordTypeFilter] =
    React.useState<RecordTypeFilter>("all");
  const [statusIncludes, setStatusIncludes] =
    React.useState<StatusIncludeFilters>(DEFAULT_STATUS_INCLUDES);
  const [amountMin, setAmountMin] = React.useState("");
  const [amountMax, setAmountMax] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportColumns, setExportColumns] = React.useState<
    Record<ExportColumnKey, boolean>
  >(DEFAULT_EXPORT_COLUMNS);
  const [sortColumn, setSortColumn] = React.useState<ExportColumnKey | null>(
    null,
  );
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc",
  );

  const handleSort = React.useCallback((column: ExportColumnKey) => {
    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        return prevColumn;
      }
      setSortDirection("asc");
      return column;
    });
    setPage(0);
  }, []);

  const noExportColumnsSelected = React.useMemo(
    () => EXPORT_COLUMNS.every((col) => !exportColumns[col.key]),
    [exportColumns],
  );

  const parsedAmountMin = React.useMemo(
    () => parseAmountFilter(amountMin),
    [amountMin],
  );
  const parsedAmountMax = React.useMemo(
    () => parseAmountFilter(amountMax),
    [amountMax],
  );

  // Reset page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [
    selectedCustomer,
    dateFrom,
    dateTo,
    allTime,
    recordTypeFilter,
    statusIncludes,
    amountMin,
    amountMax,
  ]);

  const statusIncludesActive = recordTypeFilter === "all";
  const noStatusIncludesSelected =
    statusIncludesActive && !hasAnyStatusInclude(statusIncludes);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [customerData, transactionData, pricing] = await Promise.all([
          customerService.getAll(),
          transactionService.getAll({ includeDeleted: true }),
          addonsPricingService.get(),
        ]);
        setCustomers(customerData);
        setTransactions(transactionData);
        setAddonsPricing(pricing);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load transaction summary.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredTransactions = React.useMemo(() => {
    let result = transactions;

    // Customer filter
    if (selectedCustomer) {
      result = result.filter((transaction) => {
        const tx = transaction as TransactionWithLegacyFields;
        return (transaction.customerId || tx.customerid) === selectedCustomer;
      });
    }

    // Date range filter (skipped when All Time is enabled)
    if (!allTime) {
      result = result.filter((transaction) => {
        const dateReceived = getTransactionFieldDate(
          transaction,
          "dateReceived",
        );
        if (!dateReceived) return false;
        const date = dayjs(dateReceived);
        return (
          !date.isBefore(dateFrom.startOf("day")) &&
          !date.isAfter(dateTo.endOf("day"))
        );
      });
    }

    const amountRangeValid =
      parsedAmountMin == null ||
      parsedAmountMax == null ||
      parsedAmountMax >= parsedAmountMin;

    if (noStatusIncludesSelected) {
      return [];
    }

    // Record type + status include filters
    result = result.filter((transaction) => {
      const isDeleted =
        transaction.isDeleted ||
        Boolean(
          (transaction as Transaction & { isdeleted?: boolean }).isdeleted,
        );

      if (recordTypeFilter === "withdrawn") {
        return (
          isDeleted &&
          getDeleteReason(transaction).toLowerCase() === "withdrawn"
        );
      }

      if (recordTypeFilter === "wrong-record") {
        return (
          isDeleted &&
          getDeleteReason(transaction).toLowerCase() === "wrong record"
        );
      }

      if (isDeleted) return false;

      if (recordTypeFilter !== "all") {
        if (
          !matchesRecordTypeFilter(
            transaction,
            recordTypeFilter,
            addonsPricing,
          )
        ) {
          return false;
        }
      } else if (
        !matchesStatusIncludes(transaction, statusIncludes, addonsPricing)
      ) {
        return false;
      }

      if (!amountRangeValid) return true;
      return matchesAmountRange(
        transaction,
        parsedAmountMin,
        parsedAmountMax,
        addonsPricing,
      );
    });

    return result;
  }, [
    transactions,
    selectedCustomer,
    dateFrom,
    dateTo,
    allTime,
    recordTypeFilter,
    statusIncludes,
    noStatusIncludesSelected,
    parsedAmountMin,
    parsedAmountMax,
    addonsPricing,
  ]);

  const getColumnSortValue = React.useCallback(
    (transaction: Transaction, column: ExportColumnKey): number | string => {
      const dateValue = (value?: string | null): number =>
        value && dayjs(value).isValid() ? dayjs(value).valueOf() : 0;

      switch (column) {
        case "dateReceived":
          return dateValue(
            getTransactionFieldDate(transaction, "dateReceived"),
          );
        case "customer":
          return toPascalCase(transaction.customer?.name || "").toLowerCase();
        case "kg":
          return getTotalKg(transaction);
        case "load":
          return getTotalLoads(transaction);
        case "price":
          return getTransactionGrandTotal(transaction, addonsPricing);
        case "dateLoaded":
          return dateValue(getTransactionFieldDate(transaction, "dateLoaded"));
        case "datePaid":
          return dateValue(getLatestPaymentDate(transaction));
        case "datePickup":
          return dateValue(getTransactionFieldDate(transaction, "datePickup"));
        default:
          return 0;
      }
    },
    [addonsPricing],
  );

  const sortedTransactions = React.useMemo(() => {
    if (!sortColumn) return filteredTransactions;
    const sorted = [...filteredTransactions].sort((a, b) => {
      const aValue = getColumnSortValue(a, sortColumn);
      const bValue = getColumnSortValue(b, sortColumn);
      let result = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue));
      }
      return sortDirection === "asc" ? result : -result;
    });
    return sorted;
  }, [filteredTransactions, sortColumn, sortDirection, getColumnSortValue]);

  const paginatedTransactions = React.useMemo(() => {
    return sortedTransactions.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [sortedTransactions, page, rowsPerPage]);

  const filterSummary = React.useMemo(() => {
    const list = filteredTransactions;
    const customerIds = new Set<string>();
    let totalLoads = 0;
    let totalKg = 0;
    let totalPrice = 0;
    let totalPaid = 0;
    let totalUnpaidBalance = 0;
    let totalDiscount = 0;
    let pickedUpCount = 0;
    let notPickedUpCount = 0;

    for (const t of list) {
      const tx = t as TransactionWithLegacyFields;
      const cid = t.customerId || tx.customerid;
      if (cid) customerIds.add(String(cid));

      totalLoads += getTotalLoads(t);
      totalKg += getTotalKg(t);
      totalPrice += getTransactionGrandTotal(t, addonsPricing);
      totalPaid += getTotalPaid(t);
      totalUnpaidBalance += getBalance(t, addonsPricing);
      totalDiscount += getTransactionDiscount(t);

      if (isFullyPickedUp(t)) pickedUpCount += 1;
      else notPickedUpCount += 1;
    }

    return {
      transactionCount: list.length,
      distinctCustomers: customerIds.size,
      totalLoads,
      totalKg,
      totalPrice,
      totalPaid,
      totalUnpaidBalance,
      totalDiscount,
      pickedUpCount,
      notPickedUpCount,
    };
  }, [filteredTransactions, addonsPricing]);

  const handlePageChange = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportToExcel = React.useCallback(() => {
    if (sortedTransactions.length === 0) return;

    const selectedColumns = EXPORT_COLUMNS.filter(
      (col) => exportColumns[col.key],
    );
    if (selectedColumns.length === 0) return;

    const headers = selectedColumns.map((col) => col.label);

    const toCsvCell = (value: unknown): string => {
      const s = value == null ? "" : String(value);
      const needsQuotes = /[",\r\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const rows = sortedTransactions.map((transaction) => {
      const dateReceived = getTransactionFieldDate(
        transaction,
        "dateReceived",
      );
      const dateLoaded = getTransactionFieldDate(transaction, "dateLoaded");
      const datePickup = getTransactionFieldDate(transaction, "datePickup");
      const datePaid = getLatestPaymentDate(transaction);

      const cellByKey: Record<ExportColumnKey, string | number> = {
        dateReceived: formatDateTime(dateReceived),
        customer: toPascalCase(transaction.customer?.name || "-"),
        kg: getTotalKg(transaction).toFixed(2),
        load: formatSummaryLoadDisplay(transaction),
        price: formatCurrency(
          getTransactionGrandTotal(transaction, addonsPricing),
        ),
        dateLoaded: formatDateTime(dateLoaded),
        datePaid: datePaid ? formatDateTime(datePaid) : "-",
        datePickup: formatDateTime(datePickup),
      };

      return selectedColumns.map((col) => cellByKey[col.key]);
    });

    const csvLines = [
      headers.map(toCsvCell).join(","),
      ...rows.map((r) => r.map(toCsvCell).join(",")),
    ];
    const csv = csvLines.join("\r\n");

    // Excel is more reliable with BOM for UTF-8.
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const fileName = allTime
      ? `TransactionSummary_AllTime.csv`
      : `TransactionSummary_${dateFrom.format(
          "YYYY-MM-DD",
        )}_to_${dateTo.format("YYYY-MM-DD")}.csv`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  }, [sortedTransactions, dateFrom, dateTo, allTime, addonsPricing, exportColumns]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Transaction Summary
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Stack spacing={2}>
          <Grid container spacing={2} alignItems="flex-end">
            {/* Customer */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => option.name}
                value={customers.find((c) => c.id === selectedCustomer) || null}
                onChange={(_, value) => setSelectedCustomer(value?.id || null)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Customer"
                    size="small"
                    placeholder="Search customer..."
                  />
                )}
              />
            </Grid>

            {/* Date Range */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="From Date"
                  value={dateFrom}
                  disabled={allTime}
                  onChange={(value) =>
                    setDateFrom((prev) => {
                      const next = value || prev;
                      const today = dayjs().endOf("day");
                      const bounded = next.isAfter(today) ? today : next;
                      setDateTo((currentTo) =>
                        currentTo.isBefore(bounded) ? bounded : currentTo,
                      );
                      return bounded;
                    })
                  }
                  maxDate={dayjs()}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="To Date"
                    value={dateTo}
                    disabled={allTime}
                    onChange={(value) =>
                      setDateTo(() => {
                        const next = value || dayjs();
                        const today = dayjs().endOf("day");
                        if (next.isAfter(today)) return today;
                        if (next.isBefore(dateFrom)) return dateFrom;
                        return next;
                      })
                    }
                    minDate={dateFrom}
                    maxDate={dayjs()}
                    slotProps={{
                      textField: { size: "small", fullWidth: true },
                    }}
                  />
                </LocalizationProvider>
                <FormControlLabel
                  sx={{ whiteSpace: "nowrap", mr: 0 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={allTime}
                      onChange={(e) => setAllTime(e.target.checked)}
                    />
                  }
                  label="All Time"
                />
              </Stack>
            </Grid>
          </Grid>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            flexWrap="wrap"
            useFlexGap
          >
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Record type</InputLabel>
              <Select
                value={recordTypeFilter}
                label="Record type"
                onChange={(e) =>
                  setRecordTypeFilter(e.target.value as RecordTypeFilter)
                }
              >
                <MenuItem value="all">All Records</MenuItem>
                <MenuItem value="with-balance">With balance</MenuItem>
                <MenuItem value="backdate-payment">Backdate payment</MenuItem>
                <MenuItem value="backdate-pickup">Backdate pickup</MenuItem>
                <MenuItem value="withdrawn">Withdrawn</MenuItem>
                <MenuItem value="wrong-record">Wrong Record</MenuItem>
              </Select>
            </FormControl>

            <FormControl
              component="fieldset"
              variant="standard"
              disabled={!statusIncludesActive}
              sx={{ minWidth: 0 }}
            >
              <Typography
                component="legend"
                variant="caption"
                sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5 }}
              >
                Include
              </Typography>
              <FormGroup row sx={{ gap: { xs: 0, sm: 1 } }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={statusIncludes.pending}
                      onChange={(e) =>
                        setStatusIncludes((prev) => ({
                          ...prev,
                          pending: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Pending"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={statusIncludes.paid}
                      onChange={(e) =>
                        setStatusIncludes((prev) => ({
                          ...prev,
                          paid: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Paid"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={statusIncludes.unpaid}
                      onChange={(e) =>
                        setStatusIncludes((prev) => ({
                          ...prev,
                          unpaid: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Unpaid"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={statusIncludes.pickup}
                      onChange={(e) =>
                        setStatusIncludes((prev) => ({
                          ...prev,
                          pickup: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Pickup"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={statusIncludes.notPickup}
                      onChange={(e) =>
                        setStatusIncludes((prev) => ({
                          ...prev,
                          notPickup: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Not picked up"
                />
              </FormGroup>
              {!statusIncludesActive ? (
                <FormHelperText>
                  Status checkboxes apply only for All Records.
                </FormHelperText>
              ) : noStatusIncludesSelected ? (
                <FormHelperText error>
                  Select at least one status to show transactions.
                </FormHelperText>
              ) : null}
            </FormControl>

            <TextField
              label="Min amount"
              size="small"
              type="number"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
              sx={{ width: { xs: "100%", sm: 140 } }}
            />
            <TextField
              label="Max amount"
              size="small"
              type="number"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
              sx={{ width: { xs: "100%", sm: 140 } }}
              error={
                parsedAmountMin != null &&
                parsedAmountMax != null &&
                parsedAmountMax < parsedAmountMin
              }
              helperText={
                parsedAmountMin != null &&
                parsedAmountMax != null &&
                parsedAmountMax < parsedAmountMin
                  ? "Max must be ≥ min"
                  : undefined
              }
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : noStatusIncludesSelected ? (
        <Alert severity="warning">
          Select at least one status under Include to show transactions.
        </Alert>
      ) : filteredTransactions.length === 0 ? (
        <Alert severity="info">No transactions found.</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              p: 1.5,
              pb: 0,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={() => setExportDialogOpen(true)}
            >
              Export to excel
            </Button>
          </Box>

          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell
                  sx={{ fontWeight: 600 }}
                  sortDirection={
                    sortColumn === "dateReceived" ? sortDirection : false
                  }
                >
                  <TableSortLabel
                    active={sortColumn === "dateReceived"}
                    direction={
                      sortColumn === "dateReceived" ? sortDirection : "asc"
                    }
                    onClick={() => handleSort("dateReceived")}
                  >
                    Date Received
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600 }}
                  sortDirection={
                    sortColumn === "customer" ? sortDirection : false
                  }
                >
                  <TableSortLabel
                    active={sortColumn === "customer"}
                    direction={
                      sortColumn === "customer" ? sortDirection : "asc"
                    }
                    onClick={() => handleSort("customer")}
                  >
                    Customer
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600 }}
                  sortDirection={sortColumn === "kg" ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortColumn === "kg"}
                    direction={sortColumn === "kg" ? sortDirection : "asc"}
                    onClick={() => handleSort("kg")}
                  >
                    KG
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600 }}
                  sortDirection={sortColumn === "load" ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortColumn === "load"}
                    direction={sortColumn === "load" ? sortDirection : "asc"}
                    onClick={() => handleSort("load")}
                  >
                    Load
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600 }}
                  sortDirection={sortColumn === "price" ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortColumn === "price"}
                    direction={sortColumn === "price" ? sortDirection : "asc"}
                    onClick={() => handleSort("price")}
                  >
                    Price
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600 }}
                  sortDirection={
                    sortColumn === "dateLoaded" ? sortDirection : false
                  }
                >
                  <TableSortLabel
                    active={sortColumn === "dateLoaded"}
                    direction={
                      sortColumn === "dateLoaded" ? sortDirection : "asc"
                    }
                    onClick={() => handleSort("dateLoaded")}
                  >
                    Date Loaded
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600 }}
                  sortDirection={
                    sortColumn === "datePaid" ? sortDirection : false
                  }
                >
                  <TableSortLabel
                    active={sortColumn === "datePaid"}
                    direction={
                      sortColumn === "datePaid" ? sortDirection : "asc"
                    }
                    onClick={() => handleSort("datePaid")}
                  >
                    <Tooltip title="Date Paid - Latest payment date">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        Date Paid
                        <InfoOutlinedIcon sx={{ fontSize: "16px" }} />
                      </Box>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600 }}
                  sortDirection={
                    sortColumn === "datePickup" ? sortDirection : false
                  }
                >
                  <TableSortLabel
                    active={sortColumn === "datePickup"}
                    direction={
                      sortColumn === "datePickup" ? sortDirection : "asc"
                    }
                    onClick={() => handleSort("datePickup")}
                  >
                    Date Pickup
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTransactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  hover
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  <TableCell>
                    {formatDateTime(
                      getTransactionFieldDate(transaction, "dateReceived"),
                    )}
                  </TableCell>
                  <TableCell>
                    {toPascalCase(transaction.customer?.name || "-")}
                  </TableCell>
                  <TableCell align="right">
                    {getTotalKg(transaction).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {renderSummaryLoadCell(transaction)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(
                      getTransactionGrandTotal(transaction, addonsPricing),
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(
                      getTransactionFieldDate(transaction, "dateLoaded"),
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const datePaid = getLatestPaymentDate(transaction);
                      if (!datePaid) return "-";

                      const paymentHistory = getPaymentHistory(transaction);
                      const totalPaid = getTotalPaid(transaction);
                      const totalPrice = getTransactionGrandTotal(
                        transaction,
                        addonsPricing,
                      );
                      const hasBalance =
                        totalPaid > 0 && totalPaid < totalPrice;
                      const hasPaidOrOver = totalPaid >= totalPrice;
                      const balanceAmount = Math.max(totalPrice - totalPaid, 0);
                      const overAmount = Math.max(totalPaid - totalPrice, 0);
                      const discountAmount =
                        getTransactionDiscount(transaction);

                      const tooltipTitle = (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.25,
                          }}
                        >
                          {paymentHistory.map((paymentLine, index) => (
                            <span key={`${transaction.id}-payment-${index}`}>
                              {paymentLine}
                            </span>
                          ))}
                          {discountAmount > 0 ? (
                            <span style={{ color: "#f44336", fontWeight: 600 }}>
                              Discount - {formatAmount(discountAmount)}
                            </span>
                          ) : null}
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

                      return (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                          }}
                        >
                          <span>{formatDateTime(datePaid)}</span>
                          {hasBalance ? (
                            <Tooltip title={tooltipTitle} arrow>
                              <Box
                                component="span"
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  height: 16,
                                }}
                              >
                                <WarningAmberIcon
                                  sx={{
                                    color: "#f44336",
                                    fontSize: 16,
                                    display: "block",
                                    verticalAlign: "middle",
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
                                  height: 16,
                                }}
                              >
                                <InfoOutlinedIcon
                                  sx={{
                                    color: "#4caf50",
                                    fontSize: 16,
                                    display: "block",
                                    verticalAlign: "middle",
                                  }}
                                />
                              </Box>
                            </Tooltip>
                          ) : null}
                        </Box>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(
                      getTransactionFieldDate(transaction, "datePickup"),
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[20, 50, 100]}
            component="div"
            count={filteredTransactions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TableContainer>
      )}

      {!loading ? (
        <Paper sx={{ p: 2.5, mt: 1 }} variant="outlined">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {allTime
              ? "All Time"
              : `${dateFrom.format("MMM D, YYYY")} to ${dateTo.format(
                  "MMM D, YYYY",
                )}`}{" "}
            summary
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            Based on the current filters (same scope as the table, not only the
            visible page).
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Grid container spacing={1.5} columns={{ xs: 12, sm: 12 }}>
            {[
              ["Total transactions", String(filterSummary.transactionCount)],
              [
                "Total customers (distinct)",
                String(filterSummary.distinctCustomers),
              ],
              ["Total loads", formatAmount(filterSummary.totalLoads)],
              ["Total kg", filterSummary.totalKg.toFixed(2)],
              ["Total price", formatCurrency(filterSummary.totalPrice)],
              ["Total discount", formatCurrency(filterSummary.totalDiscount)],
              ["Total amount paid", formatCurrency(filterSummary.totalPaid)],
              [
                "Total unpaid (balances)",
                formatCurrency(filterSummary.totalUnpaidBalance),
              ],
              ["Picked up (count)", String(filterSummary.pickedUpCount)],
              ["Not picked up (count)", String(filterSummary.notPickedUpCount)],
            ].map(([label, value]) => (
              <Grid size={{ xs: 12, sm: 6 }} key={label}>
                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {value}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Paper>
      ) : null}

      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Select columns to export</DialogTitle>
        <DialogContent>
          <FormGroup>
            {EXPORT_COLUMNS.map((col) => (
              <FormControlLabel
                key={col.key}
                control={
                  <Checkbox
                    size="small"
                    checked={exportColumns[col.key]}
                    onChange={(e) =>
                      setExportColumns((prev) => ({
                        ...prev,
                        [col.key]: e.target.checked,
                      }))
                    }
                  />
                }
                label={col.label}
              />
            ))}
          </FormGroup>
          {noExportColumnsSelected ? (
            <FormHelperText error>
              Select at least one column to export.
            </FormHelperText>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setExportDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleExportToExcel}
            disabled={noExportColumnsSelected}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionSummary;
