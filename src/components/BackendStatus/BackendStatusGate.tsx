import type { ReactNode } from "react";
import { Box, Button } from "@mui/material";
import { appConfig } from "../../config/app.config";
import { UI_TEXT } from "../../constants/messages";
import { useThemeContext } from "../ThemeContext/ThemeContext";
import WashingMachineLoader from "./WashingMachineLoader";
import { useBackendStatus } from "./BackendStatusContext";

type BackendStatusGateProps = {
  children: ReactNode;
};

const BackendStatusGate = ({ children }: BackendStatusGateProps) => {
  const { status, retry } = useBackendStatus();
  const { darkMode } = useThemeContext();

  if (status === "ready") {
    return <>{children}</>;
  }

  const message =
    status === "reconnecting"
      ? UI_TEXT.RECONNECTING
      : appConfig.startingSystemMessage;

  const overlayBg = darkMode ? "#0f141a" : "#dce4ed";

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: overlayBg,
        gap: 2,
      }}
    >
      <WashingMachineLoader message={message} />
      {status === "unavailable" && (
        <Box sx={{ textAlign: "center", mt: 1 }}>
          <Box
            component="p"
            sx={{ m: 0, mb: 1.5, color: "text.secondary", fontSize: "0.9rem" }}
          >
            {UI_TEXT.BACKEND_UNAVAILABLE}
          </Box>
          <Button variant="contained" onClick={retry}>
            {UI_TEXT.RETRY}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default BackendStatusGate;
