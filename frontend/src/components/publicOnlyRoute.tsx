import React from "react";
import { useQuery } from "@tanstack/react-query";
import getCurrentUser from "../utils/getUser";
import { Loader2 } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const token = localStorage.getItem("access_token");

  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    enabled: Boolean(token),
    retry: false,
  });

  // If token is present and we are checking user status, show a subtle loading state
  if (token && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="animate-spin h-8 w-8 text-[#1b4b6b]" />
      </div>
    );
  }

  // If user is authenticated
  if (user) {
    const isAdmin = user.role === 'admin' || (user as any).is_staff || (user as any).is_superuser;
    if (isAdmin) {
      return <Navigate to="/espace/admin" replace />;
    }
    if (user.onboarding_completed) {
      return <Navigate to="/espace" replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
