import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Navigate } from "react-router-dom";
import dayjs from "dayjs";
import authService from "../../services/authService";
import route from "../../constants/route";
import {
  API_ERRORS,
  CONFIRM_MESSAGES,
  EMPTY_STATES,
  FORM_ERRORS,
  UI_TEXT,
} from "../../constants/messages";
import { USER_ROLE_ADMIN, USER_ROLE_EMPLOYEE } from "../../constants/roles";
import {
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,
  USER_STATUS_SUSPENDED,
} from "../../constants/status";
import userService, {
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserItem,
  type UserRole,
  type UserStatus,
} from "../../services/userService";

type UserFormState = {
  firstName: string;
  lastName: string;
  userName: string;
  mobileNumber: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  dateHired: string;
};

const emptyForm: UserFormState = {
  firstName: "",
  lastName: "",
  userName: "",
  mobileNumber: "",
  password: "",
  role: USER_ROLE_EMPLOYEE,
  status: USER_STATUS_ACTIVE,
  dateHired: dayjs().format("YYYY-MM-DD"),
};

const Users: React.FC = () => {
  const currentUser = authService.getCurrentUser();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  const isAdmin = currentUser?.role === USER_ROLE_ADMIN;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAll();
      setUsers(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : API_ERRORS.LOAD_USERS_FAILED;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, loadUsers]);

  const visibleUsers = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [users, currentUser?.id],
  );

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: UserItem) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      mobileNumber: user.mobileNumber,
      password: "",
      role: user.role,
      status: user.status,
      dateHired: dayjs(user.dateHired).format("YYYY-MM-DD"),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const validateForm = (): string | null => {
    if (!form.firstName.trim()) return FORM_ERRORS.REQUIRED_FIRST_NAME;
    if (!form.lastName.trim()) return FORM_ERRORS.REQUIRED_LAST_NAME;
    if (!form.userName.trim()) return FORM_ERRORS.REQUIRED_USERNAME;
    if (!form.mobileNumber.trim()) return FORM_ERRORS.REQUIRED_MOBILE_NUMBER;
    if (!form.dateHired) return FORM_ERRORS.REQUIRED_DATE_HIRED;
    if (!editingUser && form.password.trim().length < 6) {
      return FORM_ERRORS.PASSWORD_MIN_LENGTH;
    }
    if (editingUser && form.password && form.password.trim().length < 6) {
      return FORM_ERRORS.PASSWORD_MIN_LENGTH;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dateHiredISO = dayjs(form.dateHired).startOf("day").toISOString();

      if (editingUser) {
        const payload: UpdateUserPayload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          userName: form.userName.trim(),
          mobileNumber: form.mobileNumber.trim(),
          role: form.role,
          status: form.status,
          dateHired: dateHiredISO,
        };

        if (form.password.trim()) {
          payload.password = form.password.trim();
        }

        await userService.update(editingUser.id, payload);
      } else {
        const payload: CreateUserPayload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          userName: form.userName.trim(),
          mobileNumber: form.mobileNumber.trim(),
          password: form.password.trim(),
          role: form.role,
          status: form.status,
          dateHired: dateHiredISO,
        };

        await userService.create(payload);
      }

      closeDialog();
      loadUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    const confirmed = window.confirm(CONFIRM_MESSAGES.DELETE_USER);
    if (!confirmed) return;

    try {
      setError(null);
      await userService.delete(userId);
      await loadUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : API_ERRORS.DELETE_USER_FAILED;
      setError(message);
    }
  };

  if (!isAdmin) {
    return <Navigate to={route.DASHBOARD} replace />;
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">Users</Typography>
        <Button variant="contained" onClick={openCreate} disabled={loading}>
          Add New User
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper>
        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date Hired</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {EMPTY_STATES.NO_USERS}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {[user.firstName, user.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                          user.userName ||
                          "-"}
                      </TableCell>
                      <TableCell>{user.userName || "-"}</TableCell>
                      <TableCell>{user.mobileNumber || "-"}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.status}</TableCell>
                      <TableCell>
                        {user.dateHired
                          ? dayjs(user.dateHired).format("MM-DD-YYYY")
                          : "-"}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="success"
                          onClick={() => openEdit(user)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(user.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: "form", autoComplete: "off" }}
      >
        <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={6}>
              <TextField
                fullWidth
                size="small"
                label="First Name"
                autoComplete="off"
                name="new-first-name"
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                size="small"
                label="Last Name"
                autoComplete="off"
                name="new-last-name"
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                size="small"
                label="Username"
                autoComplete="off"
                name="new-username"
                value={form.userName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, userName: e.target.value }))
                }
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                size="small"
                label="Mobile Number"
                autoComplete="off"
                name="new-mobile-number"
                value={form.mobileNumber}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mobileNumber: e.target.value }))
                }
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                size="small"
                type="password"
                label={editingUser ? "Password (optional)" : "Password"}
                autoComplete="new-password"
                name="new-password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date Hired"
                value={form.dateHired}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dateHired: e.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as UserRole,
                    }))
                  }
                >
                  <MenuItem value={USER_ROLE_ADMIN}>{USER_ROLE_ADMIN}</MenuItem>
                  <MenuItem value={USER_ROLE_EMPLOYEE}>
                    {USER_ROLE_EMPLOYEE}
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as UserStatus,
                    }))
                  }
                >
                  <MenuItem value={USER_STATUS_ACTIVE}>
                    {USER_STATUS_ACTIVE}
                  </MenuItem>
                  <MenuItem value={USER_STATUS_INACTIVE}>
                    {USER_STATUS_INACTIVE}
                  </MenuItem>
                  <MenuItem value={USER_STATUS_SUSPENDED}>
                    {USER_STATUS_SUSPENDED}
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>
            {UI_TEXT.CANCEL}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? UI_TEXT.SAVING : UI_TEXT.SAVE}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
