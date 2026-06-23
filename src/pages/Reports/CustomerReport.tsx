import React from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import customerService, { type Customer } from "../../services/customerService";
import transactionService, {
  type PaymentDetail,
  type Transaction,
} from "../../services/transactionService";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../services/addonsPricingService";
import {
  getTransactionAmountDue,
  getTransactionDiscount,
} from "../../utils/pricing";
import { buildCsv, downloadCsv } from "../../utils/csvExport";
import {
  buildExportFileName,
  formatExportMonthLabel,
} from "../../utils/exportFileName";
import { toPascalCase } from "../../utils/stringUtils";
import { usePaginatedTableScroll } from "../../hooks/usePaginatedTableScroll";

type TransactionWithLegacyFields = Transaction & {
  customerid?: string;
  datereceived?: string;
  grandtotal?: number | string | null;
  loadsubtotal?: number | string | null;
  addonssubtotal?: number | string | null;
  loaddetails?: Array<{
    loads?: number | string | null;
    price?: number | string | null;
  }>;
  load_details?: Array<{
    loads?: number | string | null;
    price?: number | string | null;
  }>;
};

type PaymentWithLegacyFields = PaymentDetail & {
  paymentdate?: string;
};

type CustomerReportRow = {
  customerId: string;
  customerName: string;
  totalLoads: number;
  totalPaid: number;
  discount: number;
  balance: number;
};

const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatCount = (value: number): string => {
  return Math.round(value).toLocaleString("en-US");
};

const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizeRange = (from: Dayjs, to: Dayjs): { from: Dayjs; to: Dayjs } => {
  if (to.isBefore(from, "month")) {
    return { from: to, to: from };
  }
  return { from, to };
};

const getTransactionDateReceived = (
  transaction: Transaction,
): string | undefined => {
  const tx = transaction as TransactionWithLegacyFields;
  return transaction.dateReceived || tx.datereceived;
};

const getTransactionCustomerId = (transaction: Transaction): string => {
  const tx = transaction as TransactionWithLegacyFields;
  return transaction.customerId || tx.customerid || "";
};

const getLoadRows = (
  transaction: Transaction,
): Array<{
  loads?: number | string | null;
  price?: number | string | null;
}> => {
  const tx = transaction as TransactionWithLegacyFields;

  if (
    Array.isArray(transaction.loadDetails) &&
    transaction.loadDetails.length > 0
  ) {
    return transaction.loadDetails;
  }
  if (Array.isArray(tx.loaddetails) && tx.loaddetails.length > 0) {
    return tx.loaddetails;
  }
  if (Array.isArray(tx.load_details) && tx.load_details.length > 0) {
    return tx.load_details;
  }

  return [];
};

const getPaymentDate = (payment: PaymentDetail): string | undefined => {
  const item = payment as PaymentWithLegacyFields;
  return payment.paymentDate || item.paymentdate;
};

const isWithinDateRange = (
  value: string | undefined,
  fromMonth: Dayjs,
  toMonth: Dayjs,
): boolean => {
  if (!value) return false;

  const date = dayjs(value);
  if (!date.isValid()) return false;

  const range = normalizeRange(fromMonth, toMonth);
  const from = range.from.startOf("month");
  const to = range.to.endOf("month");

  return (
    (date.isAfter(from) || date.isSame(from)) &&
    (date.isBefore(to) || date.isSame(to))
  );
};

const CustomerReport: React.FC = () => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [addonsPricing, setAddonsPricing] = React.useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );

  const [selectedCustomer, setSelectedCustomer] = React.useState<string>("");
  const [monthFrom, setMonthFrom] = React.useState<Dayjs>(dayjs());
  const [monthTo, setMonthTo] = React.useState<Dayjs>(dayjs());
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);
  const {
    tableContainerRef,
    onPageChange: makePageChange,
    onRowsPerPageChange: makeRowsChange,
  } = usePaginatedTableScroll();

  type SortableColumn =
    | "customerName"
    | "totalLoads"
    | "totalPaid"
    | "discount"
    | "balance";
  type SortOrder = "asc" | "desc";
  const [sortColumn, setSortColumn] =
    React.useState<SortableColumn>("customerName");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  const handleRequestSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortOrder(column === "customerName" ? "asc" : "desc");
    }
  };

  React.useEffect(() => {
    setPage(0);
  }, [selectedCustomer, monthFrom, monthTo]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [customerData, transactionData, pricingData] = await Promise.all([
          customerService.getAll(),
          transactionService.getAll(),
          addonsPricingService.get(),
        ]);

        setCustomers(customerData);
        setTransactions(
          transactionData.filter(
            (tx) =>
              !(
                tx.isDeleted ||
                (tx as Transaction & { isdeleted?: boolean }).isdeleted
              ),
          ),
        );
        setAddonsPricing(pricingData);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load reports.",
        );
        setAddonsPricing(DEFAULT_ADDONS_PRICING);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const monthValidationError = React.useMemo(() => {
    const now = dayjs();

    if (monthFrom.isAfter(now, "month") || monthTo.isAfter(now, "month")) {
      return "Future month is not allowed.";
    }
    if (monthTo.isBefore(monthFrom, "month")) {
      return "To month cannot be earlier than From month.";
    }

    return null;
  }, [monthFrom, monthTo]);

  const reportRows = React.useMemo<CustomerReportRow[]>(() => {
    if (monthValidationError) return [];

    const rowsByCustomer = new Map<string, CustomerReportRow>();

    transactions.forEach((transaction) => {
      const txCustomerId = getTransactionCustomerId(transaction);
      if (!txCustomerId) return;
      if (selectedCustomer && txCustomerId !== selectedCustomer) return;

      const dateReceived = getTransactionDateReceived(transaction);
      if (!isWithinDateRange(dateReceived, monthFrom, monthTo)) return;

      const customerName = toPascalCase(
        transaction.customer?.name ||
          customers.find((customer) => customer.id === txCustomerId)?.name ||
          "-",
      );

      const current = rowsByCustomer.get(txCustomerId) || {
        customerId: txCustomerId,
        customerName,
        totalLoads: 0,
        totalPaid: 0,
        discount: 0,
        balance: 0,
      };

      const loadRows = getLoadRows(transaction);
      const loads = loadRows.reduce((sum, row) => sum + toNumber(row.loads), 0);
      const tx = transaction as TransactionWithLegacyFields;
      const totalPrice = getTransactionAmountDue(
        {
          ...transaction,
          grandtotal: tx.grandtotal,
          loadsubtotal: tx.loadsubtotal,
          addonssubtotal: tx.addonssubtotal,
          loadDetails: loadRows,
        },
        addonsPricing,
      );

      const paidWithinRange = (transaction.paymentDetails || []).reduce(
        (sum, payment) => {
          if (!isWithinDateRange(getPaymentDate(payment), monthFrom, monthTo)) {
            return sum;
          }
          return sum + toNumber(payment.amount);
        },
        0,
      );

      current.totalLoads += loads;
      current.totalPaid += paidWithinRange;
      current.discount += getTransactionDiscount(transaction);
      current.balance += Math.max(totalPrice - paidWithinRange, 0);

      rowsByCustomer.set(txCustomerId, current);
    });

    return Array.from(rowsByCustomer.values());
  }, [
    customers,
    monthFrom,
    monthTo,
    monthValidationError,
    selectedCustomer,
    transactions,
    addonsPricing,
  ]);

  const sortedReportRows = React.useMemo<CustomerReportRow[]>(() => {
    const rows = [...reportRows];
    const direction = sortOrder === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      if (sortColumn === "customerName") {
        return direction * a.customerName.localeCompare(b.customerName);
      }
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      if (aValue === bValue) {
        return a.customerName.localeCompare(b.customerName);
      }
      return direction * (aValue - bValue);
    });

    return rows;
  }, [reportRows, sortColumn, sortOrder]);

  const totals = React.useMemo(() => {
    return sortedReportRows.reduce(
      (acc, row) => {
        acc.totalCustomers += 1;
        acc.totalLoads += row.totalLoads;
        acc.totalPaid += row.totalPaid;
        acc.totalDiscount += row.discount;
        acc.totalBalance += row.balance;
        return acc;
      },
      {
        totalCustomers: 0,
        totalLoads: 0,
        totalPaid: 0,
        totalDiscount: 0,
        totalBalance: 0,
      },
    );
  }, [sortedReportRows]);

  const handleExportToExcel = React.useCallback(() => {
    if (sortedReportRows.length === 0 || monthValidationError) return;

    const headers = [
      "Customer",
      "Total Loads",
      "Total Paid",
      "Discount",
      "Balance",
    ];
    const rows = sortedReportRows.map((row) => [
      row.customerName,
      formatCount(row.totalLoads),
      formatCurrency(row.totalPaid),
      formatCurrency(row.discount),
      formatCurrency(row.balance),
    ]);
    const csv = buildCsv(headers, rows);
    const fileName = buildExportFileName(
      "Customer_Report",
      formatExportMonthLabel(monthFrom),
      "to",
      formatExportMonthLabel(monthTo),
    );
    downloadCsv(fileName, csv);
  }, [sortedReportRows, monthValidationError, monthFrom, monthTo]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Customer Report
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              size="small"
              options={customers}
              value={
                customers.find(
                  (customer) => customer.id === selectedCustomer,
                ) || null
              }
              onChange={(_, value) => setSelectedCustomer(value?.id || "")}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.name || ""}
              renderInput={(params) => (
                <TextField {...params} label="Customer Filter" />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From Month"
                views={["year", "month"]}
                openTo="month"
                disableFuture
                value={monthFrom}
                onChange={(value) => {
                  if (value) setMonthFrom(value);
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="To Month"
                views={["year", "month"]}
                openTo="month"
                disableFuture
                minDate={monthFrom.startOf("month")}
                value={monthTo}
                onChange={(value) => {
                  if (value) setMonthTo(value);
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {monthValidationError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {monthValidationError}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportToExcel}
              disabled={sortedReportRows.length === 0 || !!monthValidationError}
            >
              Export to excel
            </Button>
          </Box>
          <TableContainer ref={tableContainerRef} sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={sortColumn === "customerName" ? sortOrder : false}>
                    <TableSortLabel
                      active={sortColumn === "customerName"}
                      direction={sortColumn === "customerName" ? sortOrder : "asc"}
                      onClick={() => handleRequestSort("customerName")}
                    >
                      Customer
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sortDirection={sortColumn === "totalLoads" ? sortOrder : false}
                  >
                    <TableSortLabel
                      active={sortColumn === "totalLoads"}
                      direction={sortColumn === "totalLoads" ? sortOrder : "asc"}
                      onClick={() => handleRequestSort("totalLoads")}
                    >
                      Total Loads
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sortDirection={sortColumn === "totalPaid" ? sortOrder : false}
                  >
                    <TableSortLabel
                      active={sortColumn === "totalPaid"}
                      direction={sortColumn === "totalPaid" ? sortOrder : "asc"}
                      onClick={() => handleRequestSort("totalPaid")}
                    >
                      Total Paid
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sortDirection={sortColumn === "discount" ? sortOrder : false}
                  >
                    <TableSortLabel
                      active={sortColumn === "discount"}
                      direction={sortColumn === "discount" ? sortOrder : "asc"}
                      onClick={() => handleRequestSort("discount")}
                    >
                      Discount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sortDirection={sortColumn === "balance" ? sortOrder : false}
                  >
                    <TableSortLabel
                      active={sortColumn === "balance"}
                      direction={sortColumn === "balance" ? sortOrder : "asc"}
                      onClick={() => handleRequestSort("balance")}
                    >
                      Balance
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {sortedReportRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedReportRows
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <TableRow key={row.customerId}>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell align="right">
                          {formatCount(row.totalLoads)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.totalPaid)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.discount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[20, 50, 100, 200]}
            component="div"
            count={sortedReportRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={makePageChange(setPage)}
            onRowsPerPageChange={makeRowsChange(setRowsPerPage, setPage)}
          />

          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>Totals</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography>
              Total customers: {formatCount(totals.totalCustomers)}
            </Typography>
            <Typography>
              Total Loads: {formatCount(totals.totalLoads)}
            </Typography>
            <Typography>
              Total Paid: {formatCurrency(totals.totalPaid)}
            </Typography>
            <Typography>
              Total Discount: {formatCurrency(totals.totalDiscount)}
            </Typography>
            <Typography>
              Total balance: {formatCurrency(totals.totalBalance)}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default CustomerReport;
