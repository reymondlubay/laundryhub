import { Box } from "@mui/material";
import { appConfig } from "../../config/app.config";

type CompanyLogoProps = {
  size?: number;
  alt?: string;
};

const CompanyLogo = ({
  size = 36,
  alt = appConfig.companyName,
}: CompanyLogoProps) => {
  return (
    <Box
      component="img"
      src={appConfig.logoUrl}
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
