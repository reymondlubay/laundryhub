import React from "react";
import {
  Box,
  Skeleton,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Paper,
  Card,
  CardContent,
  Stack,
} from "@mui/material";

/**
 * Table Skeleton Loader
 * Displays placeholder rows while table data is loading
 */
export const TableSkeleton: React.FC<{
  columns: number;
  rows?: number;
  height?: number;
}> = ({ columns, rows = 5, height = 40 }) => {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex} sx={{ p: 1 }}>
              <Skeleton variant="text" height={height} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
};

/**
 * Table Header Skeleton
 * Displays placeholder column headers
 */
export const TableHeaderSkeleton: React.FC<{ columns: number }> = ({
  columns,
}) => {
  return (
    <TableHead>
      <TableRow>
        {Array.from({ length: columns }).map((_, index) => (
          <TableCell key={index}>
            <Skeleton variant="text" height={24} />
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

/**
 * Card Skeleton Loader
 * Used for dashboard-style cards
 */
export const CardSkeleton: React.FC<{ variant?: "title" | "metric" }> = ({
  variant = "metric",
}) => {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        {variant === "metric" ? (
          <Stack spacing={1}>
            <Skeleton variant="text" height={20} width="60%" />
            <Skeleton variant="text" height={32} width="80%" />
            <Skeleton variant="circular" height={40} width={40} />
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Skeleton variant="text" height={24} width="70%" />
            <Skeleton variant="rectangular" height={100} />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Form Field Skeleton
 * Simulates loading form fields in modals
 */
export const FormFieldSkeleton: React.FC<{
  rows?: number;
  fullWidth?: boolean;
}> = ({ rows = 3, fullWidth = true }) => {
  return (
    <Stack spacing={2}>
      {Array.from({ length: rows }).map((_, index) => (
        <Box key={index}>
          <Skeleton variant="text" height={20} width={120} sx={{ mb: 1 }} />
          <Skeleton
            variant="rectangular"
            height={40}
            width={fullWidth ? "100%" : "80%"}
          />
        </Box>
      ))}
    </Stack>
  );
};

/**
 * List Item Skeleton
 * Generic skeleton for list/row items
 */
export const ListItemSkeleton: React.FC<{
  rows?: number;
  avatar?: boolean;
}> = ({ rows = 3, avatar = false }) => {
  return (
    <Stack spacing={2}>
      {Array.from({ length: rows }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 1,
          }}
        >
          {avatar && <Skeleton variant="circular" height={40} width={40} />}
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" height={20} width="80%" sx={{ mb: 1 }} />
            <Skeleton variant="text" height={16} width="60%" />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

/**
 * Dashboard Cards Skeleton Grid
 * Multiple card skeletons in grid layout
 */
export const DashboardCardsSkeleton: React.FC<{ count?: number }> = ({
  count = 6,
}) => {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <CardSkeleton variant="metric" />
        </Grid>
      ))}
    </Grid>
  );
};

/**
 * Paper Skeleton
 * Generic skeleton wrapper for paper components
 */
export const PaperSkeleton: React.FC<{
  height?: number;
  rows?: number;
}> = ({ height = 200, rows = 4 }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            height={Math.floor(height / rows)}
          />
        ))}
      </Stack>
    </Paper>
  );
};

/**
 * Button Skeleton
 * Skeleton for button loading state
 */
export const ButtonSkeleton: React.FC<{ width?: string | number }> = ({
  width = 100,
}) => {
  return <Skeleton variant="rectangular" height={36} width={width} />;
};

/**
 * Modal Content Skeleton
 * Complete skeleton for modal dialogs
 */
export const ModalContentSkeleton: React.FC<{
  fields?: number;
}> = ({ fields = 4 }) => {
  return (
    <Stack spacing={3}>
      {/* Title skeleton */}
      <Skeleton variant="text" height={32} width="40%" />
      {/* Form fields */}
      <FormFieldSkeleton rows={fields} />
      {/* Action buttons skeleton */}
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <ButtonSkeleton width={80} />
        <ButtonSkeleton width={100} />
      </Box>
    </Stack>
  );
};
