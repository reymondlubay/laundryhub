import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import { Avatar } from "@mui/material";
import Grid from "@mui/material/Grid";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useThemeContext } from "../../ThemeContext/ThemeContext";
import { useSidebar } from "../Sidebar/SidebarContext";

const AppHeader = () => {
  const { darkMode, toggleTheme } = useThemeContext();
  const { collapsed, toggleSidebar } = useSidebar();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          backgroundColor: darkMode ? "#121212" : "#ffffff",
          color: darkMode ? "#ffffff" : "#000000",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Toolbar>
          <Grid
            container
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: "100%" }}
          >
            {/* Left: Menu */}
            <Grid size={8}>
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{
                  mr: 2,
                  transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
                onClick={toggleSidebar} // ✅ Collapse/expand sidebar
              >
                <MenuIcon />
              </IconButton>
            </Grid>

            {/* Right: Avatar + Theme Toggle */}
            <Grid
              size={4}
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              {/* Avatar */}
              <Avatar
                sx={{
                  bgcolor: darkMode ? "#ffffff" : "#1976d2",
                  color: darkMode ? "#000" : "#fff",
                  width: 38,
                  height: 38,
                  fontSize: 16,
                }}
              >
                H
              </Avatar>

              {/* Theme toggle */}
              <IconButton
                onClick={toggleTheme}
                sx={{
                  backgroundColor: darkMode
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(0, 0, 0, 0.05)",
                  borderRadius: "12px",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor: darkMode
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(0, 0, 0, 0.08)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                {darkMode ? (
                  <Brightness7Icon />
                ) : (
                  <Brightness4Icon color="primary" />
                )}
              </IconButton>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default AppHeader;
