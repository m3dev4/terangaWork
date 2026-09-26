import React from 'react';
import { useQuery } from '@tanstack/react-query';
import getCurrentUser from '../utils/getUser';
import { Loader2 } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedStage?: 'onboarding' | 'espace' | 'all';
}

export default function ProtectedRoute({
  children,
  allowedStage,
}: ProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: Boolean(token),
    retry: false,
  });

  // If there's no token at all, redirect to login immediately
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="animate-spin h-8 w-8 text-[#1b4b6b]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = user.role === 'admin' || (user as any).is_staff || (user as any).is_superuser;
  const isOnboardingPath = location.pathname.startsWith('/onboarding');
  const isEspacePath = location.pathname.startsWith('/espace');

  // Admin users never undergo onboarding
  if (isAdmin) {
    if (isOnboardingPath) {
      return <Navigate to="/espace/admin" replace />;
    }
    return <>{children}</>;
  }

  // If user completed onboarding and tries to visit /onboarding -> redirect to /espace
  if ((allowedStage === 'onboarding' || isOnboardingPath) && user.onboarding_completed) {
    return <Navigate to="/espace" replace />;
  }

  // If user has NOT completed onboarding and tries to visit /espace -> redirect to /onboarding
  if ((allowedStage === 'espace' || isEspacePath) && !user.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
