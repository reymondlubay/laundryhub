import { Box } from "@mui/material";
import { getLoadsThresholdColor } from "../../utils/loadsThresholdColor";

const formatLoads = (value: number, decimals?: number): string => {
  const n = Number(value) || 0;
  if (decimals !== undefined) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return Math.round(n).toLocaleString("en-US");
};

type ColoredLoadCountProps = {
  loads: number;
  fontWeight?: number | string;
  /** When set, show fixed decimal places instead of rounded whole number */
  decimals?: number;
};

const ColoredLoadCount: React.FC<ColoredLoadCountProps> = ({
  loads,
  fontWeight = 600,
  decimals,
}) => (
  <Box
    component="span"
    sx={{ color: getLoadsThresholdColor(loads), fontWeight }}
  >
    {formatLoads(loads, decimals)}
  </Box>
);

export default ColoredLoadCount;
