import React from "react";
import { Box, Tooltip } from "@mui/material";

type GcashIconProps = {
  size?: number;
};

export const GcashIcon: React.FC<GcashIconProps> = ({ size = 18 }) => (
  <Tooltip title="GCash" arrow>
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "4px",
        bgcolor: "#007CFE",
        color: "#fff",
        fontSize: size * 0.55,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      G
    </Box>
  </Tooltip>
);
