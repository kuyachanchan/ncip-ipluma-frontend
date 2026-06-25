import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { JSX } from 'react';

interface RequireSetupProps {
  children: JSX.Element;
}

export const RequireSetup = ({ children }: RequireSetupProps) => {
  const { user } = useAuth();
  const location = useLocation();

  // If user hasn't finished setup, redirect to setup page
  if (!user?.finishedSetup) {
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  return children;
};