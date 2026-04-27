import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import {
  FaChartBar,
  FaFileAlt,
  FaHistory,
  FaShoppingCart,
  FaWarehouse,
  FaUsers,
} from "react-icons/fa";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useThemeContext } from "../../ThemeContext/ThemeContext";
import { Link, useLocation } from "react-router-dom";
import route from "../../../constants/route";
import { isAdmin } from "../../../utils/roleAccess";
import "./sidebar.scss";
import { useSidebar } from "./SidebarContext";

export default function SidebarMenu() {
  const { darkMode } = useThemeContext();
  const theme = useTheme();
  const { primary, text, background } = theme.palette;
  const { collapsed } = useSidebar();
  const location = useLocation();
  const isAdminUser = isAdmin();

  const activePath = location.pathname;

  return (
    <Sidebar
      collapsed={collapsed}
      backgroundColor={alpha(background.paper, darkMode ? 0.98 : 0.97)}
      className={`sidebar-container ${darkMode ? "dark" : "light"}`}
      rootStyles={{
        transition: "background-color 0.2s ease, color 0.2s ease",
        borderRight: `1px solid ${theme.palette.divider}`,
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
              background: `linear-gradient(135deg, ${primary.dark}, ${primary.light})`,
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.palette.primary.contrastText,
              fontWeight: "bold",
              fontSize: "18px",
              flexShrink: 0,
              boxShadow: "none",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            LH
          </Box>

          {!collapsed && (
            <Typography
              sx={{
                fontWeight: "bold",
                color: primary.main,
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
              color: text.secondary,
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
              ? alpha(primary.main, darkMode ? 0.22 : 0.12)
              : "transparent",
            color: active ? primary.main : text.primary,
            borderRadius: 0,
            margin: "1px 6px",
            "&:hover": {
              backgroundColor: alpha(primary.main, darkMode ? 0.16 : 0.1),
              color: primary.main,
            },
          }),
          subMenuContent: {
            backgroundColor: alpha(
              background.default,
              darkMode ? 0.92 : 0.88,
            ),
            borderRadius: 0,
            margin: "1px 6px",
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
                ? primary.main
                : text.primary,
            }}
          >
            <MenuItem
              component={<Link to={route.REPORT_TRANSACTION} />}
              active={activePath === route.REPORT_TRANSACTION}
            >
              Transaction Report
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_TRANSACTION_SUMMARY} />}
              active={activePath === route.REPORT_TRANSACTION_SUMMARY}
            >
              Transaction Summary
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
              color: text.secondary,
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
            color: text.primary,
            "&:hover": {
              backgroundColor: alpha(primary.main, darkMode ? 0.16 : 0.1),
              color: primary.main,
            },
          },
          subMenuContent: {
            backgroundColor: alpha(
              background.default,
              darkMode ? 0.92 : 0.88,
            ),
            borderRadius: 0,
            margin: "1px 6px",
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
          <MenuItem
            component={<Link to={route.AUDIT_LOG} />}
            icon={<FaHistory />}
            active={activePath === route.AUDIT_LOG}
          >
            Audit Log
          </MenuItem>
        ) : null}
        {isAdminUser ? (
          <SubMenu
            label="Settings"
            icon={<FaWarehouse />}
            defaultOpen={activePath.startsWith("/settings")}
            rootStyles={{
              color: activePath.startsWith("/settings")
                ? primary.main
                : text.primary,
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
