import React from "react";
import {
  Alert,
  Box,
  Button,
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
  InputAdornment,
  IconButton,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import dayjs from "dayjs";
import authService from "../../services/authService";
import backupService, {
  type BackupItem,
  type BackupFolderPathItem,
} from "../../services/backupService";
import { useThemeContext } from "../../components/ThemeContext/ThemeContext";
import {
  TableSkeleton,
  TableHeaderSkeleton,
} from "../../components/Skeletons/SkeletonComponents";

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
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [backupFolderPath, setBackupFolderPath] = React.useState("");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [restoreId, setRestoreId] = React.useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = React.useState(false);

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [folderPaths, setFolderPaths] = React.useState<BackupFolderPathItem[]>(
    [],
  );
  const [pathSaving, setPathSaving] = React.useState(false);
  const [pathEditId, setPathEditId] = React.useState<string | null>(null);
  const [pathEditValue, setPathEditValue] = React.useState("");
  const [pathEditLoading, setPathEditLoading] = React.useState(false);
  const [pathDeleteId, setPathDeleteId] = React.useState<string | null>(null);
  const [pathDeleteLoading, setPathDeleteLoading] = React.useState(false);
  const [skippedFoldersWarning, setSkippedFoldersWarning] = React.useState<
    { path: string; reason: string }[] | null
  >(null);

  const hasPendingOperation = backups.some((item) => item.status === "Pending");
  const surfaceColor = darkMode ? "#1b222c" : "#ffffff";
  const borderColor = darkMode ? "#2b3440" : "#e8edf3";
  const headingColor = darkMode ? "#eef5ff" : "#0d213f";
  const cellColor = darkMode ? "#d8e2ee" : "#17304f";
  const headBg = darkMode ? "#232d39" : "#f5f8fc";
  const headColor = darkMode ? "#e7f0fa" : "#3b5b7a";
  const paperDialogBg = darkMode ? "#1d2530" : "#ffffff";

  const fetchBackups = React.useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);
      setError(null);
      const data = await backupService.getBackups();
      setBackups(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load backups.";
      setError(message);
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  }, []);

  const fetchFolderPaths = React.useCallback(async () => {
    try {
      const rows = await backupService.getBackupFolderPaths();
      setFolderPaths(rows);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load backup folders.";
      setError(message);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    if (!isAdmin) return;
    void Promise.all([fetchBackups(true), fetchFolderPaths()]);
  }, [fetchBackups, fetchFolderPaths, isAdmin]);

  // Poll only while a Pending operation is active
  React.useEffect(() => {
    if (!isAdmin || !hasPendingOperation) return;

    const timer = window.setInterval(() => {
      void fetchBackups();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [fetchBackups, isAdmin, hasPendingOperation]);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      setSkippedFoldersWarning(null);
      const useSavedFoldersOnly = folderPaths.length > 0;
      const { skippedFolders } = await backupService.createBackup(
        useSavedFoldersOnly ? undefined : backupFolderPath || undefined,
      );
      if (skippedFolders?.length) {
        setSkippedFoldersWarning(skippedFolders);
      }
      await fetchBackups();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start backup.";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleAddFolderPath = async () => {
    const trimmed = backupFolderPath.trim();
    if (!trimmed) {
      setError("Enter a folder path before adding.");
      return;
    }
    try {
      setPathSaving(true);
      setError(null);
      await backupService.addBackupFolderPath(trimmed);
      setBackupFolderPath("");
      await fetchFolderPaths();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const message =
        ax.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to add folder path.");
      setError(message);
    } finally {
      setPathSaving(false);
    }
  };

  const openEditPath = (row: BackupFolderPathItem) => {
    setPathEditId(row.id);
    setPathEditValue(row.folder_path);
  };

  const handleSaveEditPath = async () => {
    if (!pathEditId) return;
    const trimmed = pathEditValue.trim();
    if (!trimmed) {
      setError("Folder path cannot be empty.");
      return;
    }
    try {
      setPathEditLoading(true);
      setError(null);
      await backupService.updateBackupFolderPath(pathEditId, trimmed);
      setPathEditId(null);
      setPathEditValue("");
      await fetchFolderPaths();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const message =
        ax.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to update folder path.");
      setError(message);
    } finally {
      setPathEditLoading(false);
    }
  };

  const handleConfirmDeletePath = async () => {
    if (!pathDeleteId) return;
    try {
      setPathDeleteLoading(true);
      setError(null);
      await backupService.deleteBackupFolderPath(pathDeleteId);
      setPathDeleteId(null);
      await fetchFolderPaths();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove folder path.";
      setError(message);
    } finally {
      setPathDeleteLoading(false);
    }
  };

  const handleUploadBackupFile = async () => {
    if (!uploadFile) {
      setError("Please select a .sql backup file to upload.");
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith(".sql")) {
      setError("Only .sql backup files are supported.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await backupService.uploadBackup(uploadFile, backupFolderPath);
      setUploadFile(null);
      await fetchBackups();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload backup file.";
      setError(message);
    } finally {
      setUploading(false);
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
          disabled={
            creating || uploading || initialLoading || hasPendingOperation
          }
        >
          {creating ? "Starting..." : "Create Backup"}
        </Button>
      </Stack>

      <Paper
        sx={{
          mb: 2,
          p: 2,
          bgcolor: surfaceColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
          >
            <TextField
              label="Backup Folder Path (optional)"
              size="small"
              fullWidth
              value={backupFolderPath}
              onChange={(e) => setBackupFolderPath(e.target.value)}
              placeholder="e.g. D:/Backups"
              helperText={
                folderPaths.length > 0
                  ? "Add Path saves to the list below. Create Backup writes to every listed folder that exists on the server. Upload still uses this path when set, else default."
                  : "Type a path and click Add Path to save multiple backup destinations. Leave empty and save no list entries to use the default backend backups folder."
              }
              sx={{ flex: 1 }}
              slotProps={{
                input: {
                  endAdornment: backupFolderPath ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="clear backup folder path"
                        size="small"
                        onClick={() => setBackupFolderPath("")}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
            <Button
              variant="outlined"
              onClick={() => void handleAddFolderPath()}
              disabled={
                pathSaving ||
                !backupFolderPath.trim() ||
                creating ||
                uploading ||
                initialLoading
              }
              sx={{ minWidth: 100, flexShrink: 0 }}
            >
              {pathSaving ? "Saving..." : "Add Path"}
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button variant="outlined" component="label" disabled={uploading}>
              {uploadFile ? uploadFile.name : "Select Backup File (.sql)"}
              <input
                hidden
                type="file"
                accept=".sql"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setUploadFile(file);
                }}
              />
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={handleUploadBackupFile}
              disabled={
                !uploadFile ||
                uploading ||
                creating ||
                initialLoading ||
                hasPendingOperation
              }
            >
              {uploading ? "Uploading..." : "Upload Backup File"}
            </Button>
          </Stack>

          {folderPaths.length > 0 ? (
            <Box sx={{ pt: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ color: headingColor, fontWeight: 600, mb: 1 }}
              >
                Saved backup folders
              </Typography>
              <TableContainer
                sx={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: 1,
                  maxWidth: "100%",
                }}
              >
                <Table size="small">
                  <TableHead sx={{ bgcolor: headBg }}>
                    <TableRow>
                      <TableCell
                        sx={{
                          color: headColor,
                          borderBottomColor: borderColor,
                        }}
                      >
                        Path
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: headColor,
                          borderBottomColor: borderColor,
                          width: 200,
                        }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {folderPaths.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell
                          sx={{
                            color: cellColor,
                            borderBottomColor: borderColor,
                            wordBreak: "break-all",
                          }}
                        >
                          {row.folder_path}
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
                              onClick={() => openEditPath(row)}
                              disabled={
                                pathSaving ||
                                pathEditLoading ||
                                pathDeleteLoading
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => setPathDeleteId(row.id)}
                              disabled={
                                pathSaving ||
                                pathEditLoading ||
                                pathDeleteLoading
                              }
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
        </Stack>
      </Paper>

      {skippedFoldersWarning?.length ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setSkippedFoldersWarning(null)}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Backup started, but these saved folders were skipped (not found on
            the server or not a directory):
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {skippedFoldersWarning.map((s) => (
              <li key={`${s.path}-${s.reason}`}>
                <Typography variant="body2" component="span">
                  {s.path} — {s.reason}
                </Typography>
              </li>
            ))}
          </Box>
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ bgcolor: surfaceColor, border: `1px solid ${borderColor}` }}>
        {initialLoading ? (
          <TableContainer>
            <Table size="small">
              <TableHeaderSkeleton columns={6} />
              <TableSkeleton columns={6} rows={5} />
            </Table>
          </TableContainer>
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
                    Backup Location
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
                      colSpan={6}
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
                            maxWidth: 280,
                            wordBreak: "break-all",
                          }}
                        >
                          {backup.filepath || "-"}
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
                            {backup.error_message ? (
                              <Typography
                                variant="caption"
                                sx={{
                                  color:
                                    backup.status === "Failed"
                                      ? darkMode
                                        ? "#ff9b9b"
                                        : "#b00020"
                                      : darkMode
                                        ? "#ffc266"
                                        : "#b26a00",
                                }}
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

      <Dialog
        open={Boolean(pathEditId)}
        onClose={() => {
          if (pathEditLoading) return;
          setPathEditId(null);
          setPathEditValue("");
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: paperDialogBg, color: cellColor } }}
      >
        <DialogTitle>Edit backup folder</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            margin="dense"
            label="Folder path"
            value={pathEditValue}
            onChange={(e) => setPathEditValue(e.target.value)}
            sx={{
              mt: 1,
              "& .MuiInputBase-input": { color: cellColor },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPathEditId(null);
              setPathEditValue("");
            }}
            disabled={pathEditLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveEditPath()}
            disabled={pathEditLoading || !pathEditValue.trim()}
          >
            {pathEditLoading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pathDeleteId)}
        onClose={() => !pathDeleteLoading && setPathDeleteId(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: paperDialogBg, color: cellColor } }}
      >
        <DialogTitle>Remove folder path</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove this path from the saved list? Existing backup files on disk
            are not deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPathDeleteId(null)}
            disabled={pathDeleteLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirmDeletePath()}
            disabled={pathDeleteLoading}
          >
            {pathDeleteLoading ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseSettings;
