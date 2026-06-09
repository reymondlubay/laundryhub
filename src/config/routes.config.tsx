import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import MainLayout from "../components/MainLayout/MainLayout";
import RoleProtectedRoute from "../components/RoleProtectedRoute/RoleProtectedRoute";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import route from "../constants/route";
import { isAuthenticated } from "../utils/auth";

const lazyPage = (loader: () => Promise<{ default: ComponentType }>) =>
  lazy(loader);

const TransactionPage = lazyPage(() => import("../pages/Transaction/Transaction"));
const UsersPage = lazyPage(() => import("../pages/Users/Users"));
const CustomerPage = lazyPage(() => import("../pages/Customer/Customer"));
const TransactionReportPage = lazyPage(
  () => import("../pages/Reports/TransactionReport"),
);
const TransactionSummaryPage = lazyPage(
  () => import("../pages/Reports/TransactionSummary"),
);
const TransactionGraphSummaryPage = lazyPage(
  () => import("../pages/Reports/TransactionGraphSummary"),
);
const CustomerReportPage = lazyPage(() => import("../pages/Reports/CustomerReport"));
const SettingsDatabasePage = lazyPage(() => import("../pages/Settings/Database"));
const SettingsAddonsPricingPage = lazyPage(
  () => import("../pages/Settings/AddonsPricing"),
);
const SettingsFixedMonthlyExpensesPage = lazyPage(
  () => import("../pages/Settings/FixedMonthlyExpenses"),
);
const SettingsActivityLogPage = lazyPage(
  () => import("../pages/Settings/ActivityLog"),
);
const SettingsDeletedTransactionsPage = lazyPage(
  () => import("../pages/Settings/DeletedTransactions"),
);
const ArchiveRecordPage = lazyPage(() => import("../pages/Archive/ArchiveRecord"));
const ArchiveListingPage = lazyPage(() => import("../pages/Archive/ArchiveListing"));
const InventoryItemsPage = lazyPage(
  () => import("../pages/Inventory/InventoryItems"),
);
const ManageInventoryPage = lazyPage(
  () => import("../pages/Inventory/ManageInventory"),
);
const InventorySummaryPage = lazyPage(
  () => import("../pages/Inventory/InventorySummary"),
);
const InventoryReportPage = lazyPage(
  () => import("../pages/Reports/InventoryReport"),
);
const ExpenseItemsPage = lazyPage(() => import("../pages/Expenses/ExpenseItems"));
const RecordExpensePage = lazyPage(() => import("../pages/Expenses/RecordExpense"));
const ExpensesReportPage = lazyPage(() => import("../pages/Reports/ExpensesReport"));
const SalesReportPage = lazyPage(() => import("../pages/Reports/SalesReport"));
const SalesExpenseGraphReportPage = lazyPage(
  () => import("../pages/Reports/SalesExpenseGraphReport"),
);
const CollectionReportPage = lazyPage(
  () => import("../pages/Reports/CollectionReport"),
);
const LoadReportPage = lazyPage(() => import("../pages/Reports/LoadReport"));
const ReceiveReleaseReportPage = lazyPage(
  () => import("../pages/Reports/ReceiveReleaseReport"),
);

type AppRouteEntry = {
  path: string;
  element: ComponentType;
  lazy?: boolean;
};

const APP_ROUTE_ENTRIES: AppRouteEntry[] = [
  { path: route.DASHBOARD, element: Dashboard },
  { path: route.TRANSACTION, element: TransactionPage, lazy: true },
  { path: route.CUSTOMER, element: CustomerPage, lazy: true },
  { path: route.INVENTORY_ITEMS, element: InventoryItemsPage, lazy: true },
  { path: route.INVENTORY_MANAGE, element: ManageInventoryPage, lazy: true },
  { path: route.INVENTORY_SUMMARY, element: InventorySummaryPage, lazy: true },
  { path: route.EXPENSES_ITEMS, element: ExpenseItemsPage, lazy: true },
  { path: route.EXPENSES_RECORDS, element: RecordExpensePage, lazy: true },
  { path: route.USERS, element: UsersPage, lazy: true },
  { path: route.REPORT_TRANSACTION, element: TransactionReportPage, lazy: true },
  {
    path: route.REPORT_TRANSACTION_SUMMARY,
    element: TransactionSummaryPage,
    lazy: true,
  },
  {
    path: route.REPORT_TRANSACTION_GRAPH_SUMMARY,
    element: TransactionGraphSummaryPage,
    lazy: true,
  },
  { path: route.REPORT_CUSTOMER, element: CustomerReportPage, lazy: true },
  { path: route.REPORT_INVENTORY, element: InventoryReportPage, lazy: true },
  { path: route.REPORT_EXPENSES, element: ExpensesReportPage, lazy: true },
  { path: route.REPORT_SALES, element: SalesReportPage, lazy: true },
  {
    path: route.REPORT_SALES_EXPENSE_GRAPH,
    element: SalesExpenseGraphReportPage,
    lazy: true,
  },
  { path: route.REPORT_COLLECTION, element: CollectionReportPage, lazy: true },
  { path: route.REPORT_LOAD, element: LoadReportPage, lazy: true },
  {
    path: route.REPORT_RECEIVE_RELEASE,
    element: ReceiveReleaseReportPage,
    lazy: true,
  },
  { path: route.SETTINGS, element: SettingsDatabasePage, lazy: true },
  {
    path: route.SETTINGS_ADDONS_PRICING,
    element: SettingsAddonsPricingPage,
    lazy: true,
  },
  {
    path: route.SETTINGS_FIXED_MONTHLY_EXPENSES,
    element: SettingsFixedMonthlyExpensesPage,
    lazy: true,
  },
  {
    path: route.SETTINGS_ACTIVITY_LOG,
    element: SettingsActivityLogPage,
    lazy: true,
  },
  {
    path: route.SETTINGS_DELETED_TRANSACTIONS,
    element: SettingsDeletedTransactionsPage,
    lazy: true,
  },
  { path: route.ARCHIVE_RECORD, element: ArchiveRecordPage, lazy: true },
  { path: route.ARCHIVE_LISTING, element: ArchiveListingPage, lazy: true },
];

const wrapProtectedPage = (Page: ComponentType, lazyLoad?: boolean): ReactNode => {
  const page = lazyLoad ? (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  ) : (
    <Page />
  );

  return (
    <RoleProtectedRoute>
      <MainLayout>{page}</MainLayout>
    </RoleProtectedRoute>
  );
};

export const appRoutes: RouteObject[] = [
  {
    path: route.LOGIN,
    element: isAuthenticated() ? <Navigate to={route.DASHBOARD} /> : <Login />,
  },
  {
    path: route.ROOT,
    element: isAuthenticated() ? <Navigate to={route.DASHBOARD} /> : <Login />,
  },
  ...APP_ROUTE_ENTRIES.map(({ path, element, lazy }) => ({
    path,
    element: wrapProtectedPage(element, lazy),
  })),
  {
    path: "*",
    element: isAuthenticated() ? (
      <Navigate to={route.DASHBOARD} />
    ) : (
      <Navigate to={route.LOGIN} />
    ),
  },
];

export { APP_ROUTE_ENTRIES };
