import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import SessionsManagerCard from '../../components/settings/SessionsManagerCard';
import NotificationSettingsCard from '../../components/settings/NotificationSettingsCard';
import DangerZoneCard from '../../components/settings/DangerZoneCard';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    queryClient.clear();
    navigate('/login');
  };

  return (
    <div className="mx-auto max-w-[900px] pb-12 space-y-6">
      {/* Breadcrumb & Header */}
      <div className="border-b border-border pb-4">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Compte › Paramètres
        </span>
        <h1 className="font-heading text-xl font-bold tracking-tight text-brand-ink dark:text-foreground mt-0.5">
          Paramètres
        </h1>
      </div>

      {/* Modular Cards matching Mockup */}
      <SessionsManagerCard />
      <NotificationSettingsCard />
      <DangerZoneCard />

      {/* Bottom Session Logout Action matching Mockup */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white dark:bg-card px-5 py-2 text-[11px] font-semibold text-brand-ink dark:text-foreground hover:border-red-300 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 transition-colors shadow-2xs cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" /> Se déconnecter de la session
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
