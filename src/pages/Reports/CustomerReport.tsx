import React from "react";
import { Alert, Box, Typography } from "@mui/material";

const CustomerReport: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Customer Report
      </Typography>
      <Alert severity="info">No functionality yet.</Alert>
    </Box>
  );
};

export default CustomerReport;
