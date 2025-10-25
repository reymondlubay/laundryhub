import React from "react";
import TransactionTable from "./TransactionTable";
import { Button, Grid } from "@mui/material";
import TransactionModal from "./TransactionModal";

const Transaction = () => {
  const [openTransaction, setOpenTransaction] = React.useState(false);
  const handleOpenTransaction = () => setOpenTransaction(true);
  const handleCloseTransaction = () => setOpenTransaction(false);
  return (
    <div>
      <Grid container justifyContent="end">
        <Button
          onClick={handleOpenTransaction}
          variant="contained"
          color="primary"
          sx={{ mb: 2 }}
        >
          Add New Transaction
        </Button>
      </Grid>
      <TransactionTable />
      <TransactionModal
        isOpen={openTransaction}
        handleClose={handleCloseTransaction}
      />
    </div>
  );
};

export default Transaction;
