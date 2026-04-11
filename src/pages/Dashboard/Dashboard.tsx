import React from "react";
import {
  Alert,
  Box,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
} from "@mui/material";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import LocalLaundryServiceOutlinedIcon from "@mui/icons-material/LocalLaundryServiceOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import dayjs from "dayjs";
import { useThemeContext } from "../../components/ThemeContext/ThemeContext";
import {
  DashboardCardsSkeleton,
  TableSkeleton,
  TableHeaderSkeleton,
} from "../../components/Skeletons/SkeletonComponents";
import transactionService, {
  type PaymentDetail,
  type Transaction,
} from "../../services/transactionService";

type DashboardCard = {
  key: string;
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

const formatCount = (value: number): string => {
  return Math.round(value).toLocaleString("en-US");
};

const isSameDay = (value?: string | null): boolean => {
  if (!value) return false;
  const date = dayjs(value);
  return date.isValid() && date.isSame(dayjs(), "day");
};

const getTransactionDate = (
  transaction: Transaction,
  field: "dateReceived" | "dateLoaded" | "estimatedPickup" | "datePickup",
): string | undefined => {
  const tx = transaction as Transaction & {
    datereceived?: string;
    dateloaded?: string;
    estimatedpickup?: string;
    datepickup?: string;
  };

  if (field === "dateReceived") {
    return transaction.dateReceived || tx.datereceived;
  }

  if (field === "dateLoaded") {
    return transaction.dateLoaded || tx.dateloaded;
  }

  if (field === "estimatedPickup") {
    return transaction.estimatedPickup || tx.estimatedpickup;
  }

  return transaction.datePickup || tx.datepickup;
};

const getPaymentDate = (payment: PaymentDetail): string | undefined => {
  const item = payment as PaymentDetail & { paymentdate?: string };
  return payment.paymentDate || item.paymentdate;
};

const getTransactionLoads = (transaction: Transaction): number => {
  const tx = transaction as Transaction & {
    loaddetails?: Array<{ loads?: number | string | null }>;
    load_details?: Array<{ loads?: number | string | null }>;
  };

  const details =
    (Array.isArray(transaction.loadDetails) &&
    transaction.loadDetails.length > 0
      ? transaction.loadDetails
      : Array.isArray(tx.loaddetails) && tx.loaddetails.length > 0
        ? tx.loaddetails
        : Array.isArray(tx.load_details)
          ? tx.load_details
          : []) || [];

  return details.reduce((sum, item) => sum + Number(item.loads || 0), 0);
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

  return <>{formatCount(displayValue)}</>;
};

const Dashboard = () => {
  const { darkMode } = useThemeContext();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const transactionData = await transactionService.getAll();

        setTransactions(
          transactionData.filter(
            (t) =>
              !t.isDeleted &&
              !(t as Transaction & { isdeleted?: boolean }).isdeleted,
          ),
        );
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

  const activeTransactions = React.useMemo(() => {
    return transactions.filter((t) => {
      const tx = t as Transaction & { isdeleted?: boolean };
      return !t.isDeleted && !tx.isdeleted;
    });
  }, [transactions]);

  const metrics = React.useMemo(() => {
    const todaysTransactions = activeTransactions.filter((transaction) =>
      isSameDay(getTransactionDate(transaction, "dateReceived")),
    ).length;

    const todaysLoad = activeTransactions
      .filter((transaction) =>
        isSameDay(getTransactionDate(transaction, "dateReceived")),
      )
      .reduce((sum, transaction) => sum + getTransactionLoads(transaction), 0);

    const todaysLoaded = activeTransactions.filter((transaction) =>
      isSameDay(getTransactionDate(transaction, "dateLoaded")),
    ).length;

    const todaysPickup = activeTransactions.filter((transaction) =>
      isSameDay(getTransactionDate(transaction, "datePickup")),
    ).length;

    const todaysPending = activeTransactions
      .filter((transaction) => {
        const hasLoadedDate = Boolean(
          getTransactionDate(transaction, "dateLoaded"),
        );
        return !hasLoadedDate;
      })
      .reduce((sum, transaction) => sum + getTransactionLoads(transaction), 0);

    const todaysPaid = activeTransactions.reduce((count, transaction) => {
      const hasPaymentToday = (transaction.paymentDetails || []).some(
        (payment) => isSameDay(getPaymentDate(payment)),
      );
      return hasPaymentToday ? count + 1 : count;
    }, 0);

    return {
      todaysTransactions,
      todaysLoad,
      todaysLoaded,
      todaysPending,
      todaysPaid,
      todaysPickup,
    };
  }, [activeTransactions]);

  const pendingTransactions = React.useMemo(() => {
    return activeTransactions
      .filter((transaction) => !getTransactionDate(transaction, "dateLoaded"))
      .sort((a, b) => {
        const aEstimated = dayjs(getTransactionDate(a, "estimatedPickup"));
        const bEstimated = dayjs(getTransactionDate(b, "estimatedPickup"));
        const aPriority = aEstimated.isValid();
        const bPriority = bEstimated.isValid();

        if (aPriority && !bPriority) return -1;
        if (!aPriority && bPriority) return 1;

        if (aPriority && bPriority) {
          const pickupDiff = aEstimated.valueOf() - bEstimated.valueOf();
          if (pickupDiff !== 0) return pickupDiff;
        }

        const aDate = dayjs(getTransactionDate(a, "dateReceived"));
        const bDate = dayjs(getTransactionDate(b, "dateReceived"));
        if (!aDate.isValid() && !bDate.isValid()) return 0;
        if (!aDate.isValid()) return 1;
        if (!bDate.isValid()) return -1;
        return aDate.valueOf() - bDate.valueOf();
      });
  }, [activeTransactions]);

  const loadedTodayTransactions = React.useMemo(() => {
    return activeTransactions
      .filter((transaction) =>
        isSameDay(getTransactionDate(transaction, "dateLoaded")),
      )
      .sort((a, b) => {
        const aDate = dayjs(getTransactionDate(a, "dateLoaded"));
        const bDate = dayjs(getTransactionDate(b, "dateLoaded"));
        if (!aDate.isValid() && !bDate.isValid()) return 0;
        if (!aDate.isValid()) return 1;
        if (!bDate.isValid()) return -1;
        return aDate.valueOf() - bDate.valueOf();
      });
  }, [transactions]);

  const pendingTotalLoads = React.useMemo(
    () =>
      pendingTransactions.reduce(
        (sum, transaction) => sum + getTransactionLoads(transaction),
        0,
      ),
    [pendingTransactions],
  );

  const loadedTodayTotalLoads = React.useMemo(
    () =>
      loadedTodayTransactions.reduce(
        (sum, transaction) => sum + getTransactionLoads(transaction),
        0,
      ),
    [loadedTodayTransactions],
  );

  const cards: DashboardCard[] = [
    {
      key: "todays-transaction",
      title: "Transaction",
      value: metrics.todaysTransactions,
      icon: <ShoppingBagOutlinedIcon />,
      iconBg: "#ffe7df",
      iconColor: "#ff5a2d",
    },
    {
      key: "todays-load",
      title: "Total Loads",
      value: metrics.todaysLoad,
      icon: <LocalLaundryServiceOutlinedIcon />,
      iconBg: "#e5f2ff",
      iconColor: "#2e7dd7",
    },
    {
      key: "todays-loaded",
      title: "Completed Loads",
      value: metrics.todaysLoaded,
      icon: <Inventory2OutlinedIcon />,
      iconBg: "#f6efe0",
      iconColor: "#b8871b",
    },
    {
      key: "todays-pending",
      title: "Pending Loads",
      value: metrics.todaysPending,
      icon: <PendingActionsOutlinedIcon />,
      iconBg: "#fff2d6",
      iconColor: "#cf8b00",
    },
    {
      key: "todays-paid",
      title: "Paid",
      value: metrics.todaysPaid,
      icon: <PaymentsOutlinedIcon />,
      iconBg: "#e8f7f1",
      iconColor: "#1d9a72",
    },
    {
      key: "todays-pickup",
      title: "Picked Up",
      value: metrics.todaysPickup,
      icon: <LocalShippingOutlinedIcon />,
      iconBg: "#edf3e0",
      iconColor: "#80a93a",
    },
  ];

  const surfaceColor = darkMode ? "#1b222c" : "#fbfcfe";
  const borderColor = darkMode ? "#2b3440" : "#edf1f5";
  const titleColor = darkMode ? "#c7d3e0" : "#7f95ad";
  const valueColor = darkMode ? "#f0f6ff" : "#0d213f";
  const headingColor = darkMode ? "#eef5ff" : "#0d213f";
  const tableHeadBg = darkMode ? "#232d39" : "#f5f8fc";
  const tableHeadColor = darkMode ? "#e7f0fa" : "#3b5b7a";
  const tableCellColor = darkMode ? "#d8e2ee" : "#17304f";

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontWeight: 700,
          color: headingColor,
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
        }}
      >
        Dashboard
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <>
          <DashboardCardsSkeleton count={6} />

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.25, sm: 2 },
                  borderRadius: 3,
                  bgcolor: surfaceColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Skeleton
                  variant="text"
                  height={32}
                  width="40%"
                  sx={{ mb: 2 }}
                />
                <TableContainer sx={{ maxHeight: "25vh" }}>
                  <Table size="small" stickyHeader>
                    <TableHeaderSkeleton columns={3} />
                    <TableSkeleton columns={3} rows={5} />
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.25, sm: 2 },
                  borderRadius: 3,
                  bgcolor: surfaceColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Skeleton
                  variant="text"
                  height={32}
                  width="40%"
                  sx={{ mb: 2 }}
                />
                <TableContainer sx={{ maxHeight: "25vh" }}>
                  <Table size="small" stickyHeader>
                    <TableHeaderSkeleton columns={3} />
                    <TableSkeleton columns={3} rows={5} />
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : (
        <>
          <Grid container spacing={2}>
            {cards.map((card) => (
              <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 1.5, sm: 1.75 },
                    borderRadius: 3,
                    bgcolor: surfaceColor,
                    border: `1px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    minHeight: 84,
                    gap: { xs: 1.25, sm: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 40, sm: 44 },
                      height: { xs: 40, sm: 44 },
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
                        color: titleColor,
                        fontWeight: 500,
                        lineHeight: 1.2,
                        mb: 0.35,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: { xs: "0.85rem", sm: "1rem" },
                      }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: valueColor,
                        lineHeight: 1,
                        letterSpacing: 0.3,
                        fontSize: { xs: "1.6rem", sm: "2rem" },
                      }}
                    >
                      <AnimatedCount value={card.value} />
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.25, sm: 2 },
                  borderRadius: 3,
                  bgcolor: surfaceColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1.5 }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <PendingActionsOutlinedIcon
                      sx={{ color: "#cf8b00", fontSize: 20 }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: headingColor,
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                      }}
                    >
                      Current Pending
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      color: titleColor,
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  >
                    Total Pending: {formatCount(pendingTotalLoads)}
                  </Typography>
                </Stack>
                <TableContainer sx={{ maxHeight: "25vh" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Transaction Date
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Customer
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Loads
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            align="center"
                            sx={{ color: tableCellColor }}
                          >
                            No pending transactions.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingTransactions.map((transaction) => (
                          <TableRow key={`pending-${transaction.id}`}>
                            <TableCell sx={{ color: tableCellColor }}>
                              {dayjs(
                                getTransactionDate(transaction, "dateReceived"),
                              ).isValid()
                                ? dayjs(
                                    getTransactionDate(
                                      transaction,
                                      "dateReceived",
                                    ),
                                  ).format("MM-DD-YY h:mm A")
                                : "-"}
                            </TableCell>
                            <TableCell sx={{ color: tableCellColor }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  gap: 1,
                                }}
                              >
                                <span>{transaction.customer?.name || "-"}</span>
                                {dayjs(
                                  getTransactionDate(
                                    transaction,
                                    "estimatedPickup",
                                  ),
                                ).isValid() ? (
                                  <Tooltip
                                    title={dayjs(
                                      getTransactionDate(
                                        transaction,
                                        "estimatedPickup",
                                      ),
                                    ).format("MM-DD-YY h:mm A")}
                                    arrow
                                  >
                                    <Box
                                      component="span"
                                      sx={{
                                        width: 18,
                                        height: 18,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#f44336",
                                      }}
                                    >
                                      <AccessTimeIcon sx={{ fontSize: 16 }} />
                                    </Box>
                                  </Tooltip>
                                ) : null}
                              </Box>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: tableCellColor }}
                            >
                              {formatCount(getTransactionLoads(transaction))}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.25, sm: 2 },
                  borderRadius: 3,
                  bgcolor: surfaceColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1.5 }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Inventory2OutlinedIcon
                      sx={{ color: "#b8871b", fontSize: 20 }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: headingColor,
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                      }}
                    >
                      Done Today
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      color: titleColor,
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  >
                    Total Loads: {formatCount(loadedTodayTotalLoads)}
                  </Typography>
                </Stack>
                <TableContainer sx={{ maxHeight: "25vh" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Transaction Date
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Customer
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Loads
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadedTodayTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            align="center"
                            sx={{ color: tableCellColor }}
                          >
                            No loaded transactions today.
                          </TableCell>
                        </TableRow>
                      ) : (
                        loadedTodayTransactions.map((transaction) => (
                          <TableRow key={`done-${transaction.id}`}>
                            <TableCell sx={{ color: tableCellColor }}>
                              {dayjs(
                                getTransactionDate(transaction, "dateLoaded"),
                              ).isValid()
                                ? dayjs(
                                    getTransactionDate(
                                      transaction,
                                      "dateLoaded",
                                    ),
                                  ).format("MM-DD-YY h:mm A")
                                : "-"}
                            </TableCell>
                            <TableCell sx={{ color: tableCellColor }}>
                              {transaction.customer?.name || "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: tableCellColor }}
                            >
                              {formatCount(getTransactionLoads(transaction))}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Dashboard;
