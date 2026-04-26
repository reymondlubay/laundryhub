// src/components/ThemeContext/ThemeContext.tsx
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

type ThemeContextType = {
  darkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

/** Light mode: cool slate / blue-gray (distinct from dark: airy surfaces + deeper steel primary). */
const LIGHT = {
  canvas: "#dce4ed",
  surface: "#e8eef5",
  elevated: "#f1f5f9",
  ink: "#1a2430",
  muted: "#5c6d7e",
  /** Table header strip — slightly deeper than surface */
  tableHead: "#d2dde8",
} as const;

/** Dark mode: previous cool slate / blue-gray (pre–Lush Forest). */
const DARK = {
  canvas: "#0f141a",
  surface: "#161d26",
  elevated: "#1e2733",
  accent: "#8eb6d8",
  ink: "#e2eaf3",
  inkMuted: "#9aacbd",
} as const;

const fontStack = '"Montserrat", "Helvetica Neue", Arial, sans-serif';

export const CustomThemeProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const storedTheme = localStorage.getItem("darkMode");
    return storedTheme === "true";
  });

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("darkMode", String(newMode));
      return newMode;
    });
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem("darkMode");
    if (storedTheme === null) {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setDarkMode(prefersDark);
      localStorage.setItem("darkMode", String(prefersDark));
    }
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        shape: { borderRadius: 0 },
        typography: {
          fontFamily: fontStack,
          h1: { fontFamily: fontStack },
          h2: { fontFamily: fontStack },
          h3: { fontFamily: fontStack },
          h4: { fontFamily: fontStack },
          h5: { fontFamily: fontStack },
          h6: { fontFamily: fontStack },
          subtitle1: { fontFamily: fontStack },
          subtitle2: { fontFamily: fontStack },
          body1: { fontFamily: fontStack },
          body2: { fontFamily: fontStack },
          button: {
            fontFamily: fontStack,
            textTransform: "none",
            fontWeight: 600,
          },
          caption: { fontFamily: fontStack },
          overline: { fontFamily: fontStack },
        },
        palette: {
          mode: darkMode ? "dark" : "light",
          ...(darkMode
            ? {
                primary: {
                  main: DARK.accent,
                  light: "#aacae6",
                  dark: "#6e9bc0",
                },
                secondary: {
                  main: DARK.inkMuted,
                  light: "#b8c5d4",
                  dark: "#7d8fa3",
                },
                background: {
                  default: DARK.canvas,
                  paper: DARK.surface,
                },
                text: {
                  primary: DARK.ink,
                  secondary: DARK.inkMuted,
                },
                divider: "rgba(226, 234, 243, 0.1)",
                action: {
                  hover: "rgba(142, 182, 216, 0.12)",
                  selected: "rgba(142, 182, 216, 0.18)",
                  disabledBackground: "rgba(226, 234, 243, 0.06)",
                },
              }
            : {
                primary: {
                  main: "#3a5f7a",
                  light: "#5a7a96",
                  dark: "#2a4a62",
                  contrastText: "#ffffff",
                },
                secondary: {
                  main: "#6b8299",
                  light: "#8a9db3",
                  dark: "#4e6276",
                  contrastText: "#ffffff",
                },
                background: {
                  default: LIGHT.canvas,
                  paper: LIGHT.surface,
                },
                text: {
                  primary: LIGHT.ink,
                  secondary: LIGHT.muted,
                },
                divider: "rgba(26, 36, 48, 0.12)",
                action: {
                  hover: "rgba(58, 95, 122, 0.09)",
                  selected: "rgba(58, 95, 122, 0.14)",
                  disabledBackground: "rgba(26, 36, 48, 0.06)",
                },
              }),
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: { fontFamily: fontStack },
            },
          },
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: { borderRadius: 0 },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: { borderRadius: 0 },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: { borderRadius: 0 },
            },
          },
          MuiInputBase: {
            styleOverrides: {
              root: { borderRadius: 0 },
            },
          },
          MuiFilledInput: {
            styleOverrides: {
              root: { borderRadius: 0 },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { borderRadius: 0 },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: ({ theme }) => ({
                borderRadius: 0,
                backgroundImage: "none",
                backgroundColor: theme.palette.background.paper,
                boxShadow: "none",
                border: `1px solid ${theme.palette.divider}`,
              }),
            },
          },
          MuiPaper: {
            defaultProps: { elevation: 0, square: true },
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 0,
                backgroundImage: "none",
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                boxShadow: "none",
                border: `1px solid ${theme.palette.divider}`,
              }),
            },
          },
          MuiAppBar: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 0,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                backgroundImage: "none",
                boxShadow: "none",
                borderBottom: `1px solid ${theme.palette.divider}`,
              }),
            },
          },
          MuiTableContainer: {
            styleOverrides: {
              root: ({ theme }) => ({
                backgroundColor: theme.palette.background.paper,
                borderRadius: 0,
                border: `1px solid ${theme.palette.divider}`,
              }),
            },
          },
          MuiTableHead: {
            styleOverrides: {
              root: ({ theme }) => ({
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? DARK.elevated
                    : LIGHT.tableHead,
                "& .MuiTableCell-head": {
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  borderBottomColor: theme.palette.divider,
                },
              }),
            },
          },
          MuiTableBody: {
            styleOverrides: {
              root: ({ theme }) => ({
                "& .MuiTableRow-root": {
                  "&:nth-of-type(odd)": {
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? DARK.elevated
                        : LIGHT.elevated,
                  },
                  "&:nth-of-type(even)": {
                    backgroundColor: theme.palette.background.paper,
                  },
                  "&:hover": {
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(142, 182, 216, 0.08)"
                        : "rgba(58, 95, 122, 0.08)",
                  },
                },
                "& .MuiTableCell-body": {
                  color: theme.palette.text.primary,
                  borderBottomColor: theme.palette.divider,
                },
              }),
            },
          },
        },
      }),
    [darkMode],
  );

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
