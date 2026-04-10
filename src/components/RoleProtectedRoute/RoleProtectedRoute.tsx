import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";
import { canAccessRoute } from "../../utils/roleAccess";
import route from "../../constants/route";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that checks both authentication and role-based authorization
 * Employees can only access: Dashboard, Transaction, Customer
 * Admins can access all protected routes
 */
const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
}) => {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Check authentication status
    const authStatus = isAuthenticated();
    setIsAuth(authStatus);

    if (authStatus) {
      // Check role-based access
      const access = canAccessRoute(location.pathname);
      setHasAccess(access);
    } else {
      setHasAccess(false);
    }
  }, [location.pathname]);

  // Show loading while checking auth
  if (isAuth === null || hasAccess === null) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuth) {
    return <Navigate to={route.LOGIN} state={{ from: location }} replace />;
  }

  // Redirect to dashboard if no access to route
  if (!hasAccess) {
    return <Navigate to={route.DASHBOARD} replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default RoleProtectedRoute;
