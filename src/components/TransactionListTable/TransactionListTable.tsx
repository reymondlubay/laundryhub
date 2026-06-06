import React, { useMemo } from "react";
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import type { Transaction } from "../../services/transactionService";
import type { AddonsPricing } from "../../services/addonsPricingService";
import { DEFAULT_ADDONS_PRICING } from "../../services/addonsPricingService";
import {
  buildTransactionListRow,
  formatTransactionListCell,
  type TransactionListRow,
} from "../../utils/transactionListRow";
import {
  TableHeaderSkeleton,
  TableSkeleton,
} from "../Skeletons/SkeletonComponents";

type BaseColumnKey =
  | "dateReceived"
  | "customer"
  | "kg"
  | "loads"
  | "price"
  | "dateLoaded"
  | "datePaid"
  | "datePickup";

const BASE_COLUMNS: Array<{ key: BaseColumnKey; label: string }> = [
  { key: "dateReceived", label: "Date Received" },
  { key: "customer", label: "Customer" },
  { key: "kg", label: "KG" },
  { key: "loads", label: "Load" },
  { key: "price", label: "Price" },
  { key: "dateLoaded", label: "Date Loaded" },
  { key: "datePaid", label: "Date Paid (Latest)" },
  { key: "datePickup", label: "Date Pickup" },
];

export type TransactionListTableProps = {
  transactions: Transaction[];
  addonsPricing?: AddonsPricing;
  loading?: boolean;
  emptyMessage?: string;
  showDeletedDate?: boolean;
  renderActions?: (row: TransactionListRow) => React.ReactNode;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  title?: string;
};

const TransactionListTable: React.FC<TransactionListTableProps> = ({
  transactions,
  addonsPricing = DEFAULT_ADDONS_PRICING,
  loading = false,
  emptyMessage = "No transactions found.",
  showDeletedDate = false,
  renderActions,
  page = 0,
  rowsPerPage = 25,
  onPageChange,
  onRowsPerPageChange,
  title,
}) => {
  const rows = useMemo(
    () =>
      transactions.map((transaction) =>
        buildTransactionListRow(transaction, addonsPricing),
      ),
    [transactions, addonsPricing],
  );

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const columnCount =
    BASE_COLUMNS.length + (showDeletedDate ? 1 : 0) + (renderActions ? 1 : 0);

  return (
    <Box>
      {title ? (
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
          {title}
        </Typography>
      ) : null}

      {loading ? (
        <TableContainer>
          <Table size="small">
            <TableHeaderSkeleton columns={columnCount} />
            <TableSkeleton columns={columnCount} rows={5} />
          </Table>
        </TableContainer>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {BASE_COLUMNS.map((column) => (
                    <TableCell key={column.key}>{column.label}</TableCell>
                  ))}
                  {showDeletedDate ? (
                    <TableCell>Deleted Date</TableCell>
                  ) : null}
                  {renderActions ? <TableCell align="right">Actions</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>
                      <Typography variant="body2" color="text.secondary">
                        {emptyMessage}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow key={row.id} hover>
                      {BASE_COLUMNS.map((column) => (
                        <TableCell key={column.key}>
                          {formatTransactionListCell(column.key, row)}
                        </TableCell>
                      ))}
                      {showDeletedDate ? (
                        <TableCell>
                          {formatTransactionListCell("deletedDate", row)}
                        </TableCell>
                      ) : null}
                      {renderActions ? (
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            {renderActions(row)}
                          </Stack>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {onPageChange && onRowsPerPageChange ? (
            <TablePagination
              component="div"
              count={rows.length}
              page={page}
              onPageChange={(_, nextPage) => onPageChange(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) =>
                onRowsPerPageChange(parseInt(event.target.value, 10))
              }
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          ) : null}
        </>
      )}
    </Box>
  );
};

export const TransactionListActionButton: React.FC<{
  label: string;
  onClick: () => void;
  color?: "primary" | "error" | "inherit";
  disabled?: boolean;
}> = ({ label, onClick, color = "primary", disabled }) => (
  <Button
    size="small"
    variant="outlined"
    color={color}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </Button>
);

export default TransactionListTable;
