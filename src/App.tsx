import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Transaction from "./pages/Transaction/Transaction";
import MainLayout from "./components/MainLayout/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { isAuthenticated } from "./utils/auth";
import route from "./constants/route";

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
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path={route.TRANSACTION}
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Transaction />
                </MainLayout>
              </ProtectedRoute>
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
