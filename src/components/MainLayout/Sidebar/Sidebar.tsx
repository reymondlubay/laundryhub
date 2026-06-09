import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import {
  FaArchive,
  FaChartBar,
  FaFileAlt,
  FaMoneyBillWave,
  FaShoppingCart,
  FaWarehouse,
  FaUsers,
} from "react-icons/fa";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import { useThemeContext } from "../../ThemeContext/ThemeContext";
import { Link, useLocation } from "react-router-dom";
import CompanyLogo from "../../CompanyLogo/CompanyLogo";
import { appConfig } from "../../../config/app.config";
import route from "../../../constants/route";
import { isAdmin } from "../../../utils/roleAccess";
import "./sidebar.scss";
import { useSidebar } from "./SidebarContext";

export default function SidebarMenu() {
  const { darkMode } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { primary, text, background } = theme.palette;
  const { collapsed, mobileOpen, closeMobileSidebar } = useSidebar();
  const location = useLocation();
  const isAdminUser = isAdmin();
  const prevPathRef = useRef(location.pathname);

  const activePath = location.pathname;

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      closeMobileSidebar();
    }
  }, [location.pathname, closeMobileSidebar]);

  return (
    <Sidebar
      collapsed={isMobile ? false : collapsed}
      breakPoint="md"
      customBreakPoint="899px"
      toggled={mobileOpen}
      onBackdropClick={closeMobileSidebar}
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
          <CompanyLogo size={36} />

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
              {appConfig.companyName}
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
            label="Inventory"
            icon={<FaWarehouse />}
            defaultOpen={activePath.startsWith("/inventory")}
            rootStyles={{
              color: activePath.startsWith("/inventory")
                ? primary.main
                : text.primary,
            }}
          >
            <MenuItem
              component={<Link to={route.INVENTORY_ITEMS} />}
              active={activePath === route.INVENTORY_ITEMS}
            >
              Inventory Items
            </MenuItem>
            <MenuItem
              component={<Link to={route.INVENTORY_MANAGE} />}
              active={activePath === route.INVENTORY_MANAGE}
            >
              Manage Inventory
            </MenuItem>
          </SubMenu>
        )}

        <SubMenu
          label="Expenses"
          icon={<FaMoneyBillWave />}
          defaultOpen={activePath.startsWith("/expenses")}
          rootStyles={{
            color: activePath.startsWith("/expenses")
              ? primary.main
              : text.primary,
          }}
        >
          {isAdminUser && (
            <MenuItem
              component={<Link to={route.EXPENSES_ITEMS} />}
              active={activePath === route.EXPENSES_ITEMS}
            >
              Expense Items
            </MenuItem>
          )}
          <MenuItem
            component={<Link to={route.EXPENSES_RECORDS} />}
            active={activePath === route.EXPENSES_RECORDS}
          >
            Record Expense
          </MenuItem>
        </SubMenu>

        {!isAdminUser && (
          <>
            <MenuItem
              component={<Link to={route.REPORT_TRANSACTION} />}
              icon={<FaFileAlt />}
              active={activePath === route.REPORT_TRANSACTION}
            >
              Transaction Report
            </MenuItem>
          </>
        )}

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
              component={<Link to={route.REPORT_TRANSACTION_GRAPH_SUMMARY} />}
              active={activePath === route.REPORT_TRANSACTION_GRAPH_SUMMARY}
            >
              Transaction Graph Summary
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_CUSTOMER} />}
              active={activePath === route.REPORT_CUSTOMER}
            >
              Customer Report
            </MenuItem>
            <MenuItem
              component={<Link to={route.INVENTORY_SUMMARY} />}
              active={activePath === route.INVENTORY_SUMMARY}
            >
              Inventory Summary
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_INVENTORY} />}
              active={activePath === route.REPORT_INVENTORY}
            >
              Inventory Report
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_EXPENSES} />}
              active={activePath === route.REPORT_EXPENSES}
            >
              Expenses Report
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_SALES} />}
              active={activePath === route.REPORT_SALES}
            >
              Sales Report
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_SALES_EXPENSE_GRAPH} />}
              active={activePath === route.REPORT_SALES_EXPENSE_GRAPH}
            >
              Sales & Expense Graph
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_COLLECTION} />}
              active={activePath === route.REPORT_COLLECTION}
            >
              Collection Report
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_LOAD} />}
              active={activePath === route.REPORT_LOAD}
            >
              Load Report
            </MenuItem>
            <MenuItem
              component={<Link to={route.REPORT_RECEIVE_RELEASE} />}
              active={activePath === route.REPORT_RECEIVE_RELEASE}
            >
              Receive / Release Report
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
          <SubMenu
            label="Archive"
            icon={<FaArchive />}
            defaultOpen={activePath.startsWith("/archive")}
            rootStyles={{
              color: activePath.startsWith("/archive")
                ? primary.main
                : text.primary,
            }}
          >
            <MenuItem
              component={<Link to={route.ARCHIVE_RECORD} />}
              active={activePath === route.ARCHIVE_RECORD}
            >
              Archive record
            </MenuItem>
            <MenuItem
              component={<Link to={route.ARCHIVE_LISTING} />}
              active={activePath === route.ARCHIVE_LISTING}
            >
              Archive listing
            </MenuItem>
          </SubMenu>
        ) : null}
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
          {isAdminUser && (
            <MenuItem
              component={<Link to={route.SETTINGS_ADDONS_PRICING} />}
              active={activePath === route.SETTINGS_ADDONS_PRICING}
            >
              Adons Pricing
            </MenuItem>
          )}
          {isAdminUser && (
            <MenuItem
              component={<Link to={route.SETTINGS_FIXED_MONTHLY_EXPENSES} />}
              active={activePath === route.SETTINGS_FIXED_MONTHLY_EXPENSES}
            >
              Fixed monthly expenses
            </MenuItem>
          )}
          {isAdminUser && (
            <MenuItem
              component={<Link to={route.SETTINGS_ACTIVITY_LOG} />}
              active={activePath === route.SETTINGS_ACTIVITY_LOG}
            >
              Activity log
            </MenuItem>
          )}
          {isAdminUser && (
            <MenuItem
              component={<Link to={route.SETTINGS_DELETED_TRANSACTIONS} />}
              active={activePath === route.SETTINGS_DELETED_TRANSACTIONS}
            >
              Deleted transactions
            </MenuItem>
          )}
        </SubMenu>
      </Menu>
    </Sidebar>
  );
}
