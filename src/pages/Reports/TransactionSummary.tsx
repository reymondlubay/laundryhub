import React from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Autocomplete,
  Alert,
  Box,
  CircularProgress,
  Divider,
  FormControl,
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

type TransactionWithLegacyFields = Transaction & {
  customerid?: string;
  datereceived?: string;
  dateloaded?: string;
  datepickup?: string;
  grandtotal?: number | string | null;
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

type TransactionStatus =
  | "all"
  | "pending"
  | "with-balance"
  | "unpaid"
  | "not-picked"
  | "withdrawn"
  | "backdate-payment"
  | "backdate-pickup";

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

const getBalance = (transaction: Transaction): number => {
  const total = getTransactionGrandTotal(transaction);
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

const getTotalPrice = (transaction: Transaction): number => {
  return (
    transaction.loadDetails?.reduce(
      (sum, load) => sum + Number(load.price || 0),
      0,
    ) || 0
  );
};

const getTransactionGrandTotal = (transaction: Transaction): number => {
  const tx = transaction as TransactionWithLegacyFields;
  const explicitGrandTotal = Number(
    transaction.grandTotal ?? tx.grandtotal ?? 0,
  );
  if (explicitGrandTotal > 0) return explicitGrandTotal;
  return getTotalPrice(transaction);
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
  const datePickup = getTransactionFieldDate(transaction, "datePickup");
  const modifiedAt = transaction.datePickupModifiedAt;
  if (!datePickup || !modifiedAt) return false;
  const pickupDate = dayjs(datePickup).startOf("day");
  const modifiedDate = dayjs(modifiedAt).startOf("day");
  return pickupDate.isBefore(modifiedDate);
};

const matchesFilter = (
  transaction: Transaction,
  status: TransactionStatus,
): boolean => {
  if (status === "all") return true;

  const dateLoaded = getTransactionFieldDate(transaction, "dateLoaded");
  const datePickup = getTransactionFieldDate(transaction, "datePickup");
  const totalPaid =
    transaction.paymentDetails?.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    ) || 0;

  switch (status) {
    case "pending":
      return !dateLoaded;
    case "with-balance": {
      const total = getTransactionGrandTotal(transaction);
      const paymentRows = transaction.paymentDetails?.length ?? 0;
      if (paymentRows < 1 || totalPaid <= 0) return false;
      return totalPaid < total;
    }
    case "unpaid": {
      const paymentRows = transaction.paymentDetails?.length ?? 0;
      if (paymentRows === 0) return true;
      return totalPaid === 0;
    }
    case "not-picked":
      return !datePickup;
    case "backdate-payment":
      return hasBackdatePayment(transaction);
    case "backdate-pickup":
      return hasBackdatePickup(transaction);
    case "withdrawn":
      return getDeleteReason(transaction).toLowerCase() === "withdrawn";
    default:
      return true;
  }
};

const TransactionSummary = () => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = React.useState<string | null>(
    null,
  );
  const [dateFrom, setDateFrom] = React.useState<Dayjs>(
    dayjs().subtract(30, "days"),
  );
  const [dateTo, setDateTo] = React.useState<Dayjs>(dayjs());
  const [statusFilter, setStatusFilter] =
    React.useState<TransactionStatus>("all");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [selectedCustomer, dateFrom, dateTo, statusFilter]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [customerData, transactionData] = await Promise.all([
          customerService.getAll(),
          transactionService.getAll({ includeDeleted: true }),
        ]);
        setCustomers(customerData);
        setTransactions(transactionData);
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

    // Date range filter
    result = result.filter((transaction) => {
      const dateReceived = getTransactionFieldDate(transaction, "dateReceived");
      if (!dateReceived) return false;
      const date = dayjs(dateReceived);
      return (
        !date.isBefore(dateFrom.startOf("day")) &&
        !date.isAfter(dateTo.endOf("day"))
      );
    });

    // Status filter
    result = result.filter((transaction) => {
      const isDeleted =
        transaction.isDeleted ||
        Boolean(
          (transaction as Transaction & { isdeleted?: boolean }).isdeleted,
        );

      if (statusFilter === "withdrawn") {
        return (
          isDeleted &&
          getDeleteReason(transaction).toLowerCase() === "withdrawn"
        );
      }

      if (isDeleted) return false;
      return matchesFilter(transaction, statusFilter);
    });

    return result;
  }, [transactions, selectedCustomer, dateFrom, dateTo, statusFilter]);

  const paginatedTransactions = React.useMemo(() => {
    return filteredTransactions.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [filteredTransactions, page, rowsPerPage]);

  const filterSummary = React.useMemo(() => {
    const list = filteredTransactions;
    const customerIds = new Set<string>();
    let totalLoads = 0;
    let totalKg = 0;
    let totalPrice = 0;
    let totalPaid = 0;
    let totalUnpaidBalance = 0;
    let pickedUpCount = 0;
    let notPickedUpCount = 0;

    for (const t of list) {
      const tx = t as TransactionWithLegacyFields;
      const cid = t.customerId || tx.customerid;
      if (cid) customerIds.add(String(cid));

      totalLoads += getTotalLoads(t);
      totalKg += getTotalKg(t);
      totalPrice += getTransactionGrandTotal(t);
      totalPaid += getTotalPaid(t);
      totalUnpaidBalance += getBalance(t);

      const pickup = getTransactionFieldDate(t, "datePickup");
      if (pickup) pickedUpCount += 1;
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
      pickedUpCount,
      notPickedUpCount,
    };
  }, [filteredTransactions]);

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
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="To Date"
                  value={dateTo}
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
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>

          {/* Status Filter - Standalone */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="flex-start"
          >
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Transaction Status</InputLabel>
              <Select
                value={statusFilter}
                label="Transaction Status"
                onChange={(e) =>
                  setStatusFilter(e.target.value as TransactionStatus)
                }
              >
                <MenuItem value="all">All Records</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="with-balance">With balance</MenuItem>
                <MenuItem value="unpaid">Unpaid</MenuItem>
                <MenuItem value="not-picked">Not picked up</MenuItem>
                <MenuItem value="backdate-payment">Backdate payment</MenuItem>
                <MenuItem value="backdate-pickup">Backdate pickup</MenuItem>
                <MenuItem value="withdrawn">Withdrawn</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredTransactions.length === 0 ? (
        <Alert severity="info">No transactions found.</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell sx={{ fontWeight: 600 }}>Date Received</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  KG
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Load
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Price
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date Loaded</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <Tooltip title="Date Paid - Latest payment date">
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      Date Paid
                      <InfoOutlinedIcon sx={{ fontSize: "16px" }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date Pickup</TableCell>
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
                    {getTotalLoads(transaction)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(getTransactionGrandTotal(transaction))}
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
                      const totalPrice = getTransactionGrandTotal(transaction);
                      const hasBalance =
                        totalPaid > 0 && totalPaid < totalPrice;
                      const hasPaidOrOver = totalPaid >= totalPrice;
                      const balanceAmount = Math.max(totalPrice - totalPaid, 0);
                      const overAmount = Math.max(totalPaid - totalPrice, 0);

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
            {dateFrom.format("MMM D, YYYY")} to {dateTo.format("MMM D, YYYY")}{" "}
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
    </Box>
  );
};

export default TransactionSummary;
