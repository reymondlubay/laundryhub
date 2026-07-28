import { Box } from "@mui/material";
import { appConfig } from "../../config/app.config";

const DevEnvironmentBanner = () => {
  if (!appConfig.isDevEnvironment) return null;

  return (
    <Box
      component="div"
      role="status"
      aria-live="polite"
      sx={{
        bgcolor: "#d32f2f",
        color: "#fff",
        textAlign: "center",
        py: 0.75,
        px: 1.5,
        fontWeight: 700,
        fontSize: { xs: "0.8rem", sm: "0.875rem" },
        letterSpacing: 0.3,
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.modal + 1,
        width: "100%",
      }}
    >
      Development Environment
    </Box>
  );
};

export default DevEnvironmentBanner;
