import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Wraps routes that require authentication
 * Redirects to /auth if user is not logged in
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user } = useAuth();

  if (!user) {
    // User not authenticated, redirect to auth page
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

