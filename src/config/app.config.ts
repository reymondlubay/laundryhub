const companyName =
  import.meta.env.VITE_COMPANY_NAME?.trim() || "Laundry Hub";

export const appConfig = {
  companyName,
  logoUrl:
    import.meta.env.VITE_COMPANY_LOGO_URL?.trim() || "/company-logo.png",
  startingSystemMessage: `Starting ${companyName}…`,
} as const;
