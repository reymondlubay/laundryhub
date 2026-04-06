import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import authService from "../../services/authService";
import backupService, { type BackupItem } from "../../services/backupService";
import { useThemeContext } from "../../components/ThemeContext/ThemeContext";

const formatSize = (bytes: number): string => {
  if (!bytes || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const DatabaseSettings: React.FC = () => {
  const { darkMode } = useThemeContext();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === "Admin";

  const [backups, setBackups] = React.useState<BackupItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [restoreId, setRestoreId] = React.useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = React.useState(false);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const hasPendingOperation = backups.some((item) => item.status === "Pending");
  const surfaceColor = darkMode ? "#1b222c" : "#ffffff";
  const borderColor = darkMode ? "#2b3440" : "#e8edf3";
  const headingColor = darkMode ? "#eef5ff" : "#0d213f";
  const cellColor = darkMode ? "#d8e2ee" : "#17304f";
  const headBg = darkMode ? "#232d39" : "#f5f8fc";
  const headColor = darkMode ? "#e7f0fa" : "#3b5b7a";
  const paperDialogBg = darkMode ? "#1d2530" : "#ffffff";

  const fetchBackups = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await backupService.getBackups();
      setBackups(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load backups.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAdmin) return;

    void fetchBackups();

    const timer = window.setInterval(() => {
      void fetchBackups();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [fetchBackups, isAdmin]);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      await backupService.createBackup();
      await fetchBackups();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start backup.";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreId) return;

    try {
      setRestoreLoading(true);
      setError(null);
      await backupService.restoreBackup(restoreId);
      setRestoreId(null);
      await fetchBackups();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start restore.";
      setError(message);
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId || deleteConfirmText !== "DELETE") return;

    try {
      setDeleteLoading(true);
      setError(null);
      await backupService.deleteBackup(deleteId);
      setDeleteId(null);
      setDeleteConfirmText("");
      await fetchBackups();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete backup.";
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Alert severity="error">
        You are not authorized to access database backup settings.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6" sx={{ color: headingColor, fontWeight: 700 }}>
          Settings - Database Backup
        </Typography>
        <Button
          variant="contained"
          onClick={handleCreateBackup}
          disabled={creating || loading || hasPendingOperation}
        >
          {creating ? "Starting..." : "Create Backup"}
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ bgcolor: surfaceColor, border: `1px solid ${borderColor}` }}>
        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: headBg }}>
                <TableRow>
                  <TableCell
                    sx={{ color: headColor, borderBottomColor: borderColor }}
                  >
                    Filename
                  </TableCell>
                  <TableCell
                    sx={{ color: headColor, borderBottomColor: borderColor }}
                  >
                    Date Created
                  </TableCell>
                  <TableCell
                    sx={{ color: headColor, borderBottomColor: borderColor }}
                  >
                    File Size
                  </TableCell>
                  <TableCell
                    sx={{ color: headColor, borderBottomColor: borderColor }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: headColor, borderBottomColor: borderColor }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align="center"
                      sx={{ color: cellColor, borderBottomColor: borderColor }}
                    >
                      No backups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup) => {
                    const isPending = backup.status === "Pending";
                    return (
                      <TableRow key={backup.id}>
                        <TableCell
                          sx={{
                            color: cellColor,
                            borderBottomColor: borderColor,
                          }}
                        >
                          {backup.filename}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: cellColor,
                            borderBottomColor: borderColor,
                          }}
                        >
                          {backup.created_at
                            ? dayjs(backup.created_at).format(
                                "MM-DD-YYYY h:mm A",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: cellColor,
                            borderBottomColor: borderColor,
                          }}
                        >
                          {formatSize(backup.size)}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: cellColor,
                            borderBottomColor: borderColor,
                          }}
                        >
                          <Stack spacing={0.5}>
                            <Typography
                              variant="body2"
                              sx={{ color: cellColor }}
                            >
                              {backup.status}
                            </Typography>
                            {backup.status === "Failed" &&
                            backup.error_message ? (
                              <Typography
                                variant="caption"
                                sx={{ color: darkMode ? "#ff9b9b" : "#b00020" }}
                              >
                                {backup.error_message}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ borderBottomColor: borderColor }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              disabled={
                                isPending ||
                                hasPendingOperation ||
                                restoreLoading ||
                                deleteLoading
                              }
                              onClick={() => setRestoreId(backup.id)}
                            >
                              Restore
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={
                                isPending ||
                                hasPendingOperation ||
                                restoreLoading ||
                                deleteLoading
                              }
                              onClick={() => setDeleteId(backup.id)}
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={Boolean(restoreId)}
        onClose={() => setRestoreId(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: paperDialogBg, color: cellColor } }}
      >
        <DialogTitle>Confirm Restore</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This will overwrite the current database.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreId(null)} disabled={restoreLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmRestore}
            disabled={restoreLoading}
          >
            {restoreLoading ? "Starting..." : "Confirm Restore"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteId)}
        onClose={() => {
          setDeleteId(null);
          setDeleteConfirmText("");
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: paperDialogBg, color: cellColor } }}
      >
        <DialogTitle>Delete Backup</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.5 }}>
            Type DELETE to permanently remove this backup file.
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            sx={{
              "& .MuiInputBase-input": {
                color: cellColor,
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteId(null);
              setDeleteConfirmText("");
            }}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteLoading || deleteConfirmText !== "DELETE"}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseSettings;
