import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, authMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If not loading, and we don't have a user, and we aren't faking it via demo mode
    if (!loading && !user && authMode !== 'demo') {
      // Preserve intended destination for post-login redirect
      const currentPath = location.pathname + location.search;
      const redirectUrl = `/auth?redirect=${encodeURIComponent(currentPath)}`;
      navigate(redirectUrl);
    }
  }, [user, loading, navigate, location.pathname, location.search, authMode]);

  // If loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && authMode !== 'demo') {
    return null;
  }

  return <>{children}</>;
};
