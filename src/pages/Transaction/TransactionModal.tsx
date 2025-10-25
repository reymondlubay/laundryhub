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
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import dayjs, { Dayjs } from "dayjs";
import React from "react";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import { MenuItem } from "react-pro-sidebar";
import { PlusOne, RemoveCircle } from "@mui/icons-material";

type TransactionModalProps = {
  isOpen: boolean;
  handleClose: () => void;
};

type LaundryItem = {
  type: string;
  kg: string;
  loads: string;
  price: string;
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
    { type: "Clothes", kg: "", loads: "", price: "" },
  ]);

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      { type: "Clothes", kg: "", loads: "", price: "" },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: keyof LaundryItem,
    value: string
  ) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  return (
    <Dialog
      open={isOpen}
      maxWidth="lg"
      fullWidth
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Grid container spacing={0}>
        <Grid size={8} sx={{ p: 2, pr: 0 }}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Autocomplete
                  id="customer"
                  freeSolo
                  size="small"
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
                              e.target.value as string
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
                          handleChange(index, "kg", e.target.value)
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
                          handleChange(index, "loads", e.target.value)
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
                          handleChange(index, "price", e.target.value)
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
                  // value={item.price}
                  onChange={(e) => {}}
                  fullWidth
                  size="small"
                  type="number"
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
                <Stack direction="row">
                  <Tooltip title="Decrease Fabcon">
                    <IconButton color="primary" onClick={handleAddRow}>
                      <RemoveCircle />
                    </IconButton>
                  </Tooltip>
                  <TextField
                    disabled
                    label="Fabcon"
                    //value={item.loads}
                    //onChange={(e) => handleChange(index, "loads", e.target.value)}
                    fullWidth
                    size="small"
                    type="number"
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 5,
                      },
                    }}
                  />
                  <Tooltip title="Add Fabcon">
                    <IconButton color="primary" onClick={handleAddRow}>
                      <AddCircleIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
              <Grid size={3}>
                <Stack direction="row">
                  <Tooltip title="Decrease Detergent">
                    <IconButton color="primary" onClick={handleAddRow}>
                      <RemoveCircle />
                    </IconButton>
                  </Tooltip>
                  <TextField
                    disabled
                    label="Detergent"
                    //value={item.loads}
                    //onChange={(e) => handleChange(index, "loads", e.target.value)}
                    fullWidth
                    size="small"
                    type="number"
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 5,
                      },
                    }}
                  />
                  <Tooltip title="Add Detergent">
                    <IconButton color="primary" onClick={handleAddRow}>
                      <AddCircleIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
              <Grid size={3}>
                <Stack direction="row">
                  <Tooltip title="Decrease Detergent">
                    <IconButton color="primary" onClick={handleAddRow}>
                      <RemoveCircle />
                    </IconButton>
                  </Tooltip>
                  <TextField
                    disabled
                    label="CS"
                    //value={item.loads}
                    //onChange={(e) => handleChange(index, "loads", e.target.value)}
                    fullWidth
                    size="small"
                    type="number"
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 5,
                      },
                    }}
                  />
                  <Tooltip title="Add Detergent">
                    <IconButton color="primary" onClick={handleAddRow}>
                      <AddCircleIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
              <Grid size={12}>
                <Divider>Release Details</Divider>
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="Date Pickup"
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
              <Grid size={{ md: 6, xs: 12 }}>
                <FormControl fullWidth sx={{ minWidth: 120 }} size="small">
                  <InputLabel>Release By</InputLabel>
                  <Select label="Release By">
                    <MUIMenuItem value="Clothes">Employee 1</MUIMenuItem>
                    <MUIMenuItem value="Beddings">Employee 2</MUIMenuItem>
                    <MUIMenuItem value="Comforter">Employee 3</MUIMenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={4} sx={{ p: 2, pl: 0.5 }}>
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
        <Button variant="contained" size="small" color="primary">
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
