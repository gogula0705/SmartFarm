import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Checking session...</p>
      </div>
    );
  }

  if (user) {
    // Already authenticated users are redirected straight to /dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicRoute;
