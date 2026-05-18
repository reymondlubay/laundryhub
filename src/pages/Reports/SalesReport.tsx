import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
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
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import transactionService, {
  type PaymentDetail,
  type Transaction,
} from "../../services/transactionService";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../services/addonsPricingService";
import inventoryItemService, {
  type InventoryItem,
} from "../../services/inventoryItemService";
import expenseItemService, {
  type ExpenseItem,
} from "../../services/expenseItemService";
import expenseRecordService, {
  type ExpenseRecord,
} from "../../services/expenseRecordService";
import fixedMonthlyExpenseService, {
  getFixedMonthlyTotalForMonth,
  type FixedMonthlyExpense,
} from "../../services/fixedMonthlyExpenseService";
import { toPascalCase } from "../../utils/stringUtils";
import { getTransactionGrandTotal } from "../../utils/pricing";

type TransactionLegacy = Transaction & {
  customerid?: string;
  datereceived?: string;
  grandtotal?: number | string | null;
  loadsubtotal?: number | string | null;
  addonssubtotal?: number | string | null;
  isdeleted?: boolean;
};

type PaymentLegacy = PaymentDetail & {
  paymentdate?: string;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  return dayjs(value).isValid() ? dayjs(value).format("MM-DD-YY h:mm A") : "-";
};

const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const getDateReceived = (transaction: Transaction): string | undefined => {
  const tx = transaction as TransactionLegacy;
  return transaction.dateReceived || tx.datereceived;
};

const getPaymentDate = (payment: PaymentDetail): string | undefined => {
  const p = payment as PaymentLegacy;
  return payment.paymentDate || p.paymentdate;
};

const getTransactionPrice = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): number => {
  const tx = transaction as TransactionLegacy;
  return getTransactionGrandTotal(
    {
      ...transaction,
      grandtotal: tx.grandtotal,
      loadsubtotal: tx.loadsubtotal,
      addonssubtotal: tx.addonssubtotal,
    },
    addonsPricing,
  );
};

const isInMonth = (dateValue: string | undefined, month: Dayjs) => {
  if (!dateValue) return false;
  const d = dayjs(dateValue);
  if (!d.isValid()) return false;
  return d.isSame(month, "month") && d.isSame(month, "year");
};

type SalesRow = {
  id: string;
  dateReceived: string | undefined;
  customer: string;
  price: number;
  paid: number;
  balance: number;
};

type ExpenseRow = {
  id: string;
  date: string;
  expenseName: string;
  source: "inventory" | "expense";
  amount: number;
};

const SalesReport: React.FC = () => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [addonsPricing, setAddonsPricing] = React.useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>(
    [],
  );
  const [expenseItems, setExpenseItems] = React.useState<ExpenseItem[]>([]);
  const [expenseRecords, setExpenseRecords] = React.useState<ExpenseRecord[]>(
    [],
  );
  const [fixedMonthlyExpenses, setFixedMonthlyExpenses] = React.useState<
    FixedMonthlyExpense[]
  >([]);
  const [fixedMonthlySnapshots, setFixedMonthlySnapshots] = React.useState<
    Record<string, number>
  >({});

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = React.useState<Dayjs>(dayjs());

  const [salesPage, setSalesPage] = React.useState(0);
  const [salesRowsPerPage, setSalesRowsPerPage] = React.useState(50);
  const [expensePage, setExpensePage] = React.useState(0);
  const [expenseRowsPerPage, setExpenseRowsPerPage] = React.useState(50);

  React.useEffect(() => {
    setSalesPage(0);
    setExpensePage(0);
  }, [selectedMonth]);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [txData, pricingData, invItems, expItems, expRecords, fixedBundle] =
          await Promise.all([
            transactionService.getAll(),
            addonsPricingService.get(),
            inventoryItemService.getAllForLookup(),
            expenseItemService.getAllForLookup(),
            expenseRecordService.getAll(),
            fixedMonthlyExpenseService.getAllWithSnapshots(),
          ]);
        setAddonsPricing(pricingData);
        setTransactions(
          txData.filter(
            (t) => !t.isDeleted && !(t as TransactionLegacy).isdeleted,
          ),
        );
        setInventoryItems(invItems);
        setExpenseItems(expItems);
        setExpenseRecords(expRecords);
        setFixedMonthlyExpenses(fixedBundle.items);
        setFixedMonthlySnapshots(fixedBundle.monthSnapshots);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load sales report.",
        );
        setAddonsPricing(DEFAULT_ADDONS_PRICING);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const inventoryItemById = React.useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventoryItems.forEach((i) => map.set(i.id, i));
    return map;
  }, [inventoryItems]);

  const expenseItemById = React.useMemo(() => {
    const map = new Map<string, ExpenseItem>();
    expenseItems.forEach((i) => map.set(i.id, i));
    return map;
  }, [expenseItems]);

  const salesRows = React.useMemo<SalesRow[]>(() => {
    const inMonth = transactions.filter((t) =>
      isInMonth(getDateReceived(t), selectedMonth),
    );

    const rows: SalesRow[] = inMonth.map((t) => {
      const price = getTransactionPrice(t, addonsPricing);
      const allPayments = (t.paymentDetails || []).reduce(
        (sum, p) => sum + toNumber(p.amount),
        0,
      );
      const paidAgainstPrice = Math.min(price, allPayments);
      const balance = Math.max(0, price - allPayments);

      return {
        id: t.id,
        dateReceived: getDateReceived(t),
        customer: toPascalCase(t.customer?.name || "-"),
        price,
        paid: paidAgainstPrice,
        balance,
      };
    });

    rows.sort((a, b) => {
      const ta = a.dateReceived ? dayjs(a.dateReceived).valueOf() : 0;
      const tb = b.dateReceived ? dayjs(b.dateReceived).valueOf() : 0;
      if (ta !== tb) return tb - ta;
      return a.customer.localeCompare(b.customer);
    });

    return rows;
  }, [addonsPricing, selectedMonth, transactions]);

  const expenseRows = React.useMemo<ExpenseRow[]>(() => {
    const inMonth = expenseRecords.filter(
      (r) =>
        isInMonth(typeof r.date === "string" ? r.date : "", selectedMonth) &&
        !r.isExternalUsage,
    );

    const rows: ExpenseRow[] = inMonth.map((r) => {
      let expenseName = "-";
      if (r.source === "inventory" && r.inventoryItemId) {
        const item = inventoryItemById.get(r.inventoryItemId);
        expenseName = `[Inventory] ${item?.name || "Unknown Item"}`;
      } else if (r.source === "expense" && r.expenseItemId) {
        const item = expenseItemById.get(r.expenseItemId);
        expenseName = `[Expense] ${item?.name || "Unknown Item"}`;
      }

      return {
        id: r.id,
        date: typeof r.date === "string" ? r.date : "",
        expenseName,
        source: r.source,
        amount: r.amount == null ? 0 : toNumber(r.amount),
      };
    });

    rows.sort((a, b) => {
      const ta = a.date ? dayjs(a.date).valueOf() : 0;
      const tb = b.date ? dayjs(b.date).valueOf() : 0;
      if (ta !== tb) return tb - ta;
      return a.expenseName.localeCompare(b.expenseName);
    });

    return rows;
  }, [expenseItemById, expenseRecords, inventoryItemById, selectedMonth]);

  // For the "Total Paid" tally we still sum payments by `paymentDate` within
  // the selected month even when the parent transaction is older, since 1.3
  // asks "all the result should based on the date filter".
  const totalPaidInMonth = React.useMemo(() => {
    return transactions.reduce((sum, t) => {
      const monthlyPayments = (t.paymentDetails || []).filter((p) =>
        isInMonth(getPaymentDate(p), selectedMonth),
      );
      return (
        sum +
        monthlyPayments.reduce((acc, p) => acc + toNumber(p.amount), 0)
      );
    }, 0);
  }, [selectedMonth, transactions]);

  const totals = React.useMemo(() => {
    const totalSales = salesRows.reduce((s, r) => s + r.price, 0);
    const recordedInternalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
    const monthKey = selectedMonth.isValid()
      ? selectedMonth.format("YYYY-MM")
      : dayjs().format("YYYY-MM");
    const fixedMonthlyTotal = getFixedMonthlyTotalForMonth(
      fixedMonthlyExpenses,
      monthKey,
      fixedMonthlySnapshots,
    );
    const totalExpenses = recordedInternalExpenses + fixedMonthlyTotal;
    const totalUnpaid = salesRows.reduce((s, r) => s + r.balance, 0);
    const netSales = totalSales - totalExpenses;

    return {
      totalSales,
      recordedInternalExpenses,
      fixedMonthlyTotal,
      totalExpenses,
      netSales,
      totalPaid: totalPaidInMonth,
      totalUnpaid,
    };
  }, [
    expenseRows,
    fixedMonthlyExpenses,
    fixedMonthlySnapshots,
    salesRows,
    selectedMonth,
    totalPaidInMonth,
  ]);

  const monthText = selectedMonth.isValid()
    ? selectedMonth.format("MMMM YYYY")
    : "";

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Sales Report
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Month"
                value={selectedMonth}
                onChange={(value) => setSelectedMonth(value || dayjs())}
                views={["year", "month"]}
                openTo="month"
                format="MMMM YYYY"
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
              Sales ({monthText})
            </Typography>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date Receive</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Unpaid</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesRows
                      .slice(
                        salesPage * salesRowsPerPage,
                        salesPage * salesRowsPerPage + salesRowsPerPage,
                      )
                      .map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDateTime(row.dateReceived)}</TableCell>
                          <TableCell>{row.customer}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.price)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.paid)}
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
              rowsPerPageOptions={[25, 50, 100, 200]}
              component="div"
              count={salesRows.length}
              rowsPerPage={salesRowsPerPage}
              page={salesPage}
              onPageChange={(_, newPage) => setSalesPage(newPage)}
              onRowsPerPageChange={(e) => {
                setSalesRowsPerPage(parseInt(e.target.value, 10));
                setSalesPage(0);
              }}
            />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Internal Expenses ({monthText})
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Table lists recorded expenses only. Active fixed monthly items from
              Settings are included in Summary totals below.
            </Typography>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Expense Name</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenseRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No expenses found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenseRows
                      .slice(
                        expensePage * expenseRowsPerPage,
                        expensePage * expenseRowsPerPage + expenseRowsPerPage,
                      )
                      .map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDateTime(row.date)}</TableCell>
                          <TableCell>{row.expenseName}</TableCell>
                          <TableCell>
                            {row.source === "inventory" ? "Inventory" : "Expense"}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100, 200]}
              component="div"
              count={expenseRows.length}
              rowsPerPage={expenseRowsPerPage}
              page={expensePage}
              onPageChange={(_, newPage) => setExpensePage(newPage)}
              onRowsPerPageChange={(e) => {
                setExpenseRowsPerPage(parseInt(e.target.value, 10));
                setExpensePage(0);
              }}
            />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Summary ({monthText})
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography>
              Total Sales (Gross) - {formatCurrency(totals.totalSales)}
            </Typography>
            <Typography>
              Internal expenses (recorded) -{" "}
              {formatCurrency(totals.recordedInternalExpenses)}
            </Typography>
            <Typography>
              Fixed monthly expenses (active) -{" "}
              {formatCurrency(totals.fixedMonthlyTotal)}
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              Total Internal Expenses - {formatCurrency(totals.totalExpenses)}
            </Typography>
            <Typography sx={{ fontWeight: 700, mt: 0.5 }}>
              Total Amount of Sales (Net) - {formatCurrency(totals.netSales)}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontWeight: 700 }}>
              Total Amount Paid - {formatCurrency(totals.totalPaid)}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>
              Total Amount Unpaid (Balances) - {formatCurrency(totals.totalUnpaid)}
            </Typography>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default SalesReport;
