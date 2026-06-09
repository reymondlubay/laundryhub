import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Grid from "@mui/material/Grid";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useMediaQuery, useTheme } from "@mui/material";
import { useThemeContext } from "../../ThemeContext/ThemeContext";
import { useSidebar } from "../Sidebar/SidebarContext";
import UserMenu from "../../UserMenu/UserMenu";
import LiveClock from "./LiveClock";

const AppHeader = () => {
  const { darkMode, toggleTheme } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { collapsed, toggleSidebar, mobileOpen, setMobileOpen } = useSidebar();

  const handleMenuClick = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
      return;
    }
    toggleSidebar();
  };

  return (
    <Box sx={{ flexShrink: 0 }}>
      <AppBar
        position="static"
        elevation={0}
        sx={(muiTheme) => ({
          boxShadow:
            muiTheme.palette.mode === "dark"
              ? "0 1px 0 rgba(255,255,255,0.06)"
              : "0 1px 0 rgba(26, 39, 52, 0.08)",
        })}
      >
        <Toolbar>
          <Grid
            container
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: "100%" }}
          >
            <Grid size={8}>
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{
                  mr: 2,
                  minWidth: 44,
                  minHeight: 44,
                  transform:
                    !isMobile && collapsed ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
                onClick={handleMenuClick}
              >
                <MenuIcon />
              </IconButton>
            </Grid>

            <Grid
              size={4}
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <LiveClock />
              </Box>

              <UserMenu />

              <IconButton
                onClick={toggleTheme}
                aria-label="Toggle theme"
                sx={{
                  backgroundColor: "action.hover",
                  borderRadius: 0,
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor: "action.selected",
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
