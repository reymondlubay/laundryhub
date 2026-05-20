import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Dayjs } from "dayjs";
import backupService, {
  type BackupScheduleTimeItem,
} from "../../services/backupService";
import {
  DEFAULT_BACKUP_SCHEDULE_LABELS,
  formatScheduleTimeDisplay,
  parseScheduleTimeToDayjs,
  toApiScheduleTime,
} from "../../utils/backupScheduleUtils";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";

type Props = {
  headingColor: string;
  borderColor: string;
  headBg: string;
  headColor: string;
  cellColor: string;
  onError: (message: string) => void;
};

const DatabaseScheduleSection: React.FC<Props> = ({
  headingColor,
  borderColor,
  headBg,
  headColor,
  cellColor,
  onError,
}) => {
  const [scheduleTimes, setScheduleTimes] = React.useState<
    BackupScheduleTimeItem[]
  >([]);
  const [schedulePickerValue, setSchedulePickerValue] =
    React.useState<Dayjs | null>(null);
  const [scheduleSaving, setScheduleSaving] = React.useState(false);
  const [scheduleEditId, setScheduleEditId] = React.useState<string | null>(
    null,
  );
  const [scheduleEditValue, setScheduleEditValue] =
    React.useState<Dayjs | null>(null);
  const [scheduleEditLoading, setScheduleEditLoading] = React.useState(false);
  const [scheduleDeleteId, setScheduleDeleteId] = React.useState<string | null>(
    null,
  );
  const [scheduleDeleteLoading, setScheduleDeleteLoading] =
    React.useState(false);

  const fetchScheduleTimes = React.useCallback(async () => {
    try {
      const rows = await backupService.getBackupScheduleTimes();
      setScheduleTimes(rows);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load backup schedule.";
      onError(message);
    }
  }, [onError]);

  React.useEffect(() => {
    void fetchScheduleTimes();
  }, [fetchScheduleTimes]);

  const handleAddScheduleTime = async () => {
    const apiTime = toApiScheduleTime(schedulePickerValue);
    if (!apiTime) {
      onError("Select a time before adding.");
      return;
    }
    try {
      setScheduleSaving(true);
      await backupService.addBackupScheduleTime(apiTime);
      setSchedulePickerValue(null);
      await fetchScheduleTimes();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      onError(
        ax.response?.data?.message ||
          (err instanceof Error ? err.message : "Failed to add schedule time."),
      );
    } finally {
      setScheduleSaving(false);
    }
  };

  const openEditSchedule = (row: BackupScheduleTimeItem) => {
    setScheduleEditId(row.id);
    setScheduleEditValue(parseScheduleTimeToDayjs(row.schedule_time));
  };

  const handleSaveEditSchedule = async () => {
    if (!scheduleEditId) return;
    const apiTime = toApiScheduleTime(scheduleEditValue);
    if (!apiTime) {
      onError("Select a valid time.");
      return;
    }
    try {
      setScheduleEditLoading(true);
      await backupService.updateBackupScheduleTime(scheduleEditId, apiTime);
      setScheduleEditId(null);
      setScheduleEditValue(null);
      await fetchScheduleTimes();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      onError(
        ax.response?.data?.message ||
          (err instanceof Error
            ? err.message
            : "Failed to update schedule time."),
      );
    } finally {
      setScheduleEditLoading(false);
    }
  };

  const handleConfirmDeleteSchedule = async () => {
    if (!scheduleDeleteId) return;
    try {
      setScheduleDeleteLoading(true);
      await backupService.deleteBackupScheduleTime(scheduleDeleteId);
      setScheduleDeleteId(null);
      await fetchScheduleTimes();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove schedule time.";
      onError(message);
    } finally {
      setScheduleDeleteLoading(false);
    }
  };

  return (
    <Box sx={{ pt: 2 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: headingColor, fontWeight: 600, mb: 0.5 }}
      >
        Automatic backup schedule
      </Typography>
      <Typography variant="caption" sx={{ color: cellColor, display: "block", mb: 1 }}>
        Times use the server clock. One backup runs when the server starts, then
        at each time below. If no times are listed, defaults apply (
        {DEFAULT_BACKUP_SCHEDULE_LABELS.join(", ")}). Backups older than 3 days
        are removed automatically.
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        sx={{ mb: 1.5 }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <TimePicker
            label="Backup time"
            value={schedulePickerValue}
            onChange={(v) => setSchedulePickerValue(v)}
            format="hh:mm A"
            ampm
            slotProps={{ textField: { size: "small", fullWidth: true } }}
          />
        </LocalizationProvider>
        <Button
          variant="outlined"
          onClick={() => void handleAddScheduleTime()}
          disabled={scheduleSaving || !schedulePickerValue}
          sx={{ minWidth: 100, flexShrink: 0 }}
        >
          {scheduleSaving ? "Saving..." : "Add"}
        </Button>
      </Stack>

      {scheduleTimes.length === 0 ? (
        <Typography variant="body2" sx={{ color: cellColor, mb: 1 }}>
          No times saved. Using defaults:{" "}
          {DEFAULT_BACKUP_SCHEDULE_LABELS.join(", ")}.
        </Typography>
      ) : (
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
                <TableCell sx={{ color: headColor, borderBottomColor: borderColor }}>
                  Time
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
              {scheduleTimes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell
                    sx={{ color: cellColor, borderBottomColor: borderColor }}
                  >
                    {formatScheduleTimeDisplay(row.schedule_time)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ borderBottomColor: borderColor }}
                  >
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openEditSchedule(row)}
                        disabled={
                          scheduleSaving || scheduleEditLoading || scheduleDeleteLoading
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => setScheduleDeleteId(row.id)}
                        disabled={
                          scheduleSaving || scheduleEditLoading || scheduleDeleteLoading
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
      )}

      <Dialog
        open={Boolean(scheduleEditId)}
        onClose={ignoreBackdropClose(() => setScheduleEditId(null))}
      >
        <DialogTitle>Edit backup time</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimePicker
              label="Time"
              value={scheduleEditValue}
              onChange={(v) => setScheduleEditValue(v)}
              format="hh:mm A"
              ampm
              slotProps={{ textField: { size: "small", fullWidth: true, sx: { mt: 1 } } }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleEditId(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveEditSchedule()}
            disabled={scheduleEditLoading}
          >
            {scheduleEditLoading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(scheduleDeleteId)}
        onClose={ignoreBackdropClose(() => setScheduleDeleteId(null))}
      >
        <DialogTitle>Remove schedule time?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This time will no longer trigger automatic backups.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDeleteId(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmDeleteSchedule()}
            disabled={scheduleDeleteLoading}
          >
            {scheduleDeleteLoading ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseScheduleSection;
