import { Box } from "@mui/material";
import { appConfig } from "../../config/app.config";
import { useThemeContext } from "../ThemeContext/ThemeContext";

type CompanyLogoProps = {
  size?: number;
  alt?: string;
};

const CompanyLogo = ({
  size = 36,
  alt = appConfig.companyName,
}: CompanyLogoProps) => {
  const { darkMode } = useThemeContext();
  const src = darkMode ? appConfig.logoUrlLight : appConfig.logoUrl;

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
};

export default CompanyLogo;
