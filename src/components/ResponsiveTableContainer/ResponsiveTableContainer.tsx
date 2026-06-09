import { TableContainer, type TableContainerProps } from "@mui/material";

type ResponsiveTableContainerProps = TableContainerProps;

export function ResponsiveTableContainer({
  sx,
  children,
  ...props
}: ResponsiveTableContainerProps) {
  return (
    <TableContainer
      {...props}
      sx={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        ...sx,
      }}
    >
      {children}
    </TableContainer>
  );
}

export default ResponsiveTableContainer;
