import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/lib/auth';
import ProtectedRoute from '@/components/ProtectedRoute';

import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import AuthCallback from '@/pages/AuthCallback';
import Onboarding from '@/pages/Onboarding';
import AppReply from '@/pages/AppReply';
import Pro from '@/pages/Pro';
import Memory from '@/pages/Memory';
import Settings from '@/pages/Settings';
import EarlyAccess from '@/pages/EarlyAccess';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';

function RootRedirect() {
  const { status } = useAuth();
  if (status === 'checking') return null;
  return <Navigate to={status === 'authed' ? '/app' : '/login'} replace />;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth" element={<AuthCallback />} />
      <Route path="/early-access" element={<EarlyAccess />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppReply />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pro"
        element={
          <ProtectedRoute>
            <Pro />
          </ProtectedRoute>
        }
      />
      <Route
        path="/memory"
        element={
          <ProtectedRoute>
            <Memory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              className:
                'rounded-2xl border border-lovli-border bg-lovli-card-2 backdrop-blur-xl text-lovli-text',
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
