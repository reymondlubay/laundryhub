import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
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
import { Navigate } from "react-router-dom";
import dayjs from "dayjs";
import route from "../../constants/route";
import { isAdmin } from "../../utils/roleAccess";
import auditLogService, {
  type AuditLogItem,
} from "../../services/auditLogService";
import {
  TableSkeleton,
  TableHeaderSkeleton,
} from "../../components/Skeletons/SkeletonComponents";
import { UI_TEXT } from "../../constants/messages";

const MAX_CELL = 120;

function clip(text: string | null | undefined): string {
  if (text == null || text === "") return "—";
  const s = String(text);
  return s.length > MAX_CELL ? `${s.slice(0, MAX_CELL)}…` : s;
}

const AuditLogPage: React.FC = () => {
  const admin = isAdmin();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState("");
  const [activeModule, setActiveModule] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [auditLoggingEnabled, setAuditLoggingEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      setSettingsError(null);
      const s = await auditLogService.getSettings();
      setAuditLoggingEnabled(s.auditLoggingEnabled);
    } catch (err: unknown) {
      setSettingsError(
        err instanceof Error ? err.message : "Failed to load audit settings.",
      );
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await auditLogService.getList({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        module: activeModule.trim() || undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load audit logs.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, activeModule]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setPage(0);
    setActiveModule(moduleFilter.trim());
  };

  const handleToggleAuditLogging = async (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    const previous = auditLoggingEnabled;
    setAuditLoggingEnabled(checked);
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      const s = await auditLogService.updateSettings({
        auditLoggingEnabled: checked,
      });
      setAuditLoggingEnabled(s.auditLoggingEnabled);
    } catch (err: unknown) {
      setAuditLoggingEnabled(previous);
      setSettingsError(
        err instanceof Error ? err.message : "Failed to update audit settings.",
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  if (!admin) {
    return <Navigate to={route.DASHBOARD} replace />;
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Audit log
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Field-level history for updates to users, customers, transactions, and
        add-ons pricing.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Audit logging
            </Typography>
            <Typography variant="body2" color="text.secondary">
              When off, the system stops writing new rows to this log. Existing
              entries are kept.
            </Typography>
          </Box>
          {settingsLoading ? (
            <CircularProgress size={28} />
          ) : (
            <FormControlLabel
              control={
                <Switch
                  checked={auditLoggingEnabled}
                  onChange={handleToggleAuditLogging}
                  disabled={settingsSaving}
                  color="primary"
                />
              }
              label={auditLoggingEnabled ? "On" : "Off"}
              labelPlacement="start"
            />
          )}
        </Stack>
      </Paper>

      {settingsError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSettingsError(null)}>
          {settingsError}
        </Alert>
      ) : null}

      {!auditLoggingEnabled && !settingsLoading ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Audit logging is off. Changes to users, customers, transactions, and
          add-ons pricing are not being recorded.
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          label="Filter by module"
          placeholder="e.g. Transaction"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          sx={{ minWidth: { sm: 220 } }}
        />
        <Button variant="outlined" size="small" onClick={handleSearch}>
          {UI_TEXT.SEARCH}
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper>
        {loading ? (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHeaderSkeleton columns={6} />
              <TableSkeleton columns={6} rows={8} />
            </Table>
          </TableContainer>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "calc(100vh - 280px)" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Module</TableCell>
                    <TableCell>Edited field</TableCell>
                    <TableCell>Original value</TableCell>
                    <TableCell>New value</TableCell>
                    <TableCell>Date time changed</TableCell>
                    <TableCell>User name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No audit entries yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.module}</TableCell>
                        <TableCell>{row.fieldName}</TableCell>
                        <TableCell>
                          <Tooltip title={row.originalValue ?? ""} placement="top">
                            <span>{clip(row.originalValue)}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={row.newValue ?? ""} placement="top">
                            <span>{clip(row.newValue)}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {dayjs(row.changedAt).format("MM-DD-YYYY h:mm A")}
                        </TableCell>
                        <TableCell>{row.userName}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
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
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AuditLogPage;
