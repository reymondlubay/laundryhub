import React from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Autocomplete,
  Alert,
  Box,
  CircularProgress,
  Divider,
  Grid,
  Paper,
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
  type PaymentDetail,
  type Transaction,
} from "../../services/transactionService";
import { toPascalCase } from "../../utils/stringUtils";
import customerService, { type Customer } from "../../services/customerService";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../services/addonsPricingService";
import { getAddonsTotal, getStoredSnapshots } from "../../utils/pricing";

type PaymentModeTotals = {
  cash: number;
  gcash: number;
};

type BackdatePaymentRow = {
  transaction: Transaction;
  payments: Array<{
    paymentId: string;
    amountPaid: number;
    paymentDate: string | undefined;
    createdPaymentDate: string | undefined;
  }>;
};

type BackdatePickupRow = {
  transaction: Transaction;
  datePickup: string | undefined;
  datePickupModifiedAt: string | undefined;
};

type LoadLike = {
  kg?: number | string | null;
  loads?: number | string | null;
  price?: number | string | null;
};

type TransactionWithLegacyFields = Transaction & {
  customerid?: string;
  datereceived?: string;
  dateloaded?: string;
  datepickup?: string;
  whiteprice?: number | string | null;
  fabconqty?: number | string | null;
  detergentqty?: number | string | null;
  colorsafeqty?: number | string | null;
  grandtotal?: number | string | null;
  loaddetails?: Array<{
    kg?: number | string | null;
    loads?: number | string | null;
    price?: number | string | null;
  }>;
  load_details?: Array<{
    kg?: number | string | null;
    loads?: number | string | null;
    price?: number | string | null;
  }>;
};

type PaymentWithLegacyFields = PaymentDetail & {
  paymentdate?: string;
  createdat?: string;
};

const normalizeRange = (from: Dayjs, to: Dayjs): { from: Dayjs; to: Dayjs } => {
  if (from.isAfter(to)) {
    return { from: to, to: from };
  }
  return { from, to };
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

const getPaymentDate = (payment: PaymentDetail): string | undefined => {
  const item = payment as PaymentWithLegacyFields;
  return payment.paymentDate || item.paymentdate;
};

const getPaymentCreatedDate = (payment: PaymentDetail): string | undefined => {
  const item = payment as PaymentWithLegacyFields;
  return payment.createdAt || item.createdat || getPaymentDate(payment);
};

const isSameCalendarDay = (first?: string, second?: string): boolean => {
  if (!first || !second) return true;
  const firstDate = dayjs(first);
  const secondDate = dayjs(second);
  if (!firstDate.isValid() || !secondDate.isValid()) return true;
  return firstDate.format("YYYY-MM-DD") === secondDate.format("YYYY-MM-DD");
};

const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const getLoadDetails = (transaction: Transaction): LoadLike[] => {
  const tx = transaction as TransactionWithLegacyFields;

  if (
    Array.isArray(transaction.loadDetails) &&
    transaction.loadDetails.length > 0
  ) {
    return transaction.loadDetails as LoadLike[];
  }
  if (Array.isArray(tx.loaddetails) && tx.loaddetails.length > 0) {
    return tx.loaddetails;
  }
  if (Array.isArray(tx.load_details) && tx.load_details.length > 0) {
    return tx.load_details;
  }

  return [];
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  return dayjs(value).isValid() ? dayjs(value).format("MM-DD-YY h:mm A") : "-";
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

const sameOrAfter = (value: Dayjs, from: Dayjs) =>
  value.isSame(from.startOf("day")) || value.isAfter(from.startOf("day"));

const sameOrBefore = (value: Dayjs, to: Dayjs) =>
  value.isSame(to.endOf("day")) || value.isBefore(to.endOf("day"));

const isWithinRange = (
  dateValue: string | undefined,
  from: Dayjs,
  to: Dayjs,
) => {
  if (!dateValue) return false;
  const date = dayjs(dateValue);
  if (!date.isValid()) return false;
  return sameOrAfter(date, from) && sameOrBefore(date, to);
};

const getTransactionTotals = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
) => {
  const totals = getLoadDetails(transaction).reduce<{
    kg: number;
    loads: number;
    price: number;
  }>(
    (acc, row) => {
      acc.kg += toNumber(row.kg);
      acc.loads += toNumber(row.loads);
      acc.price += toNumber(row.price);
      return acc;
    },
    { kg: 0, loads: 0, price: 0 },
  );

  const latestPaymentDate =
    transaction.paymentDetails && transaction.paymentDetails.length > 0
      ? getPaymentDate(
          transaction.paymentDetails[transaction.paymentDetails.length - 1],
        )
      : null;

  const tx = transaction as TransactionWithLegacyFields;
  const stored = getStoredSnapshots({
    grandTotal: transaction.grandTotal,
    grandtotal: tx.grandtotal,
  });
  const addonsTotal = getAddonsTotal(transaction, addonsPricing);

  return {
    ...totals,
    price: stored.hasGrandTotal
      ? stored.grandTotal
      : totals.price + addonsTotal,
    latestPaymentDate,
  };
};

const filterPaymentsByRange = (
  payments: PaymentDetail[] | undefined,
  from: Dayjs,
  to: Dayjs,
): PaymentDetail[] => {
  const range = normalizeRange(from, to);
  return (payments || []).filter((payment) =>
    isWithinRange(getPaymentDate(payment), range.from, range.to),
  );
};

const TransactionReport: React.FC = () => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [addonsPricing, setAddonsPricing] = React.useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );

  const [selectedCustomer, setSelectedCustomer] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<Dayjs>(dayjs());
  const [dateTo, setDateTo] = React.useState<Dayjs>(dayjs());

  const [loadPage, setLoadPage] = React.useState(0);
  const [loadRowsPerPage, setLoadRowsPerPage] = React.useState(50);
  const [payPage, setPayPage] = React.useState(0);
  const [payRowsPerPage, setPayRowsPerPage] = React.useState(50);
  const [backdatePage, setBackdatePage] = React.useState(0);
  const [backdateRowsPerPage, setBackdateRowsPerPage] = React.useState(50);
  const [backdatePickupPage, setBackdatePickupPage] = React.useState(0);
  const [backdatePickupRowsPerPage, setBackdatePickupRowsPerPage] =
    React.useState(50);

  // Reset pages when filters change
  React.useEffect(() => {
    setLoadPage(0);
    setPayPage(0);
    setBackdatePage(0);
    setBackdatePickupPage(0);
  }, [selectedCustomer, dateFrom, dateTo]);

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
        setAddonsPricing(pricingData);
        setTransactions(
          transactionData.filter(
            (t) =>
              !t.isDeleted &&
              !(t as Transaction & { isdeleted?: boolean }).isdeleted,
          ),
        );
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

  const filteredByCustomer = React.useMemo(() => {
    if (!selectedCustomer) return transactions;
    return transactions.filter((transaction) => {
      const tx = transaction as TransactionWithLegacyFields;
      return (transaction.customerId || tx.customerid) === selectedCustomer;
    });
  }, [selectedCustomer, transactions]);

  const loadReportRows = React.useMemo(() => {
    const range = normalizeRange(dateFrom, dateTo);
    return filteredByCustomer.filter((transaction) =>
      isWithinRange(
        getTransactionFieldDate(transaction, "dateLoaded"),
        range.from,
        range.to,
      ),
    );
  }, [dateFrom, dateTo, filteredByCustomer]);

  const totalLoads = React.useMemo(() => {
    return loadReportRows.reduce((sum, transaction) => {
      const totals = getTransactionTotals(transaction, addonsPricing);
      return sum + totals.loads;
    }, 0);
  }, [addonsPricing, loadReportRows]);

  const paymentReportRows = React.useMemo(() => {
    return filteredByCustomer.filter((transaction) => {
      const paymentsInRange = filterPaymentsByRange(
        transaction.paymentDetails,
        dateFrom,
        dateTo,
      );
      return paymentsInRange.length > 0;
    });
  }, [dateFrom, dateTo, filteredByCustomer]);

  const paymentRowsWithRangePayments = React.useMemo(() => {
    return paymentReportRows.map((transaction) => {
      const paymentsInRange = filterPaymentsByRange(
        transaction.paymentDetails,
        dateFrom,
        dateTo,
      );

      const amountPaidInRange = paymentsInRange.reduce(
        (sum, payment) => sum + toNumber(payment.amount),
        0,
      );

      const allPaymentsTotal = (transaction.paymentDetails || []).reduce(
        (sum, payment) => sum + toNumber(payment.amount),
        0,
      );

      const transactionTotals = getTransactionTotals(
        transaction,
        addonsPricing,
      );
      const balanceAmount = Math.max(
        transactionTotals.price - allPaymentsTotal,
        0,
      );
      const overAmount = Math.max(
        allPaymentsTotal - transactionTotals.price,
        0,
      );
      const isFullyPaid = balanceAmount <= 0;

      const paymentHistoryLines = (transaction.paymentDetails || []).map(
        (payment) => {
          const date = formatDateTime(getPaymentDate(payment));
          const amount = formatCurrency(toNumber(payment.amount));
          const mode = String(payment.mode || "-");
          return `${amount} - ${mode} - ${date}`;
        },
      );

      const mismatchedDayHistory = paymentsInRange
        .filter(
          (payment) =>
            !isSameCalendarDay(
              getPaymentDate(payment),
              getPaymentCreatedDate(payment),
            ),
        )
        .map((payment) => {
          const amount = formatCurrency(toNumber(payment.amount));
          const paidDate = formatDateTime(getPaymentDate(payment));
          const createdDate = formatDateTime(getPaymentCreatedDate(payment));
          return `${amount} - ${paidDate} - ${createdDate}`;
        });

      const hasDatePaidMismatch = mismatchedDayHistory.length > 0;

      const datePaid =
        paymentsInRange.length > 0
          ? getPaymentDate(paymentsInRange[paymentsInRange.length - 1])
          : null;

      return {
        transaction,
        paymentsInRange,
        amountPaidInRange,
        allPaymentsTotal,
        paymentHistoryLines,
        mismatchedDayHistory,
        hasDatePaidMismatch,
        isFullyPaid,
        balanceAmount,
        overAmount,
        datePaid,
      };
    });
  }, [addonsPricing, dateFrom, dateTo, paymentReportRows]);

  const paymentSummary = React.useMemo(() => {
    const modeTotals: PaymentModeTotals = { cash: 0, gcash: 0 };
    let totalPayments = 0;
    let totalBalance = 0;
    let totalOver = 0;

    paymentRowsWithRangePayments.forEach(
      ({ transaction, paymentsInRange, allPaymentsTotal }) => {
        const transactionTotals = getTransactionTotals(
          transaction,
          addonsPricing,
        );
        const diffAllTime = allPaymentsTotal - transactionTotals.price;

        if (diffAllTime < 0) {
          totalBalance += Math.abs(diffAllTime);
        } else if (diffAllTime > 0) {
          totalOver += diffAllTime;
        }

        paymentsInRange.forEach((payment) => {
          const amount = Number(payment.amount || 0);
          totalPayments += amount;
          const mode = String(payment.mode || "").toLowerCase();
          if (mode === "gcash") {
            modeTotals.gcash += amount;
          } else {
            modeTotals.cash += amount;
          }
        });
      },
    );

    return {
      totalPaymentCash: modeTotals.cash,
      totalPaymentGcash: modeTotals.gcash,
      totalPayment: totalPayments,
      totalBalance,
      totalOver,
    };
  }, [addonsPricing, paymentRowsWithRangePayments]);

  const backdatePaymentRows = React.useMemo(() => {
    const range = normalizeRange(dateFrom, dateTo);

    return filteredByCustomer
      .map<BackdatePaymentRow | null>((transaction) => {
        const mismatchedPayments = (transaction.paymentDetails || []).filter(
          (payment) =>
            isWithinRange(
              getPaymentCreatedDate(payment),
              range.from,
              range.to,
            ) &&
            !isSameCalendarDay(
              getPaymentDate(payment),
              getPaymentCreatedDate(payment),
            ),
        );

        if (mismatchedPayments.length === 0) {
          return null;
        }

        return {
          transaction,
          payments: mismatchedPayments.map((payment) => ({
            paymentId: payment.id,
            amountPaid: toNumber(payment.amount),
            paymentDate: getPaymentDate(payment),
            createdPaymentDate: getPaymentCreatedDate(payment),
          })),
        };
      })
      .filter((row): row is BackdatePaymentRow => row !== null);
  }, [dateFrom, dateTo, filteredByCustomer]);

  const backdatePickupRows = React.useMemo(() => {
    const range = normalizeRange(dateFrom, dateTo);
    console.log(
      "Date range:",
      range.from.format("YYYY-MM-DD"),
      "to",
      range.to.format("YYYY-MM-DD"),
    );

    return filteredByCustomer
      .map<BackdatePickupRow | null>((transaction) => {
        const datePickup = getTransactionFieldDate(transaction, "datePickup");
        const datePickupModifiedAt = transaction.datePickupModifiedAt;

        // console.log(`Transaction ${transaction.id}:`, {
        //   datePickup,
        //   datePickupModifiedAt,
        //   hasBoth: !!(datePickup && datePickupModifiedAt),
        //   datePickupType: typeof datePickup,
        //   datePickupModifiedAtType: typeof datePickupModifiedAt,
        // });

        // Check if date pickup modified date is within range
        const isInRange = isWithinRange(
          datePickupModifiedAt,
          range.from,
          range.to,
        );
        console.log(
          `Transaction ${transaction.id}: isWithinRange(${datePickupModifiedAt}, ${range.from.format("YYYY-MM-DD")}, ${range.to.format("YYYY-MM-DD")}) = ${isInRange}`,
        );
        if (!isInRange) {
          console.log(
            `Transaction ${transaction.id}: datePickupModifiedAt not in range`,
          );
          return null;
        }

        // Both datePickup and datePickupModifiedAt must exist
        if (!datePickup || !datePickupModifiedAt) {
          console.log(
            `Transaction ${transaction.id}: missing datePickup or datePickupModifiedAt`,
          );
          return null;
        }

        // Check if pickup date is before the modified date (comparing dates only)
        const pickupDate = dayjs(datePickup).startOf("day");
        const modifiedDate = dayjs(datePickupModifiedAt).startOf("day");
        const isBefore = pickupDate.isBefore(modifiedDate);
        console.log(
          `Transaction ${transaction.id}: pickupDate=${pickupDate.format("YYYY-MM-DD")}, modifiedDate=${modifiedDate.format("YYYY-MM-DD")}, isBefore=${isBefore}`,
        );

        if (!isBefore) {
          return null;
        }

        return {
          transaction,
          datePickup,
          datePickupModifiedAt,
        };
      })
      .filter((row): row is BackdatePickupRow => row !== null);
  }, [dateFrom, dateTo, filteredByCustomer]);

  const normalizedRange = normalizeRange(dateFrom, dateTo);
  const fromText = normalizedRange.from.format("MM-DD-YYYY");
  const toText = normalizedRange.to.format("MM-DD-YYYY");

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Transaction Report
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
                label="Date From"
                value={dateFrom}
                onChange={(value) => setDateFrom(value || dayjs())}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date To"
                value={dateTo}
                onChange={(value) => setDateTo(value || dayjs())}
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

      {loading ? (
        <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Load Report
            </Typography>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date Receive</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>kg</TableCell>
                    <TableCell>load</TableCell>
                    <TableCell>price</TableCell>
                    <TableCell>Date loaded</TableCell>
                    <TableCell>Date paid</TableCell>
                    <TableCell>Date pickup</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadReportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    loadReportRows
                      .slice(
                        loadPage * loadRowsPerPage,
                        loadPage * loadRowsPerPage + loadRowsPerPage,
                      )
                      .map((transaction) => {
                        const totals = getTransactionTotals(
                          transaction,
                          addonsPricing,
                        );
                        return (
                          <TableRow key={`load-${transaction.id}`}>
                            <TableCell>
                              {formatDateTime(
                                getTransactionFieldDate(
                                  transaction,
                                  "dateReceived",
                                ),
                              )}
                            </TableCell>
                            <TableCell>
                              {toPascalCase(transaction.customer?.name || "-")}
                            </TableCell>
                            <TableCell>{formatCount(totals.kg)}</TableCell>
                            <TableCell>{formatCount(totals.loads)}</TableCell>
                            <TableCell>
                              {formatCurrency(totals.price)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(
                                getTransactionFieldDate(
                                  transaction,
                                  "dateLoaded",
                                ),
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(totals.latestPaymentDate)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(
                                getTransactionFieldDate(
                                  transaction,
                                  "datePickup",
                                ),
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100, 200]}
              component="div"
              count={loadReportRows.length}
              rowsPerPage={loadRowsPerPage}
              page={loadPage}
              onPageChange={(_, newPage) => setLoadPage(newPage)}
              onRowsPerPageChange={(e) => {
                setLoadRowsPerPage(parseInt(e.target.value, 10));
                setLoadPage(0);
              }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>
                Total load from {fromText} - {toText}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ fontWeight: 700 }}>
                Total Loads - {formatCount(totalLoads)}
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Payment Report
            </Typography>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date Receive</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>kg</TableCell>
                    <TableCell>load</TableCell>
                    <TableCell>price</TableCell>
                    <TableCell>Date loaded</TableCell>
                    <TableCell>Date paid</TableCell>
                    <TableCell>Amount Paid</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentReportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentRowsWithRangePayments
                      .slice(
                        payPage * payRowsPerPage,
                        payPage * payRowsPerPage + payRowsPerPage,
                      )
                      .map(
                        ({
                          transaction,
                          datePaid,
                          amountPaidInRange,
                          paymentHistoryLines,
                          mismatchedDayHistory,
                          hasDatePaidMismatch,
                          isFullyPaid,
                          balanceAmount,
                          overAmount,
                        }) => {
                          const totals = getTransactionTotals(
                            transaction,
                            addonsPricing,
                          );

                          const mismatchTooltipTitle = (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.25,
                              }}
                            >
                              {mismatchedDayHistory.map((line) => (
                                <span key={line}>{line}</span>
                              ))}
                            </Box>
                          );

                          const tooltipTitle = (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.25,
                              }}
                            >
                              {paymentHistoryLines.length > 0 ? (
                                paymentHistoryLines.map((line) => (
                                  <span key={line}>{line}</span>
                                ))
                              ) : (
                                <span>No payment history</span>
                              )}
                              {!isFullyPaid ? (
                                <span
                                  style={{ color: "#f44336", fontWeight: 700 }}
                                >
                                  Balance - {formatCurrency(balanceAmount)}
                                </span>
                              ) : null}
                              {isFullyPaid && overAmount > 0 ? (
                                <span
                                  style={{ color: "#4caf50", fontWeight: 700 }}
                                >
                                  Over - {formatCurrency(overAmount)}
                                </span>
                              ) : null}
                            </Box>
                          );

                          return (
                            <TableRow key={`pay-${transaction.id}`}>
                              <TableCell>
                                {formatDateTime(
                                  getTransactionFieldDate(
                                    transaction,
                                    "dateReceived",
                                  ),
                                )}
                              </TableCell>
                              <TableCell>
                                {toPascalCase(
                                  transaction.customer?.name || "-",
                                )}
                              </TableCell>
                              <TableCell>{formatCount(totals.kg)}</TableCell>
                              <TableCell>{formatCount(totals.loads)}</TableCell>
                              <TableCell>
                                {formatCurrency(totals.price)}
                              </TableCell>
                              <TableCell>
                                {formatDateTime(
                                  getTransactionFieldDate(
                                    transaction,
                                    "dateLoaded",
                                  ),
                                )}
                              </TableCell>
                              <TableCell>
                                <Stack
                                  direction="row"
                                  spacing={0.75}
                                  alignItems="center"
                                >
                                  <span>{formatDateTime(datePaid)}</span>
                                  {hasDatePaidMismatch ? (
                                    <Tooltip title={mismatchTooltipTitle} arrow>
                                      <Box
                                        component="span"
                                        sx={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                        }}
                                      >
                                        <WarningAmberIcon
                                          sx={{
                                            color: "#f44336",
                                            fontSize: 18,
                                          }}
                                        />
                                      </Box>
                                    </Tooltip>
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack
                                  direction="row"
                                  spacing={0.75}
                                  alignItems="center"
                                >
                                  <span>
                                    {formatCurrency(amountPaidInRange)}
                                  </span>
                                  <Tooltip title={tooltipTitle} arrow>
                                    <Box
                                      component="span"
                                      sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      {isFullyPaid ? (
                                        <InfoOutlinedIcon
                                          sx={{
                                            color: "#4caf50",
                                            fontSize: 18,
                                          }}
                                        />
                                      ) : (
                                        <WarningAmberIcon
                                          sx={{
                                            color: "#f44336",
                                            fontSize: 18,
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        },
                      )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100, 200]}
              component="div"
              count={paymentReportRows.length}
              rowsPerPage={payRowsPerPage}
              page={payPage}
              onPageChange={(_, newPage) => setPayPage(newPage)}
              onRowsPerPageChange={(e) => {
                setPayRowsPerPage(parseInt(e.target.value, 10));
                setPayPage(0);
              }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>
                Total payments from {fromText} - {toText}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography>
                Total Payment Cash -{" "}
                {formatCurrency(paymentSummary.totalPaymentCash)}
              </Typography>
              <Typography>
                Total Payment Gcash -{" "}
                {formatCurrency(paymentSummary.totalPaymentGcash)}
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                Total Payment - {formatCurrency(paymentSummary.totalPayment)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ fontWeight: 700 }}>
                Total Balance - {formatCurrency(paymentSummary.totalBalance)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ fontWeight: 700 }}>
                Total over - {formatCurrency(paymentSummary.totalOver)}
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Backdate Payment Report
            </Typography>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date Receive</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>kg</TableCell>
                    <TableCell>load</TableCell>
                    <TableCell>price</TableCell>
                    <TableCell>Date paid</TableCell>
                    <TableCell>Created date paid</TableCell>
                    <TableCell>Amount paid</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backdatePaymentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    backdatePaymentRows
                      .slice(
                        backdatePage * backdateRowsPerPage,
                        backdatePage * backdateRowsPerPage +
                          backdateRowsPerPage,
                      )
                      .map(({ transaction, payments }) => {
                        const totals = getTransactionTotals(
                          transaction,
                          addonsPricing,
                        );

                        return (
                          <TableRow key={`backdate-${transaction.id}`}>
                            <TableCell>
                              {formatDateTime(
                                getTransactionFieldDate(
                                  transaction,
                                  "dateReceived",
                                ),
                              )}
                            </TableCell>
                            <TableCell>
                              {toPascalCase(transaction.customer?.name || "-")}
                            </TableCell>
                            <TableCell>{formatCount(totals.kg)}</TableCell>
                            <TableCell>{formatCount(totals.loads)}</TableCell>
                            <TableCell>
                              {formatCurrency(totals.price)}
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                {payments.map((payment) => (
                                  <Box
                                    key={`${payment.paymentId}-paid`}
                                    sx={{ color: "#f57c00", fontWeight: 700 }}
                                  >
                                    {formatDateTime(payment.paymentDate)}
                                  </Box>
                                ))}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                {payments.map((payment) => (
                                  <Box
                                    key={`${payment.paymentId}-created`}
                                    sx={{ color: "#2196f3", fontWeight: 700 }}
                                  >
                                    {formatDateTime(payment.createdPaymentDate)}
                                  </Box>
                                ))}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                {payments.map((payment) => (
                                  <span key={`${payment.paymentId}-amount`}>
                                    {formatCurrency(payment.amountPaid)}
                                  </span>
                                ))}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100, 200]}
              component="div"
              count={backdatePaymentRows.length}
              rowsPerPage={backdateRowsPerPage}
              page={backdatePage}
              onPageChange={(_, newPage) => setBackdatePage(newPage)}
              onRowsPerPageChange={(e) => {
                setBackdateRowsPerPage(parseInt(e.target.value, 10));
                setBackdatePage(0);
              }}
            />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Backdate Date Pickup Report
            </Typography>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date Receive</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>kg</TableCell>
                    <TableCell>load</TableCell>
                    <TableCell>price</TableCell>
                    <TableCell>Date loaded</TableCell>
                    <TableCell>Date Pickup</TableCell>
                    <TableCell>Date Pickup Modified</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backdatePickupRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    backdatePickupRows
                      .slice(
                        backdatePickupPage * backdatePickupRowsPerPage,
                        backdatePickupPage * backdatePickupRowsPerPage +
                          backdatePickupRowsPerPage,
                      )
                      .map(
                        ({ transaction, datePickup, datePickupModifiedAt }) => {
                          const totals = getTransactionTotals(
                            transaction,
                            addonsPricing,
                          );

                          return (
                            <TableRow
                              key={`backdate-pickup-${transaction.id}`}
                              sx={{ backgroundColor: "#fff3e0" }}
                            >
                              <TableCell>
                                {formatDateTime(
                                  getTransactionFieldDate(
                                    transaction,
                                    "dateReceived",
                                  ),
                                )}
                              </TableCell>
                              <TableCell>
                                {toPascalCase(
                                  transaction.customer?.name || "-",
                                )}
                              </TableCell>
                              <TableCell>{formatCount(totals.kg)}</TableCell>
                              <TableCell>{formatCount(totals.loads)}</TableCell>
                              <TableCell>
                                {formatCurrency(totals.price)}
                              </TableCell>
                              <TableCell>
                                {formatDateTime(
                                  getTransactionFieldDate(
                                    transaction,
                                    "dateLoaded",
                                  ),
                                )}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ color: "#f57c00", fontWeight: 700 }}>
                                  {formatDateTime(datePickup)}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ color: "#2196f3", fontWeight: 700 }}>
                                  {formatDateTime(datePickupModifiedAt)}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        },
                      )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100, 200]}
              component="div"
              count={backdatePickupRows.length}
              rowsPerPage={backdatePickupRowsPerPage}
              page={backdatePickupPage}
              onPageChange={(_, newPage) => setBackdatePickupPage(newPage)}
              onRowsPerPageChange={(e) => {
                setBackdatePickupRowsPerPage(parseInt(e.target.value, 10));
                setBackdatePickupPage(0);
              }}
            />
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default TransactionReport;
