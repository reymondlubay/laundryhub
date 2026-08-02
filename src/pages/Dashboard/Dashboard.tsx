import React, { startTransition } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Switch,
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
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeliveryDiningOutlinedIcon from "@mui/icons-material/DeliveryDiningOutlined";
import HistoryIcon from "@mui/icons-material/History";
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
import hostingService, {
  type HostingStatus,
} from "../../services/hostingService";
import { toPascalCase } from "../../utils/stringUtils";
import { getLoadsThresholdColor } from "../../utils/loadsThresholdColor";
import { getTransactionNoteDetailLines } from "../../utils/transactionNoteDetails";
import {
  getLatestPickupDateOnDate,
  getPickupLoadsOnDate,
  getRemainingLoads,
  isFullyPickedUp,
  transactionHadPickupOnDate,
} from "../../utils/transactionPickup";

const DASHBOARD_AUTO_REFRESH_KEY = "laundryhub.dashboard.autoRefresh";
const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;
const HOSTING_STATUS_POLL_MS = 30_000;

type DashboardCard = {
  key: string;
  title: string;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
  /** Shown after value as loads | transactions. */
  valueParenCount?: number;
  /** Shown after secondaryValue as loads | transactions. */
  secondaryParenCount?: number;
  /** Shown after the title as | N, using loads threshold color. */
  titleCount?: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

const formatCount = (value: number): string => {
  return Math.round(value).toLocaleString("en-US");
};

const splitPipedLabels = (label: string): string[] =>
  label.split("|").map((s) => s.trim()).filter((s) => s.length > 0);

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
  const endValue = Math.max(0, Math.round(Number(value) || 0));
  const [displayValue, setDisplayValue] = React.useState(0);
  const displayRef = React.useRef(0);

  React.useEffect(() => {
    const startValue = displayRef.current;
    if (startValue === endValue) return;

    let cancelled = false;
    const durationMs = 520;
    const t0 = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - t0;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const next = Math.round(startValue + (endValue - startValue) * eased);
      displayRef.current = next;
      setDisplayValue(next);
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        displayRef.current = endValue;
        setDisplayValue(endValue);
      }
    };

    const id = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [endValue]);

  return <>{formatCount(displayValue)}</>;
};

const isTransactionForDelivery = (transaction: Transaction): boolean => {
  const tx = transaction as Transaction & { isdelivered?: boolean };
  return Boolean(transaction.isDelivered ?? tx.isdelivered);
};

const isReadyForDelivery = (transaction: Transaction): boolean => {
  const hasLoadedDate = Boolean(getTransactionDate(transaction, "dateLoaded"));
  return (
    hasLoadedDate &&
    !isFullyPickedUp(transaction) &&
    isTransactionForDelivery(transaction)
  );
};

const Dashboard = () => {
  const { darkMode } = useThemeContext();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date | null>(null);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(() => {
    try {
      return window.localStorage.getItem(DASHBOARD_AUTO_REFRESH_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [hostingStatus, setHostingStatus] =
    React.useState<HostingStatus | null>(null);
  const [hostingLoading, setHostingLoading] = React.useState(true);
  const [hostingStarting, setHostingStarting] = React.useState(false);
  const [hostingSnackbar, setHostingSnackbar] = React.useState<{
    severity: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const fetchSeqRef = React.useRef(0);
  const hostingSeqRef = React.useRef(0);

  const loadTransactions = React.useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const seq = ++fetchSeqRef.current;

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const transactionData = await transactionService.getAll();
      if (fetchSeqRef.current !== seq) return;

      const nextTransactions = transactionData.filter(
        (t) =>
          !t.isDeleted &&
          !(t as Transaction & { isdeleted?: boolean }).isdeleted,
      );

      const apply = () => {
        setTransactions(nextTransactions);
        setLastUpdatedAt(new Date());
        setRefreshError(null);
        setError(null);
      };

      if (silent) {
        startTransition(apply);
      } else {
        apply();
      }
    } catch (err: unknown) {
      if (fetchSeqRef.current !== seq) return;
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard data.";
      if (silent) {
        setRefreshError(message);
      } else {
        setError(message);
      }
    } finally {
      if (fetchSeqRef.current === seq && !silent) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void loadTransactions({ silent: false });
  }, [loadTransactions]);

  React.useEffect(() => {
    if (!autoRefreshEnabled || loading) return;

    const tick = () => {
      if (document.hidden) return;
      void loadTransactions({ silent: true });
    };

    const id = window.setInterval(tick, DASHBOARD_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [autoRefreshEnabled, loadTransactions, loading]);

  const loadHostingStatus = React.useCallback(async () => {
    const seq = ++hostingSeqRef.current;
    try {
      const status = await hostingService.getStatus();
      if (hostingSeqRef.current !== seq) return;
      setHostingStatus(status);
    } catch {
      if (hostingSeqRef.current !== seq) return;
      setHostingStatus({
        status: "error",
        taskName: "",
        processRunning: false,
        taskRunning: false,
        autoStartEnabled: false,
        enabled: true,
        message: "Unable to check hosting status.",
      });
    } finally {
      if (hostingSeqRef.current === seq) {
        setHostingLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void loadHostingStatus();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void loadHostingStatus();
    }, HOSTING_STATUS_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadHostingStatus]);

  const handleStartHosting = React.useCallback(async () => {
    setHostingStarting(true);
    try {
      const result = await hostingService.start();
      setHostingStatus(result);
      if (result.status === "running") {
        setHostingSnackbar({
          severity: "success",
          message: result.alreadyRunning
            ? "Hosting is already online."
            : "Hosting started successfully.",
        });
      } else if (result.status === "starting") {
        setHostingSnackbar({
          severity: "warning",
          message:
            result.message ||
            "Start requested. Waiting for the tunnel to come online.",
        });
        window.setTimeout(() => {
          void loadHostingStatus();
        }, 2_000);
      } else if (result.status === "unsupported") {
        setHostingSnackbar({
          severity: "warning",
          message: result.message || "Hosting controls are unavailable.",
        });
      } else {
        setHostingSnackbar({
          severity: "error",
          message: result.message || "Failed to start hosting.",
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start hosting.";
      setHostingSnackbar({ severity: "error", message });
    } finally {
      setHostingStarting(false);
    }
  }, [loadHostingStatus]);

  const persistAutoRefresh = React.useCallback((enabled: boolean) => {
    setAutoRefreshEnabled(enabled);
    try {
      window.localStorage.setItem(DASHBOARD_AUTO_REFRESH_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const showHostingControls =
    hostingLoading ||
    (hostingStatus != null && hostingStatus.status !== "unsupported");

  const hostingChipLabel = hostingLoading
    ? "Checking hosting…"
    : hostingStarting || hostingStatus?.status === "starting"
      ? "Hosting starting…"
      : hostingStatus?.status === "running"
        ? "Hosting Online"
        : hostingStatus?.status === "error"
          ? "Hosting Error"
          : "Hosting Offline";

  const hostingChipColor: "default" | "success" | "error" | "warning" =
    hostingLoading
      ? "default"
      : hostingStarting || hostingStatus?.status === "starting"
        ? "warning"
        : hostingStatus?.status === "running"
          ? "success"
          : "error";

  const canStartHosting =
    !hostingLoading &&
    !hostingStarting &&
    hostingStatus != null &&
    (hostingStatus.status === "stopped" || hostingStatus.status === "error");

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

    const todaysLoaded = activeTransactions
      .filter((transaction) =>
        isSameDay(getTransactionDate(transaction, "dateLoaded")),
      )
      .reduce((sum, transaction) => sum + getTransactionLoads(transaction), 0);

    const todaysPickup = activeTransactions.filter((transaction) =>
      transactionHadPickupOnDate(transaction, isSameDay),
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

    const readyForPickupCount = activeTransactions.filter((transaction) => {
      const hasLoadedDate = Boolean(
        getTransactionDate(transaction, "dateLoaded"),
      );
      return hasLoadedDate && !isFullyPickedUp(transaction);
    }).length;

    const readyForDeliveryCount = activeTransactions.filter(isReadyForDelivery)
      .length;

    return {
      todaysTransactions,
      todaysLoad,
      todaysLoaded,
      todaysPending,
      todaysPaid,
      todaysPickup,
      readyForPickupCount,
      readyForDeliveryCount,
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
        return bDate.valueOf() - aDate.valueOf();
      });
  }, [activeTransactions]);

  const sumPendingLoads = React.useCallback(
    (list: Transaction[]) =>
      list.reduce(
        (sum, transaction) => sum + getTransactionLoads(transaction),
        0,
      ),
    [],
  );

  const pendingTodayLoads = React.useMemo(
    () =>
      sumPendingLoads(
        pendingTransactions.filter((transaction) =>
          isSameDay(getTransactionDate(transaction, "dateReceived")),
        ),
      ),
    [pendingTransactions, sumPendingLoads],
  );

  const pendingOlderLoads = React.useMemo(
    () =>
      sumPendingLoads(
        pendingTransactions.filter((transaction) => {
          const received = getTransactionDate(transaction, "dateReceived");
          if (!received) return true;
          const date = dayjs(received);
          return !date.isValid() || !date.isSame(dayjs(), "day");
        }),
      ),
    [pendingTransactions, sumPendingLoads],
  );

  const pendingTotalLoads = React.useMemo(
    () => sumPendingLoads(pendingTransactions),
    [pendingTransactions, sumPendingLoads],
  );

  const loadedTodayTotalLoads = React.useMemo(
    () =>
      loadedTodayTransactions.reduce(
        (sum, transaction) => sum + getTransactionLoads(transaction),
        0,
      ),
    [loadedTodayTransactions],
  );

  const readyForPickupTransactions = React.useMemo(() => {
    return activeTransactions
      .filter((transaction) => {
        const hasLoadedDate = Boolean(
          getTransactionDate(transaction, "dateLoaded"),
        );
        return hasLoadedDate && !isFullyPickedUp(transaction);
      })
      .sort((a, b) => {
        const aDate = dayjs(getTransactionDate(a, "dateLoaded"));
        const bDate = dayjs(getTransactionDate(b, "dateLoaded"));
        if (!aDate.isValid() && !bDate.isValid()) return 0;
        if (!aDate.isValid()) return 1;
        if (!bDate.isValid()) return -1;
        return aDate.valueOf() - bDate.valueOf();
      });
  }, [activeTransactions]);

  const pickupTodayTransactions = React.useMemo(() => {
    return activeTransactions
      .filter((transaction) =>
        transactionHadPickupOnDate(transaction, isSameDay),
      )
      .sort((a, b) => {
        const aDate = dayjs(getLatestPickupDateOnDate(a, isSameDay));
        const bDate = dayjs(getLatestPickupDateOnDate(b, isSameDay));
        if (!aDate.isValid() && !bDate.isValid()) return 0;
        if (!aDate.isValid()) return 1;
        if (!bDate.isValid()) return -1;
        return bDate.valueOf() - aDate.valueOf();
      });
  }, [activeTransactions]);

  const pickupTodayTotalLoads = React.useMemo(
    () =>
      pickupTodayTransactions.reduce(
        (sum, transaction) => sum + getPickupLoadsOnDate(transaction, isSameDay),
        0,
      ),
    [pickupTodayTransactions],
  );

  const readyForPickupTotalLoads = React.useMemo(
    () =>
      readyForPickupTransactions.reduce(
        (sum, transaction) => sum + getRemainingLoads(transaction),
        0,
      ),
    [readyForPickupTransactions],
  );

  const readyForDeliveryTransactions = React.useMemo(() => {
    return activeTransactions
      .filter(isReadyForDelivery)
      .sort((a, b) => {
        const aDate = dayjs(getTransactionDate(a, "dateLoaded"));
        const bDate = dayjs(getTransactionDate(b, "dateLoaded"));
        if (!aDate.isValid() && !bDate.isValid()) return 0;
        if (!aDate.isValid()) return 1;
        if (!bDate.isValid()) return -1;
        return aDate.valueOf() - bDate.valueOf();
      });
  }, [activeTransactions]);

  const readyForDeliveryTotalLoads = React.useMemo(
    () =>
      readyForDeliveryTransactions.reduce(
        (sum, transaction) => sum + getRemainingLoads(transaction),
        0,
      ),
    [readyForDeliveryTransactions],
  );

  // Loads received before today that were not loaded before today
  // (still pending, or loaded today — count does not drop when loaded today).
  const availableOlderTransactions = React.useMemo(
    () =>
      activeTransactions.filter((transaction) => {
        const received = getTransactionDate(transaction, "dateReceived");
        if (received) {
          const date = dayjs(received);
          if (date.isValid() && date.isSame(dayjs(), "day")) return false;
        }
        const loaded = getTransactionDate(transaction, "dateLoaded");
        return !loaded || isSameDay(loaded);
      }),
    [activeTransactions],
  );

  const availableOlderLoads = React.useMemo(
    () =>
      availableOlderTransactions.reduce(
        (sum, transaction) => sum + getTransactionLoads(transaction),
        0,
      ),
    [availableOlderTransactions],
  );

  const availableTodayLoads = metrics.todaysLoad;
  const availableTodayTransactions = metrics.todaysTransactions;
  const totalAvailableLoads = availableOlderLoads + availableTodayLoads;

  const cards: DashboardCard[] = [
    {
      key: "total-available-loads",
      title: "Available Loads",
      titleCount: totalAvailableLoads,
      value: availableOlderLoads,
      valueParenCount: availableOlderTransactions.length,
      secondaryValue: availableTodayLoads,
      secondaryParenCount: availableTodayTransactions,
      secondaryLabel: "Older | Today",
      icon: <HistoryIcon />,
      iconBg: "#e8f0fe",
      iconColor: "#1976d2",
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
    {
      key: "ready-for-pickup",
      title: "Ready for Pickup",
      value: metrics.readyForPickupCount,
      secondaryValue: readyForPickupTotalLoads,
      secondaryLabel: "Transactions | Loads",
      icon: <CheckCircleOutlineIcon />,
      iconBg: "#e8f7f1",
      iconColor: "#1d9a72",
    },
    {
      key: "ready-for-delivery",
      title: "Ready for Delivery",
      value: metrics.readyForDeliveryCount,
      secondaryValue: readyForDeliveryTotalLoads,
      secondaryLabel: "Transactions | Loads",
      icon: <DeliveryDiningOutlinedIcon />,
      iconBg: "#e3f2fd",
      iconColor: "#1976d2",
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
  const tableTotalValueColor = darkMode ? "#42a5f5" : "#1976d2";

  const tableTotalNum = (value: number) => (
    <Box component="span" sx={{ color: tableTotalValueColor }}>
      {formatCount(value)}
    </Box>
  );

  const tableTotalLabelSx = {
    color: titleColor,
    fontWeight: 700,
    textAlign: "right" as const,
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: headingColor,
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
          }}
        >
          Dashboard
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          flexWrap="wrap"
          useFlexGap
        >
          {showHostingControls ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip
                title={
                  hostingStatus?.message ||
                  (hostingStatus?.autoStartEnabled
                    ? "Backend auto-starts the Cloudflare tunnel if it stops."
                    : "Cloudflare tunnel hosting status")
                }
              >
                <Chip
                  size="small"
                  color={hostingChipColor}
                  label={hostingChipLabel}
                  variant={
                    hostingStatus?.status === "running" ? "filled" : "outlined"
                  }
                  icon={
                    hostingLoading || hostingStarting ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : undefined
                  }
                />
              </Tooltip>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  void handleStartHosting();
                }}
                disabled={!canStartHosting}
              >
                Start Hosting
              </Button>
            </Stack>
          ) : null}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoRefreshEnabled}
                onChange={(_, checked) => persistAutoRefresh(checked)}
                disabled={loading}
                inputProps={{ "aria-label": "Auto refresh dashboard data" }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: titleColor }}>
                Auto refresh (30s)
              </Typography>
            }
            sx={{ mr: 0 }}
          />
          {lastUpdatedAt ? (
            <Typography
              variant="caption"
              sx={{
                color: titleColor,
                opacity: 0.9,
                fontVariantNumeric: "tabular-nums",
                minWidth: "12.5rem",
                textAlign: { xs: "left", sm: "right" },
              }}
            >
              Last updated: {dayjs(lastUpdatedAt).format("h:mm:ss A")}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      <Snackbar
        open={Boolean(refreshError)}
        autoHideDuration={6000}
        onClose={() => setRefreshError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setRefreshError(null)}
          severity="warning"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {refreshError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(hostingSnackbar)}
        autoHideDuration={6000}
        onClose={() => setHostingSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setHostingSnackbar(null)}
          severity={hostingSnackbar?.severity ?? "info"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {hostingSnackbar?.message}
        </Alert>
      </Snackbar>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <>
          <DashboardCardsSkeleton count={7} />

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
                <TableContainer sx={{ maxHeight: "35vh" }}>
                  <Table size="small" stickyHeader>
                    <TableHeaderSkeleton columns={5} />
                    <TableSkeleton columns={5} rows={5} />
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
                <TableContainer sx={{ maxHeight: "35vh" }}>
                  <Table size="small" stickyHeader>
                    <TableHeaderSkeleton columns={4} />
                    <TableSkeleton columns={4} rows={5} />
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : (
        <>
          <Grid container spacing={2} alignItems="stretch">
            {cards.map((card) => {
              const pairedLabels = card.secondaryLabel
                ? splitPipedLabels(card.secondaryLabel)
                : [];
              const secondaryVal = card.secondaryValue;
              const usePairedMetricLayout =
                typeof secondaryVal === "number" &&
                pairedLabels.length === 2;

              const titleCountColor =
                typeof card.titleCount === "number"
                  ? getLoadsThresholdColor(card.titleCount)
                  : undefined;

              const loadsThresholdColor =
                card.key === "todays-loaded"
                  ? getLoadsThresholdColor(card.value)
                  : card.key === "total-available-loads" &&
                      typeof secondaryVal === "number"
                    ? getLoadsThresholdColor(secondaryVal)
                    : undefined;

              const primaryValueColor =
                card.key === "total-available-loads"
                  ? getLoadsThresholdColor(card.value)
                  : undefined;

              const valueTypographySx = {
                fontWeight: 700,
                color: valueColor,
                lineHeight: 1,
                letterSpacing: 0.3,
                fontSize: { xs: "1.6rem", sm: "2rem" },
              } as const;

              const metricCaptionSx = {
                display: "block",
                color: titleColor,
                fontWeight: 500,
                mt: 0.35,
                lineHeight: 1.1,
                fontSize: { xs: "0.65rem", sm: "0.7rem" },
              } as const;

              return (
              <Grid
                key={card.key}
                size={{ xs: 12, sm: 6, lg: 3 }}
                sx={{ display: "flex", flexDirection: "column" }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 1.5, sm: 1.75 },
                    borderRadius: 3,
                    bgcolor: surfaceColor,
                    border: `1px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    flex: 1,
                    width: "100%",
                    minHeight: { xs: 118, sm: 124 },
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

                  <Box sx={{ minWidth: 0, flex: 1 }}>
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
                      {typeof card.titleCount === "number" ? (
                        <>
                          {" | "}
                          <Box
                            component="span"
                            style={{
                              color: titleCountColor ?? titleColor,
                              fontWeight: 700,
                            }}
                          >
                            <AnimatedCount value={card.titleCount} />
                          </Box>
                        </>
                      ) : null}
                    </Typography>
                    {usePairedMetricLayout ? (
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto 1fr",
                          alignItems: "stretch",
                          width: "100%",
                          mt: 0.15,
                        }}
                      >
                        <Box
                          sx={{
                            minWidth: 0,
                            textAlign: "center",
                            pr: { xs: 1, sm: 1.25 },
                          }}
                        >
                          <Typography
                            variant="h4"
                            sx={{
                              ...valueTypographySx,
                              ...(primaryValueColor
                                ? { color: primaryValueColor }
                                : {}),
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <AnimatedCount value={card.value} />
                            {typeof card.valueParenCount === "number" ? (
                              <>
                                <Box
                                  component="span"
                                  sx={{
                                    mx: { xs: 0.45, sm: 0.6 },
                                    color: titleColor,
                                    fontWeight: 500,
                                    fontSize: { xs: "1rem", sm: "1.15rem" },
                                    lineHeight: 1,
                                  }}
                                >
                                  |
                                </Box>
                                <Box
                                  component="span"
                                  sx={{
                                    fontWeight: 700,
                                    color: valueColor,
                                    fontSize: { xs: "1rem", sm: "1.15rem" },
                                    lineHeight: 1,
                                  }}
                                >
                                  {formatCount(card.valueParenCount)}
                                </Box>
                              </>
                            ) : null}
                          </Typography>
                          <Typography variant="caption" sx={metricCaptionSx}>
                            {pairedLabels[0]}
                          </Typography>
                        </Box>
                        <Box
                          aria-hidden
                          sx={{
                            width: 1,
                            flexShrink: 0,
                            alignSelf: "stretch",
                            bgcolor: borderColor,
                            opacity: 0.7,
                            borderRadius: 0.5,
                            my: 0.35,
                            justifySelf: "center",
                          }}
                        />
                        <Box
                          sx={{
                            minWidth: 0,
                            textAlign: "center",
                            pl: { xs: 1, sm: 1.25 },
                          }}
                        >
                          <Typography
                            variant="h4"
                            sx={{
                              ...valueTypographySx,
                              ...(loadsThresholdColor
                                ? { color: loadsThresholdColor }
                                : {}),
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <AnimatedCount value={secondaryVal} />
                            {typeof card.secondaryParenCount === "number" ? (
                              <>
                                <Box
                                  component="span"
                                  sx={{
                                    mx: { xs: 0.45, sm: 0.6 },
                                    color: titleColor,
                                    fontWeight: 500,
                                    fontSize: { xs: "1rem", sm: "1.15rem" },
                                    lineHeight: 1,
                                  }}
                                >
                                  |
                                </Box>
                                <Box
                                  component="span"
                                  sx={{
                                    fontWeight: 700,
                                    color: valueColor,
                                    fontSize: { xs: "1rem", sm: "1.15rem" },
                                    lineHeight: 1,
                                  }}
                                >
                                  {formatCount(card.secondaryParenCount)}
                                </Box>
                              </>
                            ) : null}
                          </Typography>
                          <Typography variant="caption" sx={metricCaptionSx}>
                            {pairedLabels[1]}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: loadsThresholdColor ?? valueColor,
                        lineHeight: 1,
                        letterSpacing: 0.3,
                        fontSize: { xs: "1.6rem", sm: "2rem" },
                      }}
                    >
                      <AnimatedCount value={card.value} />
                      {typeof card.secondaryValue === "number" ? (
                        <>
                          <Box
                            component="span"
                            sx={{
                              mx: { xs: 0.6, sm: 0.85 },
                              color: titleColor,
                              fontWeight: 500,
                            }}
                          >
                            |
                          </Box>
                          <AnimatedCount value={card.secondaryValue} />
                        </>
                      ) : null}
                    </Typography>
                    {card.secondaryLabel && !usePairedMetricLayout ? (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: titleColor,
                          fontWeight: 500,
                          mt: 0.35,
                          lineHeight: 1.1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: { xs: "0.65rem", sm: "0.7rem" },
                        }}
                      >
                        {card.secondaryLabel}
                      </Typography>
                    ) : null}
                      </>
                    )}
                  </Box>
                </Paper>
              </Grid>
              );
            })}
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
                <Stack spacing={0.75} sx={{ mb: 1.5 }}>
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
                      ...tableTotalLabelSx,
                      whiteSpace: "nowrap",
                      fontSize: { xs: "0.7rem", sm: "0.875rem" },
                    }}
                  >
                    Today: {tableTotalNum(pendingTodayLoads)}
                    {" · "}
                    Older than Today: {tableTotalNum(pendingOlderLoads)}
                    {" · "}
                    Total Pending: {tableTotalNum(pendingTotalLoads)}
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
                                  gap: 0.75,
                                }}
                              >
                                <span>
                                  {toPascalCase(
                                    transaction.customer?.name || "-",
                                  )}
                                </span>
                                <Stack
                                  direction="row"
                                  spacing={0.25}
                                  alignItems="center"
                                  sx={{ flexShrink: 0 }}
                                >
                                  {(() => {
                                    const noteDetails =
                                      getTransactionNoteDetailLines(
                                        transaction,
                                      );
                                    if (noteDetails.length === 0) return null;
                                    return (
                                      <Tooltip
                                        title={
                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 0.25,
                                            }}
                                          >
                                            {noteDetails.map((line, idx) => (
                                              <span
                                                key={`${transaction.id}-nd-${idx}`}
                                              >
                                                {line}
                                              </span>
                                            ))}
                                          </Box>
                                        }
                                        arrow
                                      >
                                        <Box
                                          component="span"
                                          sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            color: "#f44336",
                                            cursor: "pointer",
                                          }}
                                        >
                                          <InfoOutlinedIcon
                                            sx={{ fontSize: 16 }}
                                          />
                                        </Box>
                                      </Tooltip>
                                    );
                                  })()}
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
                                        <HourglassTopIcon sx={{ fontSize: 16 }} />
                                      </Box>
                                    </Tooltip>
                                  ) : null}
                                </Stack>
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
                  <Typography variant="body2" sx={tableTotalLabelSx}>
                    Total Loads: {tableTotalNum(loadedTodayTotalLoads)}
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
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Loaded Date
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
                            colSpan={4}
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
                              {toPascalCase(transaction.customer?.name || "-")}
                            </TableCell>
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

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
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
                    <CheckCircleOutlineIcon
                      sx={{ color: "#1d9a72", fontSize: 20 }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: headingColor,
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                      }}
                    >
                      Ready for Pickup
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={tableTotalLabelSx}>
                    Transactions:{" "}
                    {tableTotalNum(readyForPickupTransactions.length)} | Loads:{" "}
                    {tableTotalNum(readyForPickupTotalLoads)}
                  </Typography>
                </Stack>
                <TableContainer sx={{ maxHeight: "35vh" }}>
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
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Loaded Date
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Date Paid
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
                      {readyForPickupTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            align="center"
                            sx={{ color: tableCellColor }}
                          >
                            No transactions ready for pickup.
                          </TableCell>
                        </TableRow>
                      ) : (
                        readyForPickupTransactions.map((transaction) => {
                          const payments = transaction.paymentDetails || [];
                          const totalPaid = payments.reduce(
                            (sum, p) => sum + (Number(p.amount) || 0),
                            0,
                          );
                          const lastPaymentDate =
                            payments.length > 0
                              ? payments[payments.length - 1].paymentDate
                              : null;
                          const paymentHistoryTooltip =
                            payments.length === 0
                              ? "No payments"
                              : payments
                                  .map(
                                    (p) =>
                                      `${dayjs(p.paymentDate).format(
                                        "MM-DD-YY h:mm A",
                                      )} - ${new Intl.NumberFormat("en-PH", {
                                        style: "currency",
                                        currency: "PHP",
                                      }).format(Number(p.amount) || 0)}`,
                                  )
                                  .join("\n");

                          return (
                            <TableRow key={`ready-${transaction.id}`}>
                              <TableCell sx={{ color: tableCellColor }}>
                                {dayjs(
                                  getTransactionDate(
                                    transaction,
                                    "dateReceived",
                                  ),
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
                                {toPascalCase(
                                  transaction.customer?.name || "-",
                                )}
                              </TableCell>
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
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 1,
                                  }}
                                >
                                  <span>
                                    {lastPaymentDate
                                      ? dayjs(lastPaymentDate).format(
                                          "MM-DD-YY h:mm A",
                                        )
                                      : "-"}
                                  </span>
                                  {payments.length > 0 && (
                                    <Tooltip
                                      title={
                                        <Box
                                          sx={{
                                            whiteSpace: "pre-line",
                                            fontSize: "0.875rem",
                                          }}
                                        >
                                          <div>
                                            <strong>Payment History</strong>
                                          </div>
                                          <div>{paymentHistoryTooltip}</div>
                                          <div style={{ marginTop: "0.5rem" }}>
                                            <strong>
                                              Total Paid:{" "}
                                              {new Intl.NumberFormat("en-PH", {
                                                style: "currency",
                                                currency: "PHP",
                                              }).format(totalPaid)}
                                            </strong>
                                          </div>
                                        </Box>
                                      }
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
                                          color: "#1d9a72",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <HistoryIcon sx={{ fontSize: 16 }} />
                                      </Box>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: tableCellColor }}
                              >
                                {formatCount(getRemainingLoads(transaction))}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

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
                    <DeliveryDiningOutlinedIcon
                      sx={{ color: "#1976d2", fontSize: 20 }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: headingColor,
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                      }}
                    >
                      Ready for Delivery
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={tableTotalLabelSx}>
                    Transactions:{" "}
                    {tableTotalNum(readyForDeliveryTransactions.length)} | Loads:{" "}
                    {tableTotalNum(readyForDeliveryTotalLoads)}
                  </Typography>
                </Stack>
                <TableContainer sx={{ maxHeight: "35vh" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: tableHeadBg, color: tableHeadColor, fontWeight: 700, whiteSpace: "nowrap" }}>
                          Transaction Date
                        </TableCell>
                        <TableCell sx={{ bgcolor: tableHeadBg, color: tableHeadColor, fontWeight: 700, whiteSpace: "nowrap" }}>
                          Customer
                        </TableCell>
                        <TableCell sx={{ bgcolor: tableHeadBg, color: tableHeadColor, fontWeight: 700, whiteSpace: "nowrap" }}>
                          Loaded Date
                        </TableCell>
                        <TableCell sx={{ bgcolor: tableHeadBg, color: tableHeadColor, fontWeight: 700, whiteSpace: "nowrap" }}>
                          Date Paid
                        </TableCell>
                        <TableCell align="right" sx={{ bgcolor: tableHeadBg, color: tableHeadColor, fontWeight: 700, whiteSpace: "nowrap" }}>
                          Loads
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {readyForDeliveryTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ color: tableCellColor }}>
                            No transactions ready for delivery.
                          </TableCell>
                        </TableRow>
                      ) : (
                        readyForDeliveryTransactions.map((transaction) => {
                          const payments = transaction.paymentDetails || [];
                          const totalPaid = payments.reduce(
                            (sum, p) => sum + (Number(p.amount) || 0),
                            0,
                          );
                          const lastPaymentDate =
                            payments.length > 0
                              ? payments[payments.length - 1].paymentDate
                              : null;
                          const paymentHistoryTooltip =
                            payments.length === 0
                              ? "No payments"
                              : payments
                                  .map(
                                    (p) =>
                                      `${dayjs(p.paymentDate).format("MM-DD-YY h:mm A")} - ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(p.amount) || 0)}`,
                                  )
                                  .join("\n");

                          return (
                            <TableRow key={`delivery-${transaction.id}`}>
                              <TableCell sx={{ color: tableCellColor }}>
                                {dayjs(getTransactionDate(transaction, "dateReceived")).isValid()
                                  ? dayjs(getTransactionDate(transaction, "dateReceived")).format("MM-DD-YY h:mm A")
                                  : "-"}
                              </TableCell>
                              <TableCell sx={{ color: tableCellColor }}>
                                {toPascalCase(transaction.customer?.name || "-")}
                              </TableCell>
                              <TableCell sx={{ color: tableCellColor }}>
                                {dayjs(getTransactionDate(transaction, "dateLoaded")).isValid()
                                  ? dayjs(getTransactionDate(transaction, "dateLoaded")).format("MM-DD-YY h:mm A")
                                  : "-"}
                              </TableCell>
                              <TableCell sx={{ color: tableCellColor }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                  <span>
                                    {lastPaymentDate
                                      ? dayjs(lastPaymentDate).format("MM-DD-YY h:mm A")
                                      : "-"}
                                  </span>
                                  {payments.length > 0 && (
                                    <Tooltip
                                      title={
                                        <Box sx={{ whiteSpace: "pre-line", fontSize: "0.875rem" }}>
                                          <div><strong>Payment History</strong></div>
                                          <div>{paymentHistoryTooltip}</div>
                                          <div style={{ marginTop: "0.5rem" }}>
                                            <strong>
                                              Total Paid:{" "}
                                              {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(totalPaid)}
                                            </strong>
                                          </div>
                                        </Box>
                                      }
                                      arrow
                                    >
                                      <Box component="span" sx={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#1d9a72", cursor: "pointer" }}>
                                        <HistoryIcon sx={{ fontSize: 16 }} />
                                      </Box>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right" sx={{ color: tableCellColor }}>
                                {formatCount(getRemainingLoads(transaction))}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
              </Stack>
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
                    <LocalShippingOutlinedIcon
                      sx={{ color: "#80a93a", fontSize: 20 }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: headingColor,
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                      }}
                    >
                      Pickup Today
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={tableTotalLabelSx}>
                    Total Loads: {tableTotalNum(pickupTodayTotalLoads)}
                  </Typography>
                </Stack>
                <TableContainer sx={{ maxHeight: "35vh" }}>
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
                          sx={{
                            bgcolor: tableHeadBg,
                            color: tableHeadColor,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Pickup Date
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
                      {pickupTodayTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            align="center"
                            sx={{ color: tableCellColor }}
                          >
                            No pickups scheduled for today.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pickupTodayTransactions.map((transaction) => (
                          <TableRow key={`pickup-${transaction.id}`}>
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
                              {toPascalCase(transaction.customer?.name || "-")}
                            </TableCell>
                            <TableCell sx={{ color: tableCellColor }}>
                              {(() => {
                                const pickupDate = getLatestPickupDateOnDate(
                                  transaction,
                                  isSameDay,
                                );
                                return pickupDate && dayjs(pickupDate).isValid()
                                  ? dayjs(pickupDate).format("MM-DD-YY h:mm A")
                                  : "-";
                              })()}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: tableCellColor }}
                            >
                              {formatCount(
                                getPickupLoadsOnDate(transaction, isSameDay),
                              )}
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
