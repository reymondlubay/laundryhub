import {
  Dialog,
  Grid,
  Paper,
  TextField,
  DialogActions,
  Button,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Divider,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem as MUIMenuItem,
  InputAdornment,
  Stack,
  Typography,
  DialogTitle,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect } from "react";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import { RemoveCircle } from "@mui/icons-material";
import type { LaundryItem, LaundryType } from "../../services/apiTypes";

type TransactionModalProps = {
  isOpen: boolean;
  handleClose: () => void;
};

type Customer = {
  name: string;
  id: number;
};

const customers: Customer[] = [
  { name: "John Doe", id: 1 },
  { name: "Erika Ferre", id: 2 },
];
const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  handleClose,
}) => {
  const [receiveDate, setReceiveDate] = React.useState<Dayjs | null>(
    dayjs("2022-04-17T15:30")
  );

  const [items, setItems] = React.useState<LaundryItem[]>([
    { type: "Clothes", kg: 0, loads: 0, price: 0 },
  ]);

  const [customer, setCustomer] = React.useState<string>("");
  const [whitePrice, setWhitePrice] = React.useState<number>(0);
  const [fabcon, setFabcon] = React.useState<number>(0);
  const [detergent, setDetergent] = React.useState<number>(0);
  const [cs, setCS] = React.useState<number>(0);

  const [releaseBy, setReleaseBy] = React.useState<string>("");
  const [dateLoaded, setDateLoaded] = React.useState<Dayjs | null>(dayjs());
  const [datePickup, setDatePickup] = React.useState<Dayjs | null>(dayjs());

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      { type: "Clothes", kg: 0, loads: 0, price: 0 },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    updatePaymentDetails();
  }, [items]);

  const handleChange = <K extends keyof LaundryItem>(
    index: number,
    field: K,
    value: LaundryItem[K]
  ) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const updatePaymentDetails = () => {
    const totalsByType: Record<LaundryType, number> = {
      Clothes: 0,
      Beddings: 0,
      Comforter: 0,
    };

    items.forEach((item) => {
      totalsByType[item.type] += Number(item.price);
    });

    console.log("Totals:", totalsByType);
  };

  const handleSave = () => {
    const payload = {
      customer,
      receiveDate,
      dateLoaded,
      datePickup,
      items,
      adOns: {
        whitePrice,
        fabcon,
        detergent,
        cs,
      },
      releaseBy,
    };

    console.log("SAVE PAYLOAD:", payload);
  };

  console.log(items);

  return (
    <Dialog
      open={isOpen}
      maxWidth="lg"
      fullWidth
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <DialogTitle sx={{ m: 0 }} id="customized-dialog-title">
        Transaction
      </DialogTitle>
      <Grid container spacing={0}>
        <Grid size={8} sx={{ pl: 2, pr: 0 }}>
          <Paper elevation={1} sx={{ p: 4 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Autocomplete
                  id="customer"
                  freeSolo
                  size="small"
                  value={customer}
                  onChange={(_, newValue) => setCustomer(newValue || "")}
                  onInputChange={(_, newValue) => setCustomer(newValue)}
                  options={customers.map((option) => option.name)}
                  renderInput={(params) => (
                    <TextField {...params} label="Customer" />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="Date Received"
                    value={receiveDate}
                    onChange={(newValue) => setReceiveDate(newValue)}
                    slotProps={{
                      textField: { size: "small", fullWidth: true },

                      actionBar: {
                        actions: ["today", "cancel", "accept"],
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid size={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="Date Loaded"
                    value={dateLoaded}
                    onChange={(newValue) => setDateLoaded(newValue)}
                    slotProps={{
                      textField: { size: "small", fullWidth: true },
                      actionBar: { actions: ["today", "cancel", "accept"] },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid size={6} textAlign="center">
                <FormControlLabel
                  control={<Checkbox defaultChecked size="small" />}
                  label="For Delivery"
                />
              </Grid>
              <Grid size={12}>
                <Divider>Load Details</Divider>
              </Grid>
              <Grid size={12}>
                {items.map((item, index) => (
                  <Grid
                    container
                    spacing={1}
                    key={index}
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    {/* Type */}
                    <Grid size={3}>
                      <FormControl
                        fullWidth
                        sx={{ minWidth: 120 }}
                        size="small"
                      >
                        <InputLabel id={`type-label-${index}`}>Type</InputLabel>
                        <Select
                          labelId={`type-label-${index}`}
                          id={`type-select-${index}`}
                          value={item.type}
                          onChange={(e) =>
                            handleChange(
                              index,
                              "type",
                              e.target.value as LaundryType
                            )
                          }
                          label="Type"
                        >
                          <MUIMenuItem value="Clothes">Clothes</MUIMenuItem>
                          <MUIMenuItem value="Beddings">Beddings</MUIMenuItem>
                          <MUIMenuItem value="Comforter">Comforter</MUIMenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* KG (disabled if Comforter) */}
                    <Grid size={3}>
                      <TextField
                        label="KG"
                        value={item.kg}
                        onChange={(e) =>
                          handleChange(index, "kg", Number(e.target.value))
                        }
                        fullWidth
                        size="small"
                        type="number"
                        disabled={item.type === "Comforter"}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="start">
                                kg
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Grid>

                    {/* Loads */}
                    <Grid size={items.length > 1 ? 2 : 3}>
                      <TextField
                        label="Loads"
                        value={item.loads}
                        onChange={(e) =>
                          handleChange(index, "loads", Number(e.target.value))
                        }
                        fullWidth
                        size="small"
                        type="number"
                      />
                    </Grid>

                    {/* Price */}
                    <Grid size={3}>
                      <TextField
                        label="Price"
                        value={item.price}
                        onChange={(e) =>
                          handleChange(index, "price", Number(e.target.value))
                        }
                        fullWidth
                        size="small"
                        type="number"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                ₱
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Grid>

                    {items.length > 1 && (
                      <Grid size={1} textAlign="center">
                        <Tooltip title="Delete Row">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteRow(index)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    )}
                  </Grid>
                ))}

                {/* Add Row Button */}
                <Grid container justifyContent="center">
                  <Tooltip title="Add Row">
                    <IconButton color="primary" onClick={handleAddRow}>
                      <AddCircleIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Divider>Ad Ons Details</Divider>
              </Grid>
              <Grid size={3}>
                <TextField
                  label="White Price"
                  fullWidth
                  size="small"
                  type="number"
                  value={whitePrice}
                  onChange={(e) => setWhitePrice(Number(e.target.value))}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">₱</InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Fabcon"
                  fullWidth
                  size="small"
                  type="number"
                  value={fabcon}
                  onChange={(e) => setFabcon(Number(e.target.value))}
                  slotProps={{
                    htmlInput: { min: 0, max: 5 },
                  }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Detergent"
                  fullWidth
                  size="small"
                  type="number"
                  value={detergent}
                  onChange={(e) => setDetergent(Number(e.target.value))}
                  slotProps={{
                    htmlInput: { min: 0, max: 5 },
                  }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="CS"
                  fullWidth
                  size="small"
                  type="number"
                  value={cs}
                  onChange={(e) => setCS(Number(e.target.value))}
                  slotProps={{
                    htmlInput: { min: 0, max: 5 },
                  }}
                />
              </Grid>

              <Grid size={12}>
                <Divider>Release Details</Divider>
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="Date Pickup"
                    value={datePickup}
                    onChange={(newValue) => setDatePickup(newValue)}
                    slotProps={{
                      textField: { size: "small", fullWidth: true },
                      actionBar: { actions: ["today", "cancel", "accept"] },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <FormControl fullWidth sx={{ minWidth: 120 }} size="small">
                  <InputLabel>Release By</InputLabel>
                  <Select
                    label="Release By"
                    value={releaseBy}
                    onChange={(e) => setReleaseBy(e.target.value)}
                  >
                    <MUIMenuItem value="Employee 1">Employee 1</MUIMenuItem>
                    <MUIMenuItem value="Employee 2">Employee 2</MUIMenuItem>
                    <MUIMenuItem value="Employee 3">Employee 3</MUIMenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={4} sx={{ pr: 2, pl: 0.5 }}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography gutterBottom align="center">
              Payment Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12} textAlign="center">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddCircleIcon />}
                >
                  Add Payment
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <DialogActions sx={{ justifyContent: "center", pb: 4 }}>
        <Button
          variant="contained"
          size="small"
          color="primary"
          onClick={handleSave}
        >
          Save
        </Button>

        <Button
          variant="contained"
          size="small"
          color="primary"
          onClick={handleClose}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionModal;
