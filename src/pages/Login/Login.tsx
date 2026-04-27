import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
} from "@mui/material";
import authService from "../../services/authService";
import route from "../../constants/route";
import { API_ERRORS, FORM_ERRORS, UI_TEXT } from "../../constants/messages";
import { FormFieldSkeleton } from "../../components/Skeletons/SkeletonComponents";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ userName: false, password: false });

  const validateForm = (): boolean => {
    return userName.trim() !== "" && password.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!validateForm()) {
      setError(FORM_ERRORS.REQUIRED_USERNAME_AND_PASSWORD);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await authService.login({
        userName,
        password,
      });

      // Redirect to dashboard
      navigate(route.DASHBOARD);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.LOGIN_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldBlur = (fieldName: "userName" | "password") => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const userNameError =
    touched.userName && userName.trim() === ""
      ? FORM_ERRORS.REQUIRED_USERNAME
      : "";

  const passwordError =
    touched.password && password.trim() === ""
      ? FORM_ERRORS.REQUIRED_PASSWORD
      : "";

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,
            width: "100%",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              textAlign: "center",
              marginBottom: 3,
              fontWeight: 600,
            }}
          >
            LaundryHub
          </Typography>

          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              marginBottom: 3,
              color: "text.secondary",
            }}
          >
            Sign in to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <FormFieldSkeleton rows={2} />
              <Skeleton variant="rectangular" height={44} sx={{ mt: 3 }} />
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onBlur={() => handleFieldBlur("userName")}
                error={!!userNameError}
                helperText={userNameError}
                disabled={loading}
                margin="normal"
                autoComplete="username"
                required
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleFieldBlur("password")}
                error={!!passwordError}
                helperText={passwordError}
                disabled={loading}
                margin="normal"
                autoComplete="current-password"
                required
              />

              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{
                  marginTop: 3,
                  padding: "10px 0",
                  position: "relative",
                }}
              >
                {loading ? <CircularProgress size={24} /> : UI_TEXT.SIGN_IN}
              </Button>
            </form>
          )}

          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              marginTop: 2,
              color: "text.secondary",
            }}
          >
            Demo: admin / admin123
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
