// src/context/ThemeContext.tsx
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

export const CustomThemeProvider = ({ children }: { children: ReactNode }) => {
  // ✅ Load from localStorage on initial render
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const storedTheme = localStorage.getItem("darkMode");
    return storedTheme === "true"; // convert string to boolean
  });

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("darkMode", String(newMode)); // ✅ Save to localStorage
      return newMode;
    });
  };

  // ✅ Optional: Sync with system preference if no localStorage found
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

  // ✅ Prevent theme recreation on every render
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          ...(darkMode
            ? {
                // Dark mode colors
                primary: {
                  main: "#90caf9", // Light blue for better contrast
                },
                secondary: {
                  main: "#f48fb1", // Light pink
                },
                background: {
                  default: "#121212",
                  paper: "#1e1e1e",
                },
                text: {
                  primary: "#ffffff",
                  secondary: "#b0b0b0",
                },
              }
            : {
                // Light mode colors
                primary: {
                  main: "#1976d2",
                },
                secondary: {
                  main: "#dc004e",
                },
                background: {
                  default: "#ffffff",
                  paper: "#f5f5f5",
                },
                text: {
                  primary: "#000000",
                  secondary: "#666666",
                },
              }),
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
                color: darkMode ? "#ffffff" : "#000000",
                boxShadow: darkMode
                  ? "0 2px 8px rgba(0,0,0,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.1)",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
                color: darkMode ? "#ffffff" : "#000000",
              },
            },
          },
          MuiTableContainer: {
            styleOverrides: {
              root: {
                backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
              },
            },
          },
          MuiTableHead: {
            styleOverrides: {
              root: {
                backgroundColor: darkMode ? "#333333" : "#f5f5f5",
                "& .MuiTableCell-head": {
                  color: darkMode ? "#ffffff" : "#000000",
                  fontWeight: 600,
                },
              },
            },
          },
          MuiTableBody: {
            styleOverrides: {
              root: {
                "& .MuiTableRow-root": {
                  "&:nth-of-type(odd)": {
                    backgroundColor: darkMode ? "#2a2a2a" : "#fafafa",
                  },
                  "&:nth-of-type(even)": {
                    backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
                  },
                  "&:hover": {
                    backgroundColor: darkMode ? "#333333" : "#f0f0f0",
                  },
                },
                "& .MuiTableCell-body": {
                  color: darkMode ? "#ffffff" : "#000000",
                  borderBottom: darkMode
                    ? "1px solid #333333"
                    : "1px solid #e0e0e0",
                },
              },
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
