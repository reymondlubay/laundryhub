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
const CustomerReportPage = lazy(() => import("./pages/Reports/CustomerReport"));
const SettingsDatabasePage = lazy(() => import("./pages/Settings/Database"));
const SettingsAddonsPricingPage = lazy(
  () => import("./pages/Settings/AddonsPricing"),
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
