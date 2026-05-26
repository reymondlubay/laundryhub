import { Box, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import {
  DOW_WEEKEND_TEXT_COLOR,
  LOAD_THRESHOLD_LEGEND,
} from "../../utils/loadsThresholdColor";

type LoadsThresholdLegendProps = {
  /** Label before color swatches, e.g. "Sum of Load" or "Total Loads" */
  labelPrefix?: string;
  showDowLegend?: boolean;
  sx?: SxProps<Theme>;
};

const LoadsThresholdLegend: React.FC<LoadsThresholdLegendProps> = ({
  labelPrefix = "Total Loads",
  showDowLegend = false,
  sx,
}) => (
  <Stack
    direction="row"
    flexWrap="wrap"
    alignItems="center"
    gap={{ xs: 1, sm: 1.5 }}
    sx={sx}
  >
    <Typography
      variant="caption"
      sx={{ color: "text.secondary", fontWeight: 600, mr: 0.25 }}
    >
      {labelPrefix}:
    </Typography>
    {LOAD_THRESHOLD_LEGEND.map((item) => (
      <Stack
        key={item.label}
        direction="row"
        alignItems="center"
        spacing={0.5}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: item.color,
            flexShrink: 0,
          }}
        />
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {item.label}
        </Typography>
      </Stack>
    ))}
    {showDowLegend ? (
      <>
        <Box
          sx={{
            width: "1px",
            height: 14,
            bgcolor: "divider",
            mx: { xs: 0, sm: 0.5 },
            display: { xs: "none", sm: "block" },
          }}
        />
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: DOW_WEEKEND_TEXT_COLOR,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            DOW: Fri, Sat, Sun
          </Typography>
        </Stack>
      </>
    ) : null}
  </Stack>
);

export default LoadsThresholdLegend;
