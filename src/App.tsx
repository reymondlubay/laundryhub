import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import MainLayout from "./components/MainLayout/MainLayout";
import RoleProtectedRoute from "./components/RoleProtectedRoute/RoleProtectedRoute";
import { isAuthenticated } from "./utils/auth";
import route from "./constants/route";

const TransactionPage = lazy(() => import("./pages/Transaction/Transaction"));
const UsersPage = lazy(() => import("./pages/Users/Users"));
const CustomerPage = lazy(() => import("./pages/Customer/Customer"));
const TransactionReportPage = lazy(
  () => import("./pages/Reports/TransactionReport"),
);
const TransactionSummaryPage = lazy(
  () => import("./pages/Reports/TransactionSummary"),
);
const TransactionGraphSummaryPage = lazy(
  () => import("./pages/Reports/TransactionGraphSummary"),
);
const CustomerReportPage = lazy(() => import("./pages/Reports/CustomerReport"));
const SettingsDatabasePage = lazy(() => import("./pages/Settings/Database"));
const SettingsAddonsPricingPage = lazy(
  () => import("./pages/Settings/AddonsPricing"),
);
const SettingsFixedMonthlyExpensesPage = lazy(
  () => import("./pages/Settings/FixedMonthlyExpenses"),
);
const SettingsActivityLogPage = lazy(
  () => import("./pages/Settings/ActivityLog"),
);
const InventoryItemsPage = lazy(
  () => import("./pages/Inventory/InventoryItems"),
);
const ManageInventoryPage = lazy(
  () => import("./pages/Inventory/ManageInventory"),
);
const InventorySummaryPage = lazy(
  () => import("./pages/Inventory/InventorySummary"),
);
const InventoryReportPage = lazy(
  () => import("./pages/Reports/InventoryReport"),
);
const ExpenseItemsPage = lazy(() => import("./pages/Expenses/ExpenseItems"));
const RecordExpensePage = lazy(() => import("./pages/Expenses/RecordExpense"));
const ExpensesReportPage = lazy(() => import("./pages/Reports/ExpensesReport"));
const SalesReportPage = lazy(() => import("./pages/Reports/SalesReport"));
const SalesExpenseGraphReportPage = lazy(
  () => import("./pages/Reports/SalesExpenseGraphReport"),
);
const CollectionReportPage = lazy(
  () => import("./pages/Reports/CollectionReport"),
);
const LoadReportPage = lazy(() => import("./pages/Reports/LoadReport"));
const ReceiveReleaseReportPage = lazy(
  () => import("./pages/Reports/ReceiveReleaseReport"),
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes - Redirect to dashboard if already authenticated */}
          <Route
            path={route.LOGIN}
            element={
              isAuthenticated() ? <Navigate to={route.DASHBOARD} /> : <Login />
            }
          />
          <Route
            path={route.ROOT}
            element={
              isAuthenticated() ? <Navigate to={route.DASHBOARD} /> : <Login />
            }
          />

          {/* Protected Routes - Wrapped with MainLayout */}
          <Route
            path={route.DASHBOARD}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.TRANSACTION}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <TransactionPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.CUSTOMER}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <CustomerPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.INVENTORY_ITEMS}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <InventoryItemsPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.INVENTORY_MANAGE}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <ManageInventoryPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.INVENTORY_SUMMARY}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <InventorySummaryPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.EXPENSES_ITEMS}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <ExpenseItemsPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.EXPENSES_RECORDS}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <RecordExpensePage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.USERS}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <UsersPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_TRANSACTION}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <TransactionReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_TRANSACTION_SUMMARY}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <TransactionSummaryPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_TRANSACTION_GRAPH_SUMMARY}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <TransactionGraphSummaryPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_CUSTOMER}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <CustomerReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_INVENTORY}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <InventoryReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_EXPENSES}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <ExpensesReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_SALES}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <SalesReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_SALES_EXPENSE_GRAPH}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <SalesExpenseGraphReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_COLLECTION}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <CollectionReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_LOAD}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <LoadReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.REPORT_RECEIVE_RELEASE}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <ReceiveReleaseReportPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.SETTINGS}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <SettingsDatabasePage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.SETTINGS_ADDONS_PRICING}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <SettingsAddonsPricingPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.SETTINGS_FIXED_MONTHLY_EXPENSES}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <SettingsFixedMonthlyExpensesPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />
          <Route
            path={route.SETTINGS_ACTIVITY_LOG}
            element={
              <RoleProtectedRoute>
                <MainLayout>
                  <Suspense fallback={null}>
                    <SettingsActivityLogPage />
                  </Suspense>
                </MainLayout>
              </RoleProtectedRoute>
            }
          />

          {/* Catch-all: Redirect to dashboard or login */}
          <Route
            path="*"
            element={
              isAuthenticated() ? (
                <Navigate to={route.DASHBOARD} />
              ) : (
                <Navigate to={route.LOGIN} />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
