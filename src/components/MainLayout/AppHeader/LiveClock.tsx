import React, { useState, useEffect } from "react";
import { Typography, Box } from "@mui/material";
import { useThemeContext } from "../../ThemeContext/ThemeContext";
import dayjs from "dayjs";

const LiveClock: React.FC = () => {
  const { darkMode } = useThemeContext();
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    // Set initial time
    setCurrentTime(dayjs().format("MMMM DD, YYYY h:mm A"));

    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(dayjs().format("MMMM DD, YYYY h:mm A"));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        minWidth: 200,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          color: darkMode ? "#d8e2ee" : "#3b5b7a",
          fontSize: "0.875rem",
          letterSpacing: 0.3,
        }}
      >
        {currentTime}
      </Typography>
    </Box>
  );
};

export default LiveClock;
