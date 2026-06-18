import React, { useState } from "react";
import {
  IconButton,
  InputAdornment,
  TextField,
  type TextFieldProps,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

type PasswordFieldProps = Omit<TextFieldProps, "type">;

const PasswordField: React.FC<PasswordFieldProps> = ({
  size = "small",
  InputProps,
  slotProps,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextField
      {...props}
      size={size}
      type={showPassword ? "text" : "password"}
      slotProps={{
        ...slotProps,
        htmlInput: {
          ...(typeof slotProps?.htmlInput === "object" ? slotProps.htmlInput : {}),
        },
      }}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              size={size === "small" ? "small" : "medium"}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              onMouseDown={(event) => event.preventDefault()}
              edge="end"
            >
              {showPassword ? (
                <VisibilityOff fontSize={size === "small" ? "small" : "medium"} />
              ) : (
                <Visibility fontSize={size === "small" ? "small" : "medium"} />
              )}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default PasswordField;
