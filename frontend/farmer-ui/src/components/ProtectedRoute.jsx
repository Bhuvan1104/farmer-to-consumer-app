import { Navigate } from "react-router-dom";
import { getUserRole } from "../utils/auth";

function ProtectedRoute({ children, allowedRoles }) {
  const access = localStorage.getItem("access_token");
  const role = getUserRole();

  // Not logged in
  if (!access) {
    return <Navigate to="/login" replace />;
  }

  // Role missing
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Role not allowed
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;