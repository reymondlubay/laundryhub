import React from "react";
import TransactionTable from "./TransactionTable";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  Grid,
  Modal,
  Paper,
  TextField,
} from "@mui/material";

const Transaction = () => {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  return (
    <div>
      <Grid container justifyContent="end">
        <Button
          onClick={handleOpen}
          variant="contained"
          color="primary"
          sx={{ mb: 2 }}
        >
          Add New Transaction
        </Button>
      </Grid>
      <TransactionTable />
      <Dialog
        open={open}
        maxWidth="md"
        fullWidth
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Grid container spacing={0}>
          <Grid size={8} sx={{ p: 2, pr: 0.5 }}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <TextField
                id="outlined-basic"
                label="Customer Name"
                variant="outlined"
                size="small"
              />
            </Paper>
          </Grid>
          <Grid size={4} sx={{ p: 2, pl: 0.5 }}>
            <Paper elevation={1} sx={{ p: 2 }}>
              1
            </Paper>
          </Grid>
        </Grid>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Transaction;
