const companyName =
  import.meta.env.VITE_COMPANY_NAME?.trim() || "Laundry Hub";

export const appConfig = {
  companyName,
  /** Dark-blue logo — used in light mode. */
  logoUrl:
    import.meta.env.VITE_COMPANY_LOGO_URL?.trim() ||
    "/laundryhub-logo-dark-514x486.png",
  /** Light logo — best on dark backgrounds (dark mode). */
  logoUrlLight:
    import.meta.env.VITE_COMPANY_LOGO_URL_LIGHT?.trim() ||
    "/laundryhub-logo-light-514x486.png",
  startingSystemMessage: `Starting ${companyName}…`,
} as const;
