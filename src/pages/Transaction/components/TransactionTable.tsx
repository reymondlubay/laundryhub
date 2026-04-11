import React, { useMemo, useState, useCallback } from "react";
import {
  Tooltip,
  Stack,
  Box,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import dayjs from "dayjs";

import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, colorSchemeLightWarm } from "ag-grid-community";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";

import { useThemeContext } from "../../../components/ThemeContext/ThemeContext";
import transactionService from "../../../services/transactionService";
import type { Transaction } from "../../../services/transactionService";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../../services/addonsPricingService";
import {
  CONFIRM_MESSAGES,
  EMPTY_STATES,
  UI_TEXT,
} from "../../../constants/messages";
import ConfirmDialog from "../../../components/ConfirmDialog/ConfirmDialog.tsx";
import { getAddonsTotal, getStoredSnapshots } from "../../../utils/pricing";
import "./TransactionTable.css";

ModuleRegistry.registerModules([AllCommunityModule]);

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

/**
 * Flatten a transaction into multiple visual rows (one row per load detail)
 * while keeping transaction-level fields on the first row only.
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
  const customerName = transaction.customer?.name || "Unknown";

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
      },
    ];
  }

  return loadDetails.map((load, index) => {
    const type = load.type || "Load";
    const isFirstRow = index === 0;

    return {
      id: `${transactionId}-${load.id || index}`,
      transactionId,
      isFirstRow,
      isLastRow: index === loadDetails.length - 1,
      hasDateLoaded,
      hasEstimatedPickup,
      hasDatePickup,
      dateReceived: isFirstRow ? dateReceived : null,
      dateLoaded: isFirstRow ? dateLoaded : null,
      estimatedPickup: isFirstRow ? estimatedPickup : null,
      customer: customerName,
      loadType: type,
      kg: Number(load.kg || 0),
      loads: Number(load.loads || 0),
      price: isFirstRow ? totalPrice : null,
      totalPaid: isFirstRow ? totalPaid : null,
      balance: isFirstRow ? balance : null,
      paymentHistory: isFirstRow ? paymentHistory : [],
      datePaid: isFirstRow ? datePaid : null,
      datePickup: isFirstRow ? datePickup : null,
      notes: isFirstRow ? transaction.notes || "-" : "",
      whitePrice: isFirstRow ? whitePrice : 0,
      fabconQty: isFirstRow ? fabconQty : 0,
      detergentQty: isFirstRow ? detergentQty : 0,
      colorSafeQty: isFirstRow ? colorSafeQty : 0,
      isDelivered: isFirstRow ? isDelivered : false,
      releasedBy: isFirstRow ? releasedBy : "",
      action: "",
    };
  });
}

type TransactionTableProps = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleted?: () => void;
};

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading,
  error,
  onEditTransaction,
  onDeleted,
}) => {
  const { darkMode } = useThemeContext();
  const [addonsPricing, setAddonsPricing] = useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(
    null,
  );

  const handleDeleteTransactionClick = useCallback((transactionId: string) => {
    setDeleteError(null);
    setDeleteTransactionId(transactionId);
  }, []);

  const handleDeleteTransactionConfirm = useCallback(async () => {
    if (!deleteTransactionId) return;

    try {
      await transactionService.delete(deleteTransactionId);
      setDeleteTransactionId(null);
      onDeleted?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete transaction";
      setDeleteError(message);
    }
  }, [deleteTransactionId, onDeleted]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTx = a as Transaction & {
        datereceived?: string;
        estimatedpickup?: string;
        datepickup?: string;
      };
      const bTx = b as Transaction & {
        datereceived?: string;
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

        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) =>
          params.data?.isFirstRow && params.value ? (
            <Box
              sx={{
                ...getStatusCellStyle(params.data),
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                width: "100%",
                padding: 0.5,
                px: 1,
                lineHeight: 1.5,
                borderRadius: 1,
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
        width: 220,

        filter: true,
        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              lineHeight: 1.25,
              py: 0.25,
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <span>{params.data?.customer || "-"}</span>
              {params.data?.loadType ? (
                <span style={{ opacity: 0.7 }}>({params.data.loadType})</span>
              ) : null}
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
                    color: "#f44336",
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 16 }} />
                </Box>
              </Tooltip>
            ) : null}
          </Box>
        ),
      },
      {
        headerName: "KG",
        field: "kg",
        width: 60,

        sortable: false,
        suppressMovable: true,
      },
      {
        headerName: "Load",
        field: "loads",
        width: 70,

        sortable: false,
        suppressMovable: true,
      },
      {
        headerName: "Price",
        field: "price",
        width: 100,

        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow || params.value == null) return "";
          return `₱${Number(params.value).toFixed(2)}`;
        },
      },
      {
        headerName: "Date Loaded",
        field: "dateLoaded",
        width: 130,
        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) =>
          params.data?.isFirstRow && params.value ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: 0.5,
                lineHeight: 1.5,
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
        width: 130,
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

          return (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: 0.5,
                lineHeight: 1.5,
                width: "100%",
              }}
            >
              <span>{dayjs(params.value).format("MM-DD-YY")}</span>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  gap: 1,
                  minHeight: 22,
                }}
              >
                <span>{dayjs(params.value).format("h:mm A")}</span>
                <Box
                  component="span"
                  sx={{
                    width: 20,
                    height: 20,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
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
              </Box>
            </Box>
          );
        },
      },
      {
        headerName: "Date Pickup",
        field: "datePickup",
        sortable: false,
        width: 130,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) =>
          params.data?.isFirstRow && params.value ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: 0.5,
                lineHeight: 1.5,
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
          const {
            whitePrice,
            fabconQty,
            detergentQty,
            colorSafeQty,
            isDelivered,
          } = params.data;
          const noteText =
            params.value && params.value !== "-" ? String(params.value) : "";
          const details: string[] = [];

          if (isDelivered) details.push("Delivery");
          if (whitePrice > 0)
            details.push(`Add White +${formatAmount(whitePrice)}`);
          if (fabconQty > 0) details.push(`Fabcon x${fabconQty}`);
          if (detergentQty > 0) details.push(`Detergent x${detergentQty}`);
          if (colorSafeQty > 0) details.push(`Color Safe x${colorSafeQty}`);
          if (noteText) details.push(`Notes ${noteText}`);

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
        width: 120,
        suppressMovable: true,
        cellStyle: {
          alignContent: "flex-start",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        },
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow) return "";

          return (
            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-start"
              alignItems="center"
              alignContent="center"
            >
              <Tooltip title="Edit">
                <IconButton
                  aria-label="edit"
                  color="success"
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
                  color="error"
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
    [onEditTransaction, transactions, handleDeleteTransactionClick],
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

  const getRowHeight = () => 72;

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
            getRowClass={getRowClass}
            getRowHeight={getRowHeight}
            animateRows
            pagination={true}
          />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTransactionId)}
        title="Confirm Delete"
        message={CONFIRM_MESSAGES.DELETE_TRANSACTION}
        confirmText={UI_TEXT.DELETE}
        onClose={() => setDeleteTransactionId(null)}
        onConfirm={handleDeleteTransactionConfirm}
      />
    </>
  );
};

export default TransactionTable;
