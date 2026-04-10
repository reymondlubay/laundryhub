import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import addonsPricingService, {
  type AddonsPricing,
  DEFAULT_ADDONS_PRICING,
} from "../../services/addonsPricingService";

const AddonsPricingPage: React.FC = () => {
  const [values, setValues] = React.useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const pricing = await addonsPricingService.get();
        setValues(pricing);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load pricing.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleNumberChange =
    (field: keyof AddonsPricing) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setValues((prev) => ({
        ...prev,
        [field]: Number.isFinite(value) && value >= 0 ? value : 0,
      }));
      setSuccess(null);
    };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const saved = await addonsPricingService.update(values);
      setValues(saved);
      setSuccess("Addons pricing saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save pricing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, maxWidth: 760 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Adons Pricing
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure dynamic per-unit prices for transaction add-ons.
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Fabcon price"
                  type="number"
                  value={values.fabconPrice}
                  onChange={handleNumberChange("fabconPrice")}
                  fullWidth
                  inputProps={{ min: 0, step: "0.01" }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Detergent price"
                  type="number"
                  value={values.detergentPrice}
                  onChange={handleNumberChange("detergentPrice")}
                  fullWidth
                  inputProps={{ min: 0, step: "0.01" }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Colorsafe price"
                  type="number"
                  value={values.colorSafePrice}
                  onChange={handleNumberChange("colorSafePrice")}
                  fullWidth
                  inputProps={{ min: 0, step: "0.01" }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AddonsPricingPage;
