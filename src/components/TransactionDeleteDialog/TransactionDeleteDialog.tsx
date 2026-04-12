import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import { UI_TEXT } from "../../constants/messages";

export type DeleteReason = "Wrong Record" | "Withdrawn";

const DELETE_REASON_OPTIONS: DeleteReason[] = ["Wrong Record", "Withdrawn"];

type TransactionDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (deleteReason: DeleteReason) => void;
};

const TransactionDeleteDialog: React.FC<TransactionDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<DeleteReason | "">(
    "" as "" | DeleteReason,
  );

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
      setSelectedReason("");
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography>
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </Typography>
          <FormControl fullWidth required>
            <InputLabel>Delete Reason</InputLabel>
            <Select
              value={selectedReason}
              label="Delete Reason"
              onChange={(e) =>
                setSelectedReason(e.target.value as DeleteReason)
              }
            >
              <MenuItem value="">
                <em>Select a reason</em>
              </MenuItem>
              {DELETE_REASON_OPTIONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose}>
          {UI_TEXT.CANCEL}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={!selectedReason}
        >
          {UI_TEXT.DELETE}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionDeleteDialog;
