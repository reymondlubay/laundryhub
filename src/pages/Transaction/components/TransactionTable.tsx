import React, { useMemo, useState, useEffect } from "react";
import {
  Tooltip,
  Chip,
  Stack,
  Divider,
  Box,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaidIcon from "@mui/icons-material/Paid";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";

import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, colorSchemeLightWarm } from "ag-grid-community";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";

import { useThemeContext } from "../../../components/ThemeContext/ThemeContext";
import transactionService, {
  type Transaction,
} from "../../../services/transactionService";
import "./TransactionTable.css";

ModuleRegistry.registerModules([AllCommunityModule]);

interface FlatTransactionRow {
  id: string;
  transactionId: string;
  isFirstRow: boolean;
  isLastRow: boolean;
  dateReceived: string | null;
  customer: string;
  loadType: string;
  kg: number;
  loads: number;
  price: number | null;
  datePaid: string | null;
  datePickup: string | null;
  notes: string;
  releasedBy: string;
  action: string;
}

/**
 * Flatten a transaction into multiple visual rows (one row per load detail)
 * while keeping transaction-level fields on the first row only.
 */
function flattenTransactionRows(
  transaction: Transaction,
): FlatTransactionRow[] {
  const tx = transaction as Transaction & {
    datereceived?: string;
    datepickup?: string;
  };

  const transactionId = transaction.id;
  const dateReceived = tx.dateReceived || tx.datereceived || null;
  const datePickup = tx.datePickup || tx.datepickup || null;
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
  const totalPrice = loadDetails.reduce(
    (sum: number, load: { price?: number | string | null }) =>
      sum + Number(load.price || 0),
    0,
  );

  // Get latest payment date if payments exist
  const payments = transaction.paymentDetails || [];
  const datePaid =
    payments.length > 0
      ? dayjs(payments[payments.length - 1].paymentDate).toISOString()
      : null;

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
        dateReceived,
        customer: customerName,
        loadType: "",
        kg: totalKg,
        loads: totalLoads,
        price: totalPrice,
        datePaid,
        datePickup,
        notes: transaction.notes || "-",
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
      dateReceived: isFirstRow ? dateReceived : null,
      customer: customerName,
      loadType: type,
      kg: Number(load.kg || 0),
      loads: Number(load.loads || 0),
      price: isFirstRow ? totalPrice : null,
      datePaid: isFirstRow ? datePaid : null,
      datePickup: isFirstRow ? datePickup : null,
      notes: isFirstRow ? transaction.notes || "-" : "",
      releasedBy: isFirstRow ? releasedBy : "",
      action: "",
    };
  });
}

const TransactionTable: React.FC = () => {
  const { darkMode } = useThemeContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions on component mount
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await transactionService.getAll();
        setTransactions(response);
      } catch (err: unknown) {
        console.error("Failed to fetch transactions:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load transactions";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const rowData = useMemo<FlatTransactionRow[]>(
    () => transactions.flatMap(flattenTransactionRows),
    [transactions],
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
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
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
        headerName: "Customer",
        field: "customer",
        width: 150,

        filter: true,
        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              lineHeight: 1.25,
              py: 0.25,
            }}
          >
            <span>{params.data?.customer || "-"}</span>
            {params.data?.loadType ? (
              <span style={{ opacity: 0.7 }}>({params.data.loadType})</span>
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
        headerName: "Date Paid",
        field: "datePaid",
        width: 130,
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
                alignItems: "center",
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
        width: 150,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow) return "";

          return (
            <Chip
              label={params.value || "-"}
              color={
                params.value?.toString().toLowerCase().includes("express")
                  ? "error"
                  : "success"
              }
              size="small"
            />
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
        width: 250,
        suppressMovable: true,
        cellStyle: {
          alignContent: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        cellRenderer: (params: ICellRendererParams<FlatTransactionRow>) => {
          if (!params.data?.isFirstRow) return "";

          return (
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              alignItems="center"
              alignContent="center"
            >
              <Tooltip title="Mark as Loaded">
                <IconButton aria-label="delete" color="primary">
                  <CheckCircleIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Mark as Paid">
                <IconButton aria-label="mark-as-paid" color="primary">
                  <PaidIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Mark as Picked Up" color="primary">
                <IconButton aria-label="picked-up">
                  <AssignmentTurnedInIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <Tooltip title="Edit">
                <IconButton aria-label="edit" color="success">
                  <EditIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete">
                <IconButton aria-label="delete" color="error">
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<FlatTransactionRow>>(
    () => ({
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
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

  const getRowHeight = () => 52;

  // Show loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "85vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <div
      className="transaction-grouped-grid"
      style={{ height: "85vh", width: "100%" }}
    >
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
    </div>
  );
};

export default TransactionTable;
