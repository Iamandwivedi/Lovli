import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import LoadingState from '@/components/LoadingState';

export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 lovli-noise">
        <LoadingState />
      </div>
    );
  }
  if (status !== 'authed') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
