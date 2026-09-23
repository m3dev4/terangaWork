import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar, {
  FREELANCE_SIDEBAR_SECTIONS,
  ANNONCEUR_SIDEBAR_SECTIONS,
  ADMIN_SIDEBAR_SECTIONS,
  FOOTER_ITEMS,
} from '../../components/sidebar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import getCurrentUser from '../../utils/getUser';
import { LogOut, User as UserIcon } from 'lucide-react';
import { LogoJefly } from '../../assets/images';
import { NotificationDropdown } from '../../components/notification/NotificationDropdown';
import { useWebSocket, useWebSocketQuerySync } from '../../hooks/useWebSocket';

const EspaceLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);

  // Connect to the single shared WebSocket and sync events to React Query
  useWebSocket();
  useWebSocketQuerySync();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  });

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    queryClient.clear();
    navigate('/login');
  };

  const breadcrumb = React.useMemo(() => {
    const currentPath = location.pathname;
    const sections =
      user?.role === 'annonceur'
        ? ANNONCEUR_SIDEBAR_SECTIONS
        : user?.role === 'admin'
        ? ADMIN_SIDEBAR_SECTIONS
        : FREELANCE_SIDEBAR_SECTIONS;

    for (const section of sections) {
      for (const item of section.items) {
        if (
          (item.url === '/espace' && (currentPath === '/espace' || currentPath === '/espace/')) ||
          (item.url !== '/espace' && currentPath.startsWith(item.url))
        ) {
          return { section: section.title, label: item.label };
        }
      }
    }

    for (const item of FOOTER_ITEMS) {
      if (currentPath.startsWith(item.url)) {
        return { section: 'Support', label: item.label };
      }
    }

    return { section: 'Principal', label: 'Tableau de bord' };
  }, [location.pathname, user?.role]);

  return (
    <div className="flex h-screen max-h-screen w-full bg-[#FAF9F6] overflow-hidden">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      {/* Main Viewport */}
      <div className="flex-1 h-full flex flex-col overflow-hidden min-w-0">
        {/* Top Header matching Image 2 */}
        <header className="h-12 bg-white border-b border-[#EFECE6] px-4 lg:px-5 flex items-center justify-between shrink-0 select-none z-20">
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-2">
            {collapsed && (
              <img src={LogoJefly} alt="Jëfly" className="h-4.5 w-auto object-contain mr-1 sm:hidden" />
            )}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-neutral-400 font-normal">{breadcrumb.section}</span>
              <span className="text-neutral-300 font-normal">›</span>
              <span className="text-[#1b4b6b] font-semibold tracking-tight">
                {breadcrumb.label}
              </span>
            </div>
          </div>

          {/* Right: Notifications & User Profile */}
          <div className="flex items-center gap-2.5">
            {/* Notification Dropdown */}
            <NotificationDropdown />

            <div className="h-3.5 w-px bg-neutral-200" />

            {/* User Profile Card */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden shrink-0">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.first_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-3 h-3 text-neutral-500" />
                )}
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[11px] font-semibold text-neutral-900 leading-tight">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Mon Compte'}
                </span>
                <span className="text-[9.5px] text-neutral-400 capitalize leading-tight">
                  {user?.role === 'freelance'
                    ? 'Développeur freelance'
                    : user?.role === 'annonceur'
                    ? 'Annonceur'
                    : user?.role || 'Membre'}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-1 rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer ml-1"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.7} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EspaceLayout;
