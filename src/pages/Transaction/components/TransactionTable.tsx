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

ModuleRegistry.registerModules([AllCommunityModule]);

interface LaundryRow {
  id: string;
  dateReceived: string | null;
  customer: string;
  kg: number;
  loads: number;
  price: number;
  datePaid: string | null;
  datePickup: string | null;
  notes: string;
  releasedBy: string;
  action: string;
}

/**
 * Map transaction backend response to LaundryRow UI format
 */
function mapTransactionToRow(transaction: Transaction): LaundryRow {
  const tx = transaction as Transaction & {
    datereceived?: string;
    datepickup?: string;
  };
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

  return {
    id: transaction.id,
    dateReceived: tx.dateReceived || tx.datereceived || null,
    customer: transaction.customer?.name || "Unknown",
    kg: totalKg,
    loads: totalLoads,
    price: totalPrice,
    datePaid,
    datePickup: tx.datePickup || tx.datepickup || null,
    notes: transaction.notes || "-",
    releasedBy,
    action: "",
  };
}

const TransactionTable: React.FC = () => {
  const { darkMode } = useThemeContext();
  const [rowData, setRowData] = useState<LaundryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions on component mount
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        const transactions = await transactionService.getAll();
        const rows = transactions.map(mapTransactionToRow);
        setRowData(rows);
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

  const themeDarkWarm = themeQuartz.withPart(
    darkMode ? colorSchemeDark : colorSchemeLightWarm,
  );

  const columnDefs = useMemo<ColDef<LaundryRow>[]>(
    () => [
      {
        headerName: "Date Received",
        field: "dateReceived",
        width: 140,

        sortable: false,
        suppressMovable: true,
        wrapText: true, // Enable text wrapping and new line display
        autoHeight: true, // Ensure row height adjusts to wrapped text
        cellRenderer: (params: ICellRendererParams<LaundryRow>) =>
          params.value ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: 0.5,
                lineHeight: 1.5,
              }}
            >
              <span>{dayjs(params.value).format("MM-DD-YY")}</span>
              <span>{dayjs(params.value).format("h:mm A")}</span>
            </Box>
          ) : (
            "-"
          ),
      },
      {
        headerName: "Customer",
        field: "customer",
        width: 150,

        filter: true,
        sortable: false,
        suppressMovable: true,
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
        cellRenderer: (params: ICellRendererParams<LaundryRow>) =>
          `₱${params.value}`,
      },
      {
        headerName: "Date Paid",
        field: "datePaid",
        width: 130,
        sortable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<LaundryRow>) =>
          params.value ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: 0.5,
                lineHeight: 1.5,
              }}
            >
              <span>{dayjs(params.value).format("MM-DD-YY")}</span>
              <span>{dayjs(params.value).format("h:mm A")}</span>
            </Box>
          ) : (
            "-"
          ),
      },
      {
        headerName: "Date Pickup",
        field: "datePickup",
        sortable: false,
        width: 130,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<LaundryRow>) =>
          params.value ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: 0.5,
                lineHeight: 1.5,
              }}
            >
              <span>{dayjs(params.value).format("MM-DD-YY")}</span>
              <span>{dayjs(params.value).format("h:mm A")}</span>
            </Box>
          ) : (
            "-"
          ),
      },
      {
        headerName: "Notes",
        field: "notes",
        sortable: false,
        width: 150,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<LaundryRow>) => (
          <Chip
            label={params.value}
            color={
              params.value?.toString().toLowerCase().includes("express")
                ? "error"
                : "success"
            }
            size="small"
          />
        ),
      },
      {
        headerName: "Released By",
        field: "releasedBy",
        width: 120,
        suppressMovable: true,
        sortable: false,
      },
      {
        headerName: "Action",
        field: "action",
        sortable: false,
        pinned: "right",
        width: 250,
        suppressMovable: true,
        cellStyle: { alignContent: "center" },
        cellRenderer: () => (
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
        ),
      },
    ],
    [],
  );

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
    <div style={{ height: "85vh", width: "100%" }}>
      <AgGridReact<LaundryRow>
        theme={themeDarkWarm}
        rowData={rowData}
        columnDefs={columnDefs}
        animateRows
        pagination={true}
      />
    </div>
  );
};

export default TransactionTable;
