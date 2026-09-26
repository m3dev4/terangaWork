import React from "react";
import { useQuery } from "@tanstack/react-query";
import getCurrentUser from "../../utils/getUser";
import { FreelanceBentoDashboard } from "../../components/dashboard/FreelanceBentoDashboard";
import { AnnonceurBentoDashboard } from "../../components/dashboard/AnnonceurBentoDashboard";
import { Loader2 } from "lucide-react";

import { AdminDashboardPage } from "./admin/AdminDashboardPage";

export const DashboardOverview: React.FC = () => {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs font-semibold">Chargement de votre tableau de bord...</p>
      </div>
    );
  }

  const isAdmin = user?.role === "admin" || (user as any)?.is_staff || (user as any)?.is_superuser;
  const isFreelance = user?.role === "freelance";

  if (isAdmin) {
    return <AdminDashboardPage />;
  }

  return (
    <div>
      {isFreelance ? (
        <FreelanceBentoDashboard user={user} />
      ) : (
        <AnnonceurBentoDashboard user={user} />
      )}
    </div>
  );
};

export default DashboardOverview;
