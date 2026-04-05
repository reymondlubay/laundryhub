import React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import dayjs from "dayjs";
import transactionService, {
  type PaymentDetail,
  type Transaction,
} from "../../services/transactionService";
import customerService, { type Customer } from "../../services/customerService";

type DashboardCard = {
  key: string;
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

const isSameDay = (value?: string | null): boolean => {
  if (!value) return false;
  const date = dayjs(value);
  return date.isValid() && date.isSame(dayjs(), "day");
};

const getTransactionDate = (
  transaction: Transaction,
  field: "dateReceived" | "dateLoaded" | "datePickup",
): string | undefined => {
  const tx = transaction as Transaction & {
    datereceived?: string;
    dateloaded?: string;
    datepickup?: string;
  };

  if (field === "dateReceived") {
    return transaction.dateReceived || tx.datereceived;
  }

  if (field === "dateLoaded") {
    return transaction.dateLoaded || tx.dateloaded;
  }

  return transaction.datePickup || tx.datepickup;
};

const getPaymentDate = (payment: PaymentDetail): string | undefined => {
  const item = payment as PaymentDetail & { paymentdate?: string };
  return payment.paymentDate || item.paymentdate;
};

const AnimatedCount: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  const previousValueRef = React.useRef(0);

  React.useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = Math.max(0, value);
    const duration = 700;
    const startAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startAt;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const nextValue = Math.round(
        startValue + (endValue - startValue) * eased,
      );

      setDisplayValue(nextValue);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = endValue;
      }
    };

    const animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{String(displayValue).padStart(2, "0")}</>;
};

const Dashboard = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [transactionData, customerData] = await Promise.all([
          transactionService.getAll(),
          customerService.getAll(),
        ]);

        setTransactions(transactionData);
        setCustomers(customerData);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const metrics = React.useMemo(() => {
    const todaysTransactions = transactions.filter((transaction) =>
      isSameDay(getTransactionDate(transaction, "dateReceived")),
    ).length;

    const todaysLoaded = transactions.filter((transaction) =>
      isSameDay(getTransactionDate(transaction, "dateLoaded")),
    ).length;

    const todaysPickup = transactions.filter((transaction) =>
      isSameDay(getTransactionDate(transaction, "datePickup")),
    ).length;

    const todaysPending = transactions.filter((transaction) => {
      const isTodayTransaction = isSameDay(
        getTransactionDate(transaction, "dateReceived"),
      );
      const hasLoadedDate = Boolean(
        getTransactionDate(transaction, "dateLoaded"),
      );
      return isTodayTransaction && !hasLoadedDate;
    }).length;

    const todaysPaid = transactions.reduce((count, transaction) => {
      const hasPaymentToday = (transaction.paymentDetails || []).some(
        (payment) => isSameDay(getPaymentDate(payment)),
      );
      return hasPaymentToday ? count + 1 : count;
    }, 0);

    const todaysCustomer = customers.filter((customer) => {
      const item = customer as Customer & { createdat?: string };
      return isSameDay(customer.createdAt || item.createdat);
    }).length;

    return {
      todaysTransactions,
      todaysLoaded,
      todaysPending,
      todaysPaid,
      todaysCustomer,
      todaysPickup,
    };
  }, [customers, transactions]);

  const cards: DashboardCard[] = [
    {
      key: "todays-transaction",
      title: "Today's Transaction",
      value: metrics.todaysTransactions,
      icon: <ShoppingBagOutlinedIcon />,
      iconBg: "#ffe7df",
      iconColor: "#ff5a2d",
    },
    {
      key: "todays-loaded",
      title: "Today's Loaded",
      value: metrics.todaysLoaded,
      icon: <Inventory2OutlinedIcon />,
      iconBg: "#f6efe0",
      iconColor: "#b8871b",
    },
    {
      key: "todays-pending",
      title: "Today's Pending",
      value: metrics.todaysPending,
      icon: <PendingActionsOutlinedIcon />,
      iconBg: "#fff2d6",
      iconColor: "#cf8b00",
    },
    {
      key: "todays-paid",
      title: "Today's Paid",
      value: metrics.todaysPaid,
      icon: <PaymentsOutlinedIcon />,
      iconBg: "#e8f7f1",
      iconColor: "#1d9a72",
    },
    {
      key: "todays-customer",
      title: "Today's Customer",
      value: metrics.todaysCustomer,
      icon: <PeopleOutlineOutlinedIcon />,
      iconBg: "#ece8ff",
      iconColor: "#7a6df0",
    },
    {
      key: "todays-pickup",
      title: "Today's Pickup",
      value: metrics.todaysPickup,
      icon: <LocalShippingOutlinedIcon />,
      iconBg: "#edf3e0",
      iconColor: "#80a93a",
    },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Dashboard
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {cards.map((card) => (
            <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: 3,
                  bgcolor: "#fbfcfe",
                  border: "1px solid #edf1f5",
                  display: "flex",
                  alignItems: "center",
                  minHeight: 84,
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    bgcolor: card.iconBg,
                    color: card.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#7f95ad",
                      fontWeight: 500,
                      lineHeight: 1.2,
                      mb: 0.35,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: "#0d213f",
                      lineHeight: 1,
                      letterSpacing: 0.3,
                    }}
                  >
                    <AnimatedCount value={card.value} />
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;
