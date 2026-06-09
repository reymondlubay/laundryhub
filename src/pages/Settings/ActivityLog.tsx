import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ResponsiveTableContainer from "../../components/ResponsiveTableContainer/ResponsiveTableContainer";

import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  TableHeaderSkeleton,
  TableSkeleton,
} from "../../components/Skeletons/SkeletonComponents";
import { API_ERRORS } from "../../constants/messages";
import activityLogService, {
  type ActivityLogEntry,
} from "../../services/activityLogService";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";

const ACTION_OPTIONS = [
  "Added",
  "Updated",
  "Deleted",
  "Changed",
  "Signed in",
  "Signed out",
  "Marked loaded",
  "Marked pickup",
  "Marked paid",
] as const;

const MODULE_OPTIONS = [
  "Login",
  "Transactions",
  "Customers",
  "Users",
  "Inventory Items",
  "Manage Inventory",
  "Expense Items",
  "Record Expense",
  "Fixed Monthly Expenses",
  "Addons Pricing",
  "Database",
  "Activity Log",
];

const formatWhen = (value?: string | null): string => {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("MMM D, YYYY h:mm A") : "-";
};

const formatWho = (entry: ActivityLogEntry): string => {
  const name = entry.userName?.trim();
  const role = entry.userRole?.trim();
  if (name && role) return `${name} (${role})`;
  if (name) return name;
  return "—";
};

const ActivityLogPage: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [items, setItems] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [dateFrom, setDateFrom] = useState<Dayjs | null>(() => dayjs());
  const [dateTo, setDateTo] = useState<Dayjs | null>(() => dayjs());
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupConfirm, setCleanupConfirm] = useState("");
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const { enabled: isEnabled } = await activityLogService.getSettings();
      setEnabled(isEnabled);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await activityLogService.list({
        page: page + 1,
        limit: rowsPerPage,
        dateFrom: dateFrom ? dateFrom.startOf("day").toISOString() : undefined,
        dateTo: dateTo ? dateTo.endOf("day").toISOString() : undefined,
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        search: search.trim() || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, dateFrom, dateTo, moduleFilter, actionFilter, search]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleToggle = async (checked: boolean) => {
    try {
      setSettingsSaving(true);
      setError(null);
      const { enabled: next } = await activityLogService.updateSettings(checked);
      setEnabled(next);
      setSuccess(
        next ? "Activity logging turned on." : "Activity logging turned off.",
      );
      void loadLogs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCleanup = async () => {
    if (cleanupConfirm !== "CLEANUP") return;
    try {
      setCleanupLoading(true);
      setError(null);
      const { deletedCount } = await activityLogService.cleanup();
      setSuccess(
        `Cleanup complete. Removed ${deletedCount} log entries older than 2 months.`,
      );
      setCleanupOpen(false);
      setCleanupConfirm("");
      void loadLogs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setCleanupLoading(false);
    }
  };

  const emptyMessage = useMemo(() => {
    if (loading) return null;
    if (total === 0) return "No activity log entries found.";
    return null;
  }, [loading, total]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight={600}>
          Activity log
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => void handleToggle(e.target.checked)}
                disabled={settingsLoading || settingsSaving}
              />
            }
            label="Activity logging"
          />
          <Button
            variant="outlined"
            color="warning"
            onClick={() => {
              setCleanupConfirm("");
              setCleanupOpen(true);
            }}
          >
            Cleanup
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Activity log data is not included in database backups. Entries older than
        2 months are removed automatically when the server starts.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date from"
                value={dateFrom}
                onChange={(v) => {
                  setDateFrom(v);
                  setPage(0);
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date to"
                value={dateTo}
                onChange={(v) => {
                  setDateTo(v);
                  setPage(0);
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="module-filter-label">Module</InputLabel>
              <Select
                labelId="module-filter-label"
                label="Module"
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All modules</MenuItem>
                {MODULE_OPTIONS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="action-filter-label">Action</InputLabel>
              <Select
                labelId="action-filter-label"
                label="Action"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All actions</MenuItem>
                {ACTION_OPTIONS.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Search summary"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      <ResponsiveTableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            {loading ? (
              <TableHeaderSkeleton columns={5} />
            ) : (
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Who</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>What happened</TableCell>
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={5} rows={8} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatWhen(row.createdAt)}
                  </TableCell>
                  <TableCell>{formatWho(row)}</TableCell>
                  <TableCell>{row.module}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.summary}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </ResponsiveTableContainer>

      <Dialog
        open={cleanupOpen}
        onClose={ignoreBackdropClose(() => {
          if (cleanupLoading) return;
          setCleanupOpen(false);
          setCleanupConfirm("");
        })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Clean up activity log</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.5 }}>
            Type CLEANUP to delete activity log entries older than 2 months.
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={cleanupConfirm}
            onChange={(e) => setCleanupConfirm(e.target.value)}
            placeholder="CLEANUP"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCleanupOpen(false);
              setCleanupConfirm("");
            }}
            disabled={cleanupLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void handleCleanup()}
            disabled={cleanupLoading || cleanupConfirm !== "CLEANUP"}
          >
            {cleanupLoading ? "Cleaning…" : "Run cleanup"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActivityLogPage;
