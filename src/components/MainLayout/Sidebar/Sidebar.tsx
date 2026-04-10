import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import {
  FaChartBar,
  FaFileAlt,
  FaShoppingCart,
  FaWarehouse,
  FaUsers,
} from "react-icons/fa";
import { Box, Typography } from "@mui/material";
import { useThemeContext } from "../../ThemeContext/ThemeContext";
import { Link, useLocation } from "react-router-dom";
import route from "../../../constants/route";
import { isAdmin } from "../../../utils/roleAccess";
import "./sidebar.scss";
import { useSidebar } from "./SidebarContext";

export default function SidebarMenu() {
  const { darkMode } = useThemeContext();
  const { collapsed } = useSidebar();
  const location = useLocation();
  const isAdminUser = isAdmin();

  const activePath = location.pathname;

  return (
    <Sidebar
      collapsed={collapsed}
      backgroundColor={
        darkMode ? "rgba(20, 20, 20, 0.85)" : "rgba(255, 255, 255, 0.9)"
      }
      className={`sidebar-container ${darkMode ? "dark" : "light"}`}
      rootStyles={{
        transition: "all 0.3s ease",
        borderRight: darkMode
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(0,0,0,0.06)",
        boxShadow: darkMode
          ? "2px 0 10px rgba(0,0,0,0.5)"
          : "2px 0 10px rgba(0,0,0,0.08)",
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 1.5,
          px: 2,
          py: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "18px",
              flexShrink: 0,
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            }}
          >
            LH
          </Box>

          {!collapsed && (
            <Typography
              sx={{
                fontWeight: "bold",
                color: "#3b82f6",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                letterSpacing: 0.5,
              }}
            >
              Laundry Hub
            </Typography>
          )}
        </Box>
      </Box>

      {/* SECTION LABEL */}
      {!collapsed && (
        <Box sx={{ px: 2, mt: 1, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              textTransform: "uppercase",
              color: darkMode ? "#9ca3af" : "#6b7280",
              letterSpacing: 0.5,
            }}
          >
            General
          </Typography>
        </Box>
      )}

      {/* MENU ITEMS */}
      <Menu
        menuItemStyles={{
          button: ({ active }) => ({
            backgroundColor: active
              ? darkMode
                ? "rgba(59,130,246,0.2)"
                : "rgba(59,130,246,0.1)"
              : "transparent",
            color: active ? "#3b82f6" : darkMode ? "#f3f4f6" : "#1f2937",
            borderRadius: "8px",
            margin: "2px 8px",
            "&:hover": {
              backgroundColor: darkMode
                ? "rgba(59,130,246,0.15)"
                : "rgba(59,130,246,0.08)",
              color: "#3b82f6",
            },
          }),
          subMenuContent: {
            backgroundColor: darkMode
              ? "rgba(10, 10, 10, 0.55)"
              : "rgba(245, 249, 255, 0.9)",
            borderRadius: 8,
            margin: "2px 8px",
          },
        }}
      >
        <MenuItem
          component={<Link to={route.DASHBOARD} />}
          icon={<FaChartBar />}
          active={activePath === route.DASHBOARD} // ✅ active state
        >
          Dashboard
        </MenuItem>

        <MenuItem
          component={<Link to={route.TRANSACTION} />}
          icon={<FaShoppingCart />}
          active={activePath === route.TRANSACTION}
        >
          Transaction
        </MenuItem>

        <MenuItem
          component={<Link to={route.CUSTOMER} />}
          icon={<FaUsers />}
          active={activePath === route.CUSTOMER}
        >
          Customer
        </MenuItem>

        {isAdminUser && (
          <SubMenu
            label="Report"
            icon={<FaFileAlt />}
            defaultOpen={activePath.startsWith("/reports")}
            rootStyles={{
              color: activePath.startsWith("/reports")
                ? "#3b82f6"
                : darkMode
                  ? "#f3f4f6"
                  : "#1f2937",
            }}
          >
            <MenuItem
              component={<Link to={route.REPORT_TRANSACTION} />}
              active={activePath === route.REPORT_TRANSACTION}
            >
              Transaction Report
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_CUSTOMER} />}
              active={activePath === route.REPORT_CUSTOMER}
            >
              Customer Report
            </MenuItem>
          </SubMenu>
        )}
      </Menu>

      {/* EXTRA SECTION */}
      {!collapsed && (
        <Box sx={{ px: 2, mt: 2, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              textTransform: "uppercase",
              color: darkMode ? "#9ca3af" : "#6b7280",
              letterSpacing: 0.5,
            }}
          >
            Extra
          </Typography>
        </Box>
      )}

      <Menu
        menuItemStyles={{
          button: {
            color: darkMode ? "#f3f4f6" : "#1f2937",
            "&:hover": {
              backgroundColor: darkMode
                ? "rgba(59,130,246,0.15)"
                : "rgba(59,130,246,0.08)",
              color: "#3b82f6",
            },
          },
          subMenuContent: {
            backgroundColor: darkMode
              ? "rgba(10, 10, 10, 0.55)"
              : "rgba(245, 249, 255, 0.9)",
            borderRadius: 8,
            margin: "2px 8px",
          },
        }}
      >
        {isAdminUser ? (
          <MenuItem
            component={<Link to={route.USERS} />}
            icon={<FaUsers />}
            active={activePath === route.USERS}
          >
            Users
          </MenuItem>
        ) : null}
        {isAdminUser ? (
          <SubMenu
            label="Settings"
            icon={<FaWarehouse />}
            defaultOpen={activePath.startsWith("/settings")}
            rootStyles={{
              color: activePath.startsWith("/settings")
                ? "#3b82f6"
                : darkMode
                  ? "#f3f4f6"
                  : "#1f2937",
            }}
          >
            <MenuItem
              component={<Link to={route.SETTINGS} />}
              active={activePath === route.SETTINGS}
            >
              Database
            </MenuItem>
            <MenuItem
              component={<Link to={route.SETTINGS_ADDONS_PRICING} />}
              active={activePath === route.SETTINGS_ADDONS_PRICING}
            >
              Adons Pricing
            </MenuItem>
          </SubMenu>
        ) : null}
      </Menu>
    </Sidebar>
  );
}
