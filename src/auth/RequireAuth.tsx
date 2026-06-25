import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { JSX } from "react";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated === false) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isAuthenticated === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return children;
}
