import React, { useMemo } from "react";
import {
  Button,
  Tooltip,
  Chip,
  Stack,
  Divider,
  Box,
  IconButton,
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

import { useThemeContext } from "../../components/ThemeContext/ThemeContext";

ModuleRegistry.registerModules([AllCommunityModule]);

interface LaundryRow {
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

const TransactionTable: React.FC = () => {
  const { darkMode } = useThemeContext();

  const themeDarkWarm = themeQuartz.withPart(
    darkMode ? colorSchemeDark : colorSchemeLightWarm
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
    []
  );

  const rowData: LaundryRow[] = Array.from({ length: 1000 }, (_, i) => {
    const baseDate = dayjs().subtract(i, "day");
    return {
      dateReceived: baseDate.toISOString(),
      customer: `Customer ${i + 1}`,
      kg: Math.floor(Math.random() * 10) + 1, // 1–10 kg
      loads: Math.ceil(Math.random() * 3), // 1–3 loads
      price: Math.floor(Math.random() * 400) + 100, // ₱100–₱500
      datePaid:
        Math.random() > 0.3 ? baseDate.add(1, "hour").toISOString() : null,
      datePickup:
        Math.random() > 0.5 ? baseDate.add(8, "hour").toISOString() : null,
      notes: Math.random() > 0.5 ? "Express" : "Fold Only",
      releasedBy: Math.random() > 0.5 ? "Bianca" : "Reymond",
      action: "",
    };
  });

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
