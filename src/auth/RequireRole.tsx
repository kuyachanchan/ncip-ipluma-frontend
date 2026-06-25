import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { Role } from "../types/auth";
import type { JSX } from "react";

export function RequireRole({ role, children }: {
  role: Role;
  children: JSX.Element;
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.includes(role)) return <Navigate to="/unauthorized" replace />;

  return children;
}
