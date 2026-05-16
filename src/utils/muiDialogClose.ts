import type { DialogProps } from "@mui/material/Dialog";

/** Prevents MUI Dialog from closing when the backdrop is clicked (Cancel / actions must be used). */
export const ignoreBackdropClose = (
  onClose: () => void,
): NonNullable<DialogProps["onClose"]> => (_event, reason) => {
  if (reason === "backdropClick") return;
  onClose();
};
