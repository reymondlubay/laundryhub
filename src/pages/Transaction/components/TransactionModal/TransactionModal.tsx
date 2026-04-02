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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem as MUIMenuItem,
  InputAdornment,
  Typography,
  DialogTitle,
  Tooltip,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import React from "react";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, FieldArray, getIn } from "formik";
import * as Yup from "yup";
import type { LaundryItem, LaundryType } from "../../../../services/apiTypes";
import NumberSpinner from "../../../../components/NumberSpinner/NumberSpinner";
import NumberField from "../../../../components/NumberField/NumberField";
import BillSummary from "./components/BillSummary";

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

export type TransactionFormValues = {
  customer: string;
  receiveDate: Dayjs;
  dateLoaded: Dayjs;
  datePickup: Dayjs;
  items: LaundryItem[];
  whitePrice: number;
  fabcon: number;
  detergent: number;
  cs: number;
  releaseBy: string;
  notes: string;
};

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  handleClose,
}) => {
  const initialValues: TransactionFormValues = {
    customer: "",
    receiveDate: dayjs(),
    dateLoaded: dayjs(),
    datePickup: dayjs(),
    items: [{ type: "Clothes", kg: 0, loads: 0, price: 0 }],
    whitePrice: 0,
    fabcon: 0,
    detergent: 0,
    cs: 0,
    releaseBy: "",
    notes: "",
  };

  // Round now to seconds to prevent tiny millisecond future errors
  const now = dayjs().millisecond(0).second(0).toDate();
  const today = dayjs().endOf("day").toDate();
  const validationSchema = Yup.object().shape({
    customer: Yup.string().required("Customer is required"),
    receiveDate: Yup.date()
      .max(today, "Cannot select a future date")
      .required("Date received is required"),
    dateLoaded: Yup.date()
      .max(today, "Cannot select a future date")
      .required("Date loaded is required"),
    datePickup: Yup.date()
      .max(today, "Cannot select a future date")
      .required("Date pickup is required"),
    items: Yup.array().of(
      Yup.object().shape({
        type: Yup.string().required(),
        kg: Yup.number().min(0, "Cannot be negative"),
        loads: Yup.number().min(0, "Cannot be negative"),
        price: Yup.number().min(0, "Cannot be negative"),
      }),
    ),
    whitePrice: Yup.number().min(0, "Cannot be negative"),
    fabcon: Yup.number().min(0, "Cannot be negative"),
    detergent: Yup.number().min(0, "Cannot be negative"),
    cs: Yup.number().min(0, "Cannot be negative"),
    notes: Yup.string(),
  });

  const calculateTotals = (values: TransactionFormValues) => {
    const itemsTotal = values.items.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0,
    );
    const addOnsTotal =
      values.whitePrice +
      values.fabcon * 20 +
      values.detergent * 20 +
      values.cs * 20;

    return {
      itemsTotal,
      addOnsTotal,
      grandTotal: itemsTotal + addOnsTotal,
    };
  };

  const sanitizeNumber = (value: string) => {
    const num = Number(value);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  return (
    <Dialog open={isOpen} maxWidth="lg" fullWidth>
      <DialogTitle>Transaction</DialogTitle>
      <Formik
        validateOnChange={false}
        validateOnBlur={true}
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values) => console.log("SAVE PAYLOAD:", values)}
      >
        {({ values, errors, touched, setFieldValue, handleSubmit }) => {
          //const totals = calculateTotals(values);
          //console.log("render:", values);
          const renderDatePicker = (
            field: "receiveDate" | "dateLoaded" | "datePickup",
            label: string,
          ) => (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label={label}
                value={values[field]}
                onChange={(val) => setFieldValue(field, val)}
                maxDate={dayjs()} // disable future dates
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    error: !!getIn(errors, field),
                    helperText: getIn(errors, field),
                  },
                  actionBar: { actions: ["today", "cancel", "accept"] }, // Now button
                }}
              />
            </LocalizationProvider>
          );

          return (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={0}>
                {/* LEFT */}
                <Grid size={8} sx={{ pl: 2, pr: 0 }}>
                  <Paper elevation={1} sx={{ p: 4 }}>
                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <Autocomplete
                          freeSolo
                          size="small"
                          value={values.customer}
                          onInputChange={(_, v) => setFieldValue("customer", v)}
                          options={customers.map((c) => c.name)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Customer"
                              error={!!errors.customer && !!touched.customer}
                              helperText={
                                touched.customer ? errors.customer : ""
                              }
                            />
                          )}
                        />
                      </Grid>

                      <Grid size={6}>
                        {renderDatePicker("receiveDate", "Date Received")}
                      </Grid>
                      <Grid size={6}>
                        {renderDatePicker("dateLoaded", "Date Loaded")}
                      </Grid>

                      <Grid size={6} textAlign="center">
                        <FormControlLabel
                          control={<Checkbox size="small" />}
                          label="For Delivery"
                        />
                      </Grid>

                      <Grid size={12}>
                        <Divider>Load Details</Divider>
                      </Grid>

                      <FieldArray name="items">
                        {({ push, remove }) => (
                          <>
                            {values.items.map((item, index) => {
                              const kgError = getIn(
                                errors,
                                `items[${index}].kg`,
                              );
                              const kgTouched = getIn(
                                touched,
                                `items[${index}].kg`,
                              );
                              const loadsError = getIn(
                                errors,
                                `items[${index}].loads`,
                              );
                              const loadsTouched = getIn(
                                touched,
                                `items[${index}].loads`,
                              );
                              const priceError = getIn(
                                errors,
                                `items[${index}].price`,
                              );
                              const priceTouched = getIn(
                                touched,
                                `items[${index}].price`,
                              );

                              return (
                                <Grid
                                  container
                                  spacing={1}
                                  key={index}
                                  alignItems="center"
                                  sx={{ mb: 1 }}
                                >
                                  <Grid size={3}>
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Type</InputLabel>
                                      <Select
                                        value={item.type}
                                        label="Type"
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${index}].type`,
                                            e.target.value,
                                          )
                                        }
                                      >
                                        <MUIMenuItem value="Clothes">
                                          Clothes
                                        </MUIMenuItem>
                                        <MUIMenuItem value="Beddings">
                                          Beddings
                                        </MUIMenuItem>
                                        <MUIMenuItem value="Comforter">
                                          Comforter
                                        </MUIMenuItem>
                                      </Select>
                                    </FormControl>
                                  </Grid>

                                  <Grid size={3}>
                                    <TextField
                                      label="KG"
                                      size="small"
                                      type="number"
                                      fullWidth
                                      disabled={item.type === "Comforter"}
                                      value={item.kg === 0 ? "" : item.kg}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${index}].kg`,
                                          sanitizeNumber(e.target.value),
                                        )
                                      }
                                      error={kgTouched && !!kgError}
                                      helperText={kgTouched ? kgError : ""}
                                      slotProps={{
                                        input: {
                                          // Targets the Input component
                                          endAdornment: (
                                            <InputAdornment position="start">
                                              kg
                                            </InputAdornment>
                                          ),
                                        },
                                      }}
                                    />
                                  </Grid>

                                  <Grid size={2}>
                                    <TextField
                                      label="Loads"
                                      size="small"
                                      type="number"
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                      value={item.loads === 0 ? "" : item.loads}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${index}].loads`,
                                          sanitizeNumber(e.target.value),
                                        )
                                      }
                                      error={loadsTouched && !!loadsError}
                                      helperText={
                                        loadsTouched ? loadsError : ""
                                      }
                                    />
                                  </Grid>

                                  <Grid size={3}>
                                    <TextField
                                      label="Price"
                                      size="small"
                                      type="number"
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                      value={item.price === 0 ? "" : item.price}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${index}].price`,
                                          sanitizeNumber(e.target.value),
                                        )
                                      }
                                      error={priceTouched && !!priceError}
                                      helperText={
                                        priceTouched ? priceError : ""
                                      }
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            ₱
                                          </InputAdornment>
                                        ),
                                      }}
                                    />
                                  </Grid>

                                  {values.items.length > 1 && (
                                    <Grid size={1} textAlign="center">
                                      <Tooltip title="Delete Row">
                                        <IconButton
                                          color="error"
                                          size="small"
                                          onClick={() => remove(index)}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </Grid>
                                  )}
                                </Grid>
                              );
                            })}
                            <Grid container justifyContent="center">
                              <Tooltip title="Add Row">
                                <IconButton
                                  color="primary"
                                  onClick={() =>
                                    push({
                                      type: "Clothes",
                                      kg: 0,
                                      loads: 0,
                                      price: 0,
                                    })
                                  }
                                >
                                  <AddCircleIcon />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </>
                        )}
                      </FieldArray>

                      <Grid size={12}>
                        <Divider>Ad Ons Details</Divider>
                      </Grid>
                      <Grid size={3}>
                        <TextField
                          label="White Price"
                          size="small"
                          type="number"
                          fullWidth
                          inputProps={{ min: 0 }}
                          value={
                            values.whitePrice === 0 ? "" : values.whitePrice
                          }
                          onChange={(e) =>
                            setFieldValue(
                              "whitePrice",
                              sanitizeNumber(e.target.value),
                            )
                          }
                          error={
                            !!getIn(errors, "whitePrice") &&
                            !!getIn(touched, "whitePrice")
                          }
                          helperText={
                            getIn(touched, "whitePrice")
                              ? getIn(errors, "whitePrice")
                              : ""
                          }
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                ₱
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid size={3}>
                        <NumberField
                          label="Fabcon"
                          min={0}
                          max={10}
                          size="small"
                          value={values.fabcon}
                          onValueChange={(val) => setFieldValue("fabcon", val)}
                        />
                      </Grid>
                      <Grid size={3}>
                        <NumberField
                          label="Detergent"
                          min={0}
                          max={10}
                          size="small"
                          value={values.detergent}
                          onValueChange={(val) =>
                            setFieldValue("detergent", val)
                          }
                        />
                      </Grid>
                      <Grid size={3}>
                        <NumberField
                          label="Color Safe"
                          min={0}
                          max={10}
                          size="small"
                          value={values.cs}
                          onValueChange={(val) => setFieldValue("cs", val)}
                        />
                      </Grid>

                      <Grid size={12}>
                        <Divider>Release Details</Divider>
                      </Grid>

                      <Grid size={6}>
                        {renderDatePicker("datePickup", "Date Pickup")}
                      </Grid>

                      <Grid size={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Release By</InputLabel>
                          <Select
                            value={values.releaseBy}
                            onChange={(e) =>
                              setFieldValue("releaseBy", e.target.value)
                            }
                          >
                            <MUIMenuItem value="Employee 1">
                              Employee 1
                            </MUIMenuItem>
                            <MUIMenuItem value="Employee 2">
                              Employee 2
                            </MUIMenuItem>
                            <MUIMenuItem value="Employee 3">
                              Employee 3
                            </MUIMenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          id="outlined-multiline-flexible"
                          label="Multiline"
                          fullWidth
                          multiline
                          rows={2}
                          value={values.notes}
                          onChange={(e) => {
                            setFieldValue("notes", e.target.value);
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* RIGHT */}
                <Grid size={4} sx={{ pr: 2, pl: 0.5 }}>
                  <BillSummary transactionFormValues={values} />
                </Grid>
              </Grid>

              <DialogActions sx={{ justifyContent: "center", pb: 4 }}>
                <Button type="submit" variant="contained" size="small">
                  Save
                </Button>
                <Button variant="contained" size="small" onClick={handleClose}>
                  Cancel
                </Button>
              </DialogActions>
            </form>
          );
        }}
      </Formik>
    </Dialog>
  );
};

export default TransactionModal;
