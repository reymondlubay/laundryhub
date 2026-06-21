import React from "react";
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import type {
  TransactionLoadTypeFilter,
  TransactionSortBy,
  TransactionSortDirection,
} from "../utils/transactionListFilters";

const compactSelectSx = {
  height: 32,
  fontSize: "0.8125rem",
  bgcolor: "background.paper",
  "& .MuiSelect-select": { py: 0.5, pl: 1.25, pr: 3 },
};

type TransactionListControlsProps = {
  showPendingOnly: boolean;
  showReadyForPickupOnly: boolean;
  showUnpaidOnly: boolean;
  showDeliveryOnly: boolean;
  sortBy: TransactionSortBy;
  sortDirection: TransactionSortDirection;
  loadTypeFilter: TransactionLoadTypeFilter;
  priceMin: string;
  priceMax: string;
  priceRangeInvalid: boolean;
  onShowPendingOnlyChange: (checked: boolean) => void;
  onShowReadyForPickupOnlyChange: (checked: boolean) => void;
  onShowUnpaidOnlyChange: (checked: boolean) => void;
  onShowDeliveryOnlyChange: (checked: boolean) => void;
  onSortByChange: (value: TransactionSortBy) => void;
  onSortDirectionChange: (value: TransactionSortDirection) => void;
  onLoadTypeFilterChange: (value: TransactionLoadTypeFilter) => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
};

const compactPriceFieldSx = {
  width: 72,
  "& .MuiInputBase-root": { height: 32, fontSize: "0.8125rem" },
  "& .MuiInputBase-input": { py: 0.5, px: 1 },
};

const ControlLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="caption"
    color="text.secondary"
    sx={{ fontWeight: 600, letterSpacing: 0.2, whiteSpace: "nowrap" }}
  >
    {children}
  </Typography>
);

const StatusLegend = () => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: "#d8f0d2",
          border: "1px solid",
          borderColor: "divider",
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Loaded
      </Typography>
    </Stack>
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: "#ffe7b3",
          border: "1px solid",
          borderColor: "divider",
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Picked
      </Typography>
    </Stack>
  </Stack>
);

const TransactionListControls: React.FC<TransactionListControlsProps> = ({
  showPendingOnly,
  showReadyForPickupOnly,
  showUnpaidOnly,
  showDeliveryOnly,
  sortBy,
  sortDirection,
  loadTypeFilter,
  priceMin,
  priceMax,
  priceRangeInvalid,
  onShowPendingOnlyChange,
  onShowReadyForPickupOnlyChange,
  onShowUnpaidOnlyChange,
  onShowDeliveryOnlyChange,
  onSortByChange,
  onSortDirectionChange,
  onLoadTypeFilterChange,
  onPriceMinChange,
  onPriceMaxChange,
}) => {
  return (
    <Box
      sx={{
        mb: 1.5,
        px: { xs: 0, sm: 1.5 },
        py: { xs: 0, sm: 1.25 },
        borderRadius: 1,
        border: { xs: "none", sm: "1px solid" },
        borderColor: "divider",
        bgcolor: { xs: "transparent", sm: "action.hover" },
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 1.25, lg: 0 }}
        alignItems={{ xs: "stretch", lg: "center" }}
        justifyContent="space-between"
      >
        <Stack
          direction="row"
          flexWrap="wrap"
          alignItems="center"
          useFlexGap
          sx={{ gap: { xs: 1, sm: 1.5, md: 2 } }}
        >
          <Stack direction="row" spacing={0.25} alignItems="center">
            <FormControlLabel
              sx={{ m: 0, mr: 0.5 }}
              control={
                <Checkbox
                  size="small"
                  checked={showPendingOnly}
                  onChange={(e) => onShowPendingOnlyChange(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
                  Pending
                </Typography>
              }
            />
            <FormControlLabel
              sx={{ m: 0, mr: 0.5 }}
              control={
                <Checkbox
                  size="small"
                  checked={showReadyForPickupOnly}
                  onChange={(e) =>
                    onShowReadyForPickupOnlyChange(e.target.checked)
                  }
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
                  Ready
                </Typography>
              }
            />
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={showUnpaidOnly}
                  onChange={(e) => onShowUnpaidOnlyChange(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
                  Unpaid
                </Typography>
              }
            />
          </Stack>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: "none", md: "block" }, alignSelf: "stretch" }}
          />

          <Stack direction="row" spacing={0.75} alignItems="center">
            <ControlLabel>Sort</ControlLabel>
            <Select
              size="small"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as TransactionSortBy)}
              sx={{ ...compactSelectSx, minWidth: 96 }}
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="kg">KG</MenuItem>
              <MenuItem value="loads">Load</MenuItem>
              <MenuItem value="price">Price</MenuItem>
            </Select>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={sortDirection}
              onChange={(_, value) => {
                if (value) onSortDirectionChange(value);
              }}
              aria-label="Sort order"
              sx={{
                height: 32,
                "& .MuiToggleButton-root": {
                  px: 0.75,
                  py: 0.25,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                },
              }}
            >
              <ToggleButton value="desc" aria-label="Descending">
                <ArrowDownwardIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
              <ToggleButton value="asc" aria-label="Ascending">
                <ArrowUpwardIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: "none", md: "block" }, alignSelf: "stretch" }}
          />

          <Stack direction="row" spacing={0.75} alignItems="center">
            <ControlLabel>Type</ControlLabel>
            <Select
              size="small"
              value={loadTypeFilter}
              displayEmpty
              onChange={(e) =>
                onLoadTypeFilterChange(
                  e.target.value as TransactionLoadTypeFilter,
                )
              }
              renderValue={(selected) => {
                if (!selected) return "All";
                if (selected === "Beddings") return "Bedding";
                return selected;
              }}
              sx={{ ...compactSelectSx, minWidth: 108 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Clothes">Clothes</MenuItem>
              <MenuItem value="Beddings">Bedding</MenuItem>
              <MenuItem value="Comforter">Comforter</MenuItem>
            </Select>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center">
            <ControlLabel>Price</ControlLabel>
            <TextField
              size="small"
              placeholder="Min"
              type="number"
              value={priceMin}
              onChange={(e) => onPriceMinChange(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
              sx={compactPriceFieldSx}
            />
            <TextField
              size="small"
              placeholder="Max"
              type="number"
              value={priceMax}
              onChange={(e) => onPriceMaxChange(e.target.value)}
              error={priceRangeInvalid}
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
              sx={compactPriceFieldSx}
            />
          </Stack>

          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Checkbox
                size="small"
                checked={showDeliveryOnly}
                onChange={(e) => onShowDeliveryOnlyChange(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
                Delivery
              </Typography>
            }
          />
        </Stack>

        <Box sx={{ display: { xs: "none", lg: "block" } }}>
          <StatusLegend />
        </Box>
      </Stack>

      <Box sx={{ display: { xs: "block", lg: "none" }, mt: 0.5 }}>
        <StatusLegend />
      </Box>
    </Box>
  );
};

export default TransactionListControls;
