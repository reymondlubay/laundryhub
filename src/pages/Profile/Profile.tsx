import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import authService from "../../services/authService";
import profileService from "../../services/profileService";
import userService from "../../services/userService";
import PasswordField from "../../components/PasswordField/PasswordField";
import {
  API_ERRORS,
  FORM_ERRORS,
  SUCCESS_MESSAGES,
} from "../../constants/messages";

type ProfileSource = {
  firstName?: string;
  lastName?: string;
  userName?: string;
  username?: string;
  name?: string;
};

const loadUserFields = (user: ProfileSource | null) => {
  let firstName = user?.firstName?.trim() || "";
  let lastName = user?.lastName?.trim() || "";
  const userName = user?.userName || user?.username || "";

  if (!firstName && !lastName && user?.name?.trim()) {
    const parts = user.name.trim().split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ");
  }

  return { firstName, lastName, userName };
};

const ProfilePage: React.FC = () => {
  const [firstName, setFirstName] = useState(
    () => loadUserFields(authService.getCurrentUser()).firstName,
  );
  const [lastName, setLastName] = useState(
    () => loadUserFields(authService.getCurrentUser()).lastName,
  );
  const [userName, setUserName] = useState(
    () => loadUserFields(authService.getCurrentUser()).userName,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldsReady, setFieldsReady] = useState(false);

  const applyUserFields = useCallback((user: ProfileSource | null) => {
    const fields = loadUserFields(user);
    setFirstName((prev) => fields.firstName || prev);
    setLastName((prev) => fields.lastName || prev);
    setUserName((prev) => fields.userName || prev);
  }, []);

  useEffect(() => {
    const current = authService.getCurrentUser();
    applyUserFields(current);

    if (!current?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const user = await userService.getById(current.id);
        if (!cancelled) {
          applyUserFields(user);
        }
      } catch {
        // Keep session values if the profile fetch fails.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [applyUserFields]);

  useEffect(() => {
    const refresh = () => applyUserFields(authService.getCurrentUser());
    window.addEventListener("auth-user-updated", refresh);
    return () => window.removeEventListener("auth-user-updated", refresh);
  }, [applyUserFields]);

  const enableFields = () => setFieldsReady(true);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!firstName.trim()) {
      setError(FORM_ERRORS.REQUIRED_FIRST_NAME);
      return;
    }
    if (!lastName.trim()) {
      setError(FORM_ERRORS.REQUIRED_LAST_NAME);
      return;
    }

    const changingPassword =
      Boolean(currentPassword) ||
      Boolean(newPassword) ||
      Boolean(confirmPassword);

    if (changingPassword) {
      if (!currentPassword) {
        setError(FORM_ERRORS.CURRENT_PASSWORD_REQUIRED);
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        setError(FORM_ERRORS.PASSWORD_MIN_LENGTH);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(FORM_ERRORS.PASSWORD_MISMATCH);
        return;
      }
    }

    try {
      setSaving(true);
      const savedFirstName = firstName.trim();
      const savedLastName = lastName.trim();
      const updatedUser = await profileService.update({
        firstName: savedFirstName,
        lastName: savedLastName,
        ...(changingPassword
          ? {
              currentPassword,
              newPassword,
              confirmPassword,
            }
          : {}),
      });
      setFirstName(updatedUser.firstName?.trim() || savedFirstName);
      setLastName(updatedUser.lastName?.trim() || savedLastName);
      setUserName(
        updatedUser.userName || updatedUser.username || userName,
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(SUCCESS_MESSAGES.PROFILE_UPDATED);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : API_ERRORS.UPDATE_PROFILE_FAILED,
      );
    } finally {
      setSaving(false);
    }
  };

  const textInputProps = {
    autoComplete: "nope",
    readOnly: !fieldsReady,
    onFocus: enableFields,
    onMouseDown: enableFields,
    "data-lpignore": "true",
    "data-1p-ignore": "true",
  } as const;

  const passwordInputProps = {
    autoComplete: "one-time-code",
    readOnly: !fieldsReady,
    onFocus: enableFields,
    onMouseDown: enableFields,
    "data-lpignore": "true",
    "data-1p-ignore": "true",
  } as const;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Paper
        component="form"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        sx={{
          p: 2,
          maxWidth: 600,
          position: "relative",
          "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus":
            {
              WebkitBoxShadow:
                "0 0 0 100px var(--mui-palette-background-paper) inset",
              WebkitTextFillColor: "inherit",
              transition: "background-color 5000s ease-in-out 0s",
            },
        }}
      >
        <Box
          component="span"
          aria-hidden
          sx={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <input type="text" name="fake_username" tabIndex={-1} />
          <input type="password" name="fake_password" tabIndex={-1} />
        </Box>

        <Typography variant="subtitle1" sx={{ mb: 0.25, fontWeight: 600 }}>
          My Profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Update your name and password.
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 1.5, py: 0 }}>
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert severity="success" sx={{ mb: 1.5, py: 0 }}>
            {success}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  fullWidth
                  size="small"
                  required
                  name="lh-profile-given-name"
                  slotProps={{ htmlInput: textInputProps }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  fullWidth
                  size="small"
                  required
                  name="lh-profile-family-name"
                  slotProps={{ htmlInput: textInputProps }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Username"
                  value={userName}
                  fullWidth
                  size="small"
                  disabled
                  name="lh-profile-login-readonly"
                  helperText="Username cannot be changed here."
                  slotProps={{
                    htmlInput: {
                      autoComplete: "nope",
                      "data-lpignore": "true",
                      "data-1p-ignore": "true",
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Change password
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12 }}>
                <PasswordField
                  label="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                  name="lh-profile-current-secret"
                  slotProps={{ htmlInput: passwordInputProps }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <PasswordField
                  label="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  name="lh-profile-new-secret"
                  slotProps={{ htmlInput: passwordInputProps }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <PasswordField
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  name="lh-profile-confirm-secret"
                  slotProps={{ htmlInput: passwordInputProps }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={saving}
                startIcon={
                  saving ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : null
                }
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ProfilePage;
